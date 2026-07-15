import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useEffect, useState, Suspense, lazy } from 'react';
import { useStore } from './store';
import { api } from './api';

import SplashScreen from './components/SplashScreen';
import GlobalNotifications from './components/GlobalNotifications';
import GlobalToast from './components/GlobalToast';

const Login = lazy(() => import('./components/Login'));
const MemberLayout = lazy(() => import('./components/MemberLayout'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const Home = lazy(() => import('./components/member/Home'));
const Products = lazy(() => import('./components/member/Products'));
const ProductDetail = lazy(() => import('./components/member/ProductDetail'));
const Favorites = lazy(() => import('./components/member/Favorites'));
const Cart = lazy(() => import('./components/member/Cart'));
const SearchPage = lazy(() => import('./components/member/SearchPage'));
const Profile = lazy(() => import('./components/member/Profile'));
const Messages = lazy(() => import('./components/member/Messages'));

const AdminDashboard = lazy(() => import('./components/admin/Dashboard'));
const ProductManager = lazy(() => import('./components/admin/ProductManager'));
const CategoryManager = lazy(() => import('./components/admin/CategoryManager'));
const OrderManager = lazy(() => import('./components/admin/OrderManager'));
const UserManager = lazy(() => import('./components/admin/UserManager'));
const SettingsManager = lazy(() => import('./components/admin/SettingsManager'));
const NotificationManager = lazy(() => import('./components/admin/NotificationManager'));
const ReportManager = lazy(() => import('./components/admin/ReportManager'));
const TrashManager = lazy(() => import('./components/admin/TrashManager'));

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
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            <Route 
              path="/" 
              element={user ? <MemberLayout /> : <Navigate to="/login" />}
            >
              <Route index element={<Home />} />
              <Route path="category/:categoryId" element={<Products />} />
              <Route path="product/:productId" element={<ProductDetail />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="cart" element={<Cart />} />
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
