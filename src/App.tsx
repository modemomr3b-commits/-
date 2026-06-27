import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useEffect } from 'react';
import { useStore } from './store';
import { api } from './api';

import Login from './components/Login';
import MemberLayout from './components/MemberLayout';
import AdminLayout from './components/AdminLayout';

import Home from './components/member/Home';
import Products from './components/member/Products';
import ProductDetail from './components/member/ProductDetail';
import Favorites from './components/member/Favorites';
import Cart from './components/member/Cart';
import SearchPage from './components/member/SearchPage';
import Profile from './components/member/Profile';

import AdminDashboard from './components/admin/Dashboard';
import ProductManager from './components/admin/ProductManager';
import CategoryManager from './components/admin/CategoryManager';
import OrderManager from './components/admin/OrderManager';
import UserManager from './components/admin/UserManager';
import SettingsManager from './components/admin/SettingsManager';
import NotificationManager from './components/admin/NotificationManager';
import ReportManager from './components/admin/ReportManager';
import TrashManager from './components/admin/TrashManager';

import GlobalNotifications from './components/GlobalNotifications';

export default function App() {
  const { initialize, user, loading } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user && user.uid) {
      const pingStatus = async () => {
        try {
          // Use api to silently update status
          await api.updateUser(user.uid, { lastActive: Date.now(), isOnline: true }, true);
        } catch (e) {}
      };
      pingStatus();
      const interval = setInterval(pingStatus, 60000); // 1 minute
      
      const handleBeforeUnload = () => {
        // Attempt to mark offline before close
        api.updateUser(user.uid, { isOnline: false, lastActive: Date.now() }, true).catch(() => {});
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // If unmounted normally (like explicit logout) it will call API inside logout fn
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brq-black">
        <div className="w-16 h-16 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <GlobalNotifications />
      <div dir="rtl" className="min-h-screen bg-brq-black text-brq-white antialiased">
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
      </div>
    </BrowserRouter>
  );
}
