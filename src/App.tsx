import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useStore } from './store';
import { api } from './api';

import SplashScreen from './components/SplashScreen';
import GlobalNotifications from './components/GlobalNotifications';
import GlobalToast from './components/GlobalToast';

import { safeLazy } from './utils/safeLazy';

const Login = safeLazy(() => import('./components/Login'));
const MemberLayout = safeLazy(() => import('./components/MemberLayout'));
const AdminLayout = safeLazy(() => import('./components/AdminLayout'));
const Home = safeLazy(() => import('./components/member/Home'));
const Products = safeLazy(() => import('./components/member/Products'));
const ProductDetail = safeLazy(() => import('./components/member/ProductDetail'));
const Favorites = safeLazy(() => import('./components/member/Favorites'));
const Cart = safeLazy(() => import('./components/member/Cart'));
const MemberOrders = safeLazy(() => import('./components/member/MemberOrders'));
const CustomerOrders = safeLazy(() => import('./components/member/CustomerOrders'));
const SearchPage = safeLazy(() => import('./components/member/SearchPage'));
const Profile = safeLazy(() => import('./components/member/Profile'));
const Messages = safeLazy(() => import('./components/member/Messages'));
const ShowcasePage = safeLazy(() => import('./components/showcase/ShowcasePage'));

import OrderManager from './components/admin/OrderManager';

const AdminDashboard = safeLazy(() => import('./components/admin/Dashboard'));
const ProductManager = safeLazy(() => import('./components/admin/ProductManager'));
const CategoryManager = safeLazy(() => import('./components/admin/CategoryManager'));
const UserManager = safeLazy(() => import('./components/admin/UserManager'));
const AccessLogManager = safeLazy(() => import('./components/admin/AccessLogManager'));
const SettingsManager = safeLazy(() => import('./components/admin/SettingsManager'));
const NotificationManager = safeLazy(() => import('./components/admin/NotificationManager'));
const ReportManager = safeLazy(() => import('./components/admin/ReportManager'));
const TrashManager = safeLazy(() => import('./components/admin/TrashManager'));

export default function App() {
  const { initialize, user, loading } = useStore();
  const [splashFinished, setSplashFinished] = useState(() => {
    return localStorage.getItem('splashShown') === 'true';
  });

  const handleSplashComplete = () => {
    localStorage.setItem('splashShown', 'true');
    setSplashFinished(true);
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Global 5-minute forced sync & cache wipe interval for all users to guarantee out-of-stock / archived products never slip through
  useEffect(() => {
    // Delay immediate forced refresh & pre-warming to avoid network lag on initial app load
    // It will silently fetch all products into memory in the background after 3 seconds
    const warmupTimer = setTimeout(() => {
      api.forceRefreshAll().catch(() => {});
    }, 3000);

    const syncInterval = setInterval(async () => {
      try {
        await api.forceRefreshAll();
      } catch (e) {}
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(warmupTimer);
      clearInterval(syncInterval);
    };
  }, []);

  // 15-minute inactivity logout tracker
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_LIMIT = 2 * 60 * 1000; // 2 minutes in ms
    let lastActivityTime = Date.now();

    const updateActivity = () => {
      lastActivityTime = Date.now();
      localStorage.setItem('brq_last_activity', lastActivityTime.toString());
    };

    // Check immediately if they were away for > 15 mins when reopening the app
    const storedActivity = localStorage.getItem('brq_last_activity');
    if (storedActivity) {
      const parsed = parseInt(storedActivity, 10);
      if (Date.now() - parsed > INACTIVITY_LIMIT) {
        useStore.getState().setUser(null);
        return;
      } else {
        lastActivityTime = Math.max(lastActivityTime, parsed);
      }
    } else {
      updateActivity();
    }

    // Use a throttled update to avoid performance issues
    let throttleTimer: any = null;
    const throttledUpdateActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateActivity();
        throttleTimer = null;
      }, 5000); // Update at most every 5 seconds
    };

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, throttledUpdateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const currentStoredActivity = parseInt(localStorage.getItem('brq_last_activity') || '0', 10);
      const activityTime = Math.max(lastActivityTime, currentStoredActivity);
      
      if (Date.now() - activityTime > INACTIVITY_LIMIT) {
        useStore.getState().setUser(null);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, throttledUpdateActivity));
      clearInterval(checkInterval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user]);

  useEffect(() => {
    if (user && user.uid) {
      const pingStatus = async () => {
        try {
          await api.updateUser(user.uid, { lastActive: Date.now(), isOnline: true }, true);
        } catch (e) {}
      };
      pingStatus();
      const interval = setInterval(pingStatus, 60000); // 1 minute
      
      const handleBeforeUnload = () => {
        api.updateUser(user.uid, { isOnline: false, lastActive: Date.now() }, true).catch(() => {});
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user]);

  if (!splashFinished) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brq-black">
        <div className="w-16 h-16 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="flex h-screen w-full items-center justify-center bg-brq-black">
      <div className="w-16 h-16 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <BrowserRouter>
      <GlobalToast />
      <GlobalNotifications />
      <div dir="rtl" className="min-h-screen bg-brq-black text-brq-white antialiased">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Showcase - No login required */}
            <Route path="/showcase" element={<ShowcasePage />} />

            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            <Route 
              path="/" 
              element={user ? <MemberLayout /> : <Navigate to="/login" />}
            >
              <Route index element={<Home />} />
              <Route path="showcase" element={<ShowcasePage />} />
              <Route path="category/:categoryId" element={<Products />} />
              <Route path="product/:productId" element={<ProductDetail />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="cart" element={<Cart />} />
              <Route path="orders" element={<MemberOrders />} />
              <Route path="customer-orders" element={<CustomerOrders />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="messages" element={<Messages />} />
            </Route>

            <Route 
              path="/admin" 
              element={user && (user.role === 'admin' || user.role === 'sales') ? <AdminLayout /> : <Navigate to="/login" />}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<ProductManager />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="orders" element={<OrderManager />} />
              <Route path="users" element={<UserManager />} />
              <Route path="access-log" element={<AccessLogManager />} />
              <Route path="visits" element={<AccessLogManager />} />
              <Route path="settings" element={<SettingsManager />} />
              <Route path="notifications" element={<NotificationManager />} />
              <Route path="reports" element={<ReportManager />} />
              <Route path="trash" element={<TrashManager />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
