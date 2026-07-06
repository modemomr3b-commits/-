import { supabase } from './supabase';
import { ActivityLog } from './types';

const getData = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*').neq('isDeleted', true);
  if (error) { console.error(error); return []; }
  return data;
};

const getDeletedData = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*').eq('isDeleted', true);
  if (error) { console.error(error); return []; }
  return data;
};


// Simple memory cache for fast browsing
const memCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds

export const api = {
  clearCache: () => { Object.keys(memCache).forEach(k => delete memCache[k]); },
  uploadImage: async (base64Str: string): Promise<string> => {
    try {
      if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
      
      const res = await fetch(base64Str);
      const blob = await res.blob();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabase.storage.from('products').upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
      
      if (error) {
        if (error.message.includes('Bucket not found') || error.message.includes('Object not found')) {
          await supabase.storage.createBucket('products', { public: true });
          const retry = await supabase.storage.from('products').upload(fileName, blob, { contentType: 'image/jpeg' });
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }
      
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (e: any) {
      console.error('Image upload failed:', e);
      throw new Error(`خطأ في رفع الصورة: ${e.message || JSON.stringify(e)} (تأكد من وجود bucket باسم products وأنه public)`);
    }
  },
  // PRODUCTS
  getProductsByCategory: async (categoryId: string) => {
    const cacheKey = `products_cat_${categoryId}`;
    if (memCache[cacheKey] && Date.now() - memCache[cacheKey].timestamp < CACHE_TTL) {
      return memCache[cacheKey].data;
    }
    const { data, error } = await supabase.from('products')
      .select('*')
      .eq('categoryId', categoryId)
      .neq('isDeleted', true);
    if (error) { console.error(error); return []; }
    const res = data.map((p: any) => ({
      ...p,
      isHidden: p.size?.isHidden || false,
      oldPriceInfo: p.size?.oldPriceInfo || undefined,
      forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    memCache[cacheKey] = { data: res, timestamp: Date.now() };
    return res;
  },
  getProductById: async (id: string) => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data,
      isHidden: data.size?.isHidden || false,
      oldPriceInfo: data.size?.oldPriceInfo || undefined,
      forceStandardCrush: data.size?.forceStandardCrush ?? true
    };
  },
  getProducts: async () => {
    const data = await getData('products');
    return data.map((p: any) => ({
      ...p,
      isHidden: p.size?.isHidden || false,
      oldPriceInfo: p.size?.oldPriceInfo || undefined,
      forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },
  createProduct: async (data: any) => { 
    const safeData = { ...data, createdAt: data.createdAt || Date.now(), updatedAt: data.updatedAt || Date.now() };
    
    // Upload images if they are base64
    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = { ...(safeData.size || {}) };
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.oldPriceInfo;
    delete safeData.forceStandardCrush;

    const { data: r, error } = await supabase.from('products').insert(safeData).select().single(); 
    if (error) throw error; 
    
    
    
    
    const templates = [
      {
        title: '🚨 وصل الجديد!',
        body: 'موديلات جديدة نزلت الآن في شركة الوفاء المتميز BRQ. لا تتأخر وشوفها قبل الجميع.'
      },
      {
        title: '✨ تحديث جديد!',
        body: 'أضفنا موديلات مميزة بأسعار محدثة. تصفح الجديد الآن مع شركة الوفاء المتميز BRQ.'
      },
      {
        title: '📦 الجديد صار متوفر!',
        body: 'أحدث الموديلات بانتظارك. ادخل المتجر وشوف كل جديد من شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🔥 رجعنا بالجديد!',
        body: 'أحدث الموديلات وصلت، والأسعار جاهزة. زور متجر شركة الوفاء المتميز BRQ واختر اللي يعجبك.'
      },
      {
        title: '🎉 لا يفوتك!',
        body: 'نزلت موديلات جديدة مختارة بعناية. تسوق الآن من شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🤩 الأناقة بين إيديك!',
        body: 'تشكيلة جديدة بانتظارك في شركة الوفاء المتميز BRQ. اكتشف أحدث صيحات الموضة.'
      },
      {
        title: '💎 التميز عنواننا!',
        body: 'موديل جديد ينضم لعائلتنا، تفرد بإطلالتك مع شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🌟 أضف لمسة سحرية!',
        body: 'جديدنا اليوم غير! لا تفوت فرصة مشاهدة أحدث الإضافات من شركة الوفاء المتميز BRQ.'
      },
      {
        title: '🚀 انطلق بأناقة!',
        body: 'أحدث الموديلات نزلت وتنتظرك تكتشفها. شركة الوفاء المتميز BRQ توفر لك الأفضل دائماً.'
      },
      {
        title: '🛍️ وقت التسوق!',
        body: 'منتجات جديدة ومميزة بانتظارك. تسوق الآن من شركة الوفاء المتميز BRQ.'
      }
    ];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    
      try {
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: randomTemplate.title,
            body: randomTemplate.body + '\nالموديل: ' + r.name
          })
        });
      } catch (e) {}

    return { ...r, isHidden: r.size?.isHidden || false, oldPriceInfo: r.size?.oldPriceInfo || undefined, forceStandardCrush: r.size?.forceStandardCrush ?? true }; 
  },
  updateProduct: async (id: string, data: any) => {
    // Check if it's being made visible
    const wasHidden = data.isHidden === false; // If they passed isHidden: false
    let oldProduct = null;
    if (wasHidden) {
      const { data: op } = await supabase.from('products').select('size').match({ id }).single();
      if (op?.size?.isHidden) oldProduct = op;
    }
 
    const safeData = { ...data, updatedAt: Date.now() };
    
    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = { ...(safeData.size || {}) };
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.oldPriceInfo;
    delete safeData.forceStandardCrush;

    const { data: r, error } = await supabase.from('products').update(safeData).match({ id }).select().single(); 
    if (error) throw error;
    
    if (oldProduct && !safeData.size?.isHidden) {
      try {
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '🚨 الموديل متاح الآن!',
            body: 'الموديل ' + r.name + ' أصبح متوفراً الآن في متجر شركة الوفاء المتميز BRQ. تسوق الآن!'
          })
        });
      } catch (e) {}
    }
 
    return { ...r, isHidden: r.size?.isHidden || false, oldPriceInfo: r.size?.oldPriceInfo || undefined, forceStandardCrush: r.size?.forceStandardCrush ?? true }; 
  },
  deleteProduct: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('products').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  hardDeleteProduct: async (id: string) => { 
    const { error } = await supabase.from('products').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  restoreProduct: async (id: string) => { 
    const { error } = await supabase.from('products').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; return { success: true }; 
  },

  // CATEGORIES
  getCategories: async () => await getData('categories'),
  createCategory: async (data: any) => { 
    const { data: r, error } = await supabase.from('categories').insert(data).select().single(); 
    if (error) throw error; return r; 
  },
  updateCategory: async (id: string, data: any) => { 
    const { data: r, error } = await supabase.from('categories').update(data).match({ id }).select().single(); 
    if (error) throw error; return r; 
  },
  deleteCategory: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('categories').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  hardDeleteCategory: async (id: string) => { 
    const { error } = await supabase.from('categories').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  restoreCategory: async (id: string) => { 
    const { error } = await supabase.from('categories').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; return { success: true }; 
  },

  // USERS
  getUsers: async () => {
    try {
      const res = await fetch('/api/secure/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  getUser: async (id: string) => { 
    try {
      const res = await fetch(`/api/secure/users/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  },
  createUser: async (data: any) => { 
    const { data: r, error } = await supabase.from('users').insert({ id: data.id || data.uid, ...data }).select().single(); 
    if (error) throw error; return r; 
  },
  updateUser: async (id: string, data: any, silent?: boolean) => { 
    const { data: r, error } = await supabase.from('users').update(data).match({ id }).select().single(); 
    if (error && !silent) throw error; return r; 
  },
  deleteUser: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('users').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  hardDeleteUser: async (id: string) => { 
    const { error } = await supabase.from('users').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  restoreUser: async (id: string) => { 
    const { error } = await supabase.from('users').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; return { success: true }; 
  },

  // ORDERS
  getOrders: async () => {
    const data = await getData('orders');
    return data.map((o: any) => ({
      ...o,
      items: o.products || o.items || [],
      totalQuantity: o.total || o.totalQuantity || 0,
      fullName: o.customerName || o.fullName || o.username || '',
      username: o.username || o.customerName || '',
    }));
  },
  createOrder: async (data: any) => { 
    const safeData = { ...data };
    if (safeData.items) { safeData.products = safeData.items; delete safeData.items; }
    if (safeData.totalQuantity !== undefined) { safeData.total = safeData.totalQuantity; delete safeData.totalQuantity; }
    if (safeData.fullName !== undefined) { safeData.customerName = safeData.fullName; delete safeData.fullName; }
    delete safeData.userId;
    delete safeData.username;
    const { data: r, error } = await supabase.from('orders').insert(safeData).select().single(); 
    if (error) throw error; return r; 
  },
  updateOrder: async (id: string, data: any) => { 
    const safeData = { ...data };
    if (safeData.items) { safeData.products = safeData.items; delete safeData.items; }
    if (safeData.totalQuantity !== undefined) { safeData.total = safeData.totalQuantity; delete safeData.totalQuantity; }
    if (safeData.fullName !== undefined) { safeData.customerName = safeData.fullName; delete safeData.fullName; }
    delete safeData.userId;
    delete safeData.username;
    const { data: r, error } = await supabase.from('orders').update(safeData).match({ id }).select().single(); 
    if (error) throw error; return r; 
  },
  deleteOrder: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('orders').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  hardDeleteOrder: async (id: string) => { 
    const { error } = await supabase.from('orders').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  restoreOrder: async (id: string) => { 
    const { error } = await supabase.from('orders').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; return { success: true }; 
  },

  // UPDATES
  getUpdates: async () => await getData('updates'),
  createUpdate: async (data: any) => { 
    const { data: r, error } = await supabase.from('updates').insert(data).select().single(); 
    if (error) throw error; 
    
    try {
      fetch('/api/notify-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🔔 شركة الوفاء BRQ: ' + r.title,
          body: r.message + ' ✨'
        })
      });
    } catch (e) {}

    return r; 
  },
  deleteUpdate: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('updates').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  hardDeleteUpdate: async (id: string) => { 
    const { error } = await supabase.from('updates').delete().match({ id }); 
    if (error) throw error; return { success: true }; 
  },
  restoreUpdate: async (id: string) => { 
    const { error } = await supabase.from('updates').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; return { success: true }; 
  },

  // ACTIVITY LOGS
  getLogs: async () => {
    const { data, error } = await supabase.from('activity_logs').select('*').order('createdAt', { ascending: false }).limit(200);
    if (error) { console.error(error); return []; }
    return data;
  },
  logAction: async (log: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    try {
      await supabase.from('activity_logs').insert({ ...log, createdAt: Date.now() });
    } catch (e) {
      console.error('Failed to log action', e);
    }
  },

  // NOTIFICATIONS
  getNotifications: async () => await getData('notifications'),
  getUnreadNotifications: async () => {
    const { data, error } = await supabase.from('notifications').select('*').eq('read', false).neq('isDeleted', true).order('createdAt', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  },
  createNotification: async (data: any) => {
    await supabase.from('notifications').insert({ ...data, createdAt: Date.now() });
  },
  markNotificationRead: async (id: string) => {
    await supabase.from('notifications').update({ read: true }).match({ id });
  },
  deleteNotification: async (id: string, deletedBy?: string) => {
    const { error } = await supabase.from('notifications').delete().match({ id });
    if (error) throw error; return { success: true };
  },
  hardDeleteNotification: async (id: string) => {
    const { error } = await supabase.from('notifications').delete().match({ id });
    if (error) throw error; return { success: true };
  },
  restoreNotification: async (id: string) => {
    const { error } = await supabase.from('notifications').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id });
    if (error) throw error; return { success: true };
  },

  // TRASH FETCH
  getDeletedItems: async (collectionName: string) => getDeletedData(collectionName),

  // SETTINGS
  getSettings: async () => { 
    const { data, error } = await supabase.from('settings').select('*').match({ id: 'global' }).single(); 
    return error ? null : { id: data.id, ...data.data }; 
  },
  updateSettings: async (data: any) => { 
    const { id, ...dataJson } = data;
    const { data: r, error } = await supabase.from('settings').upsert({ id: 'global', data: dataJson }).select().single(); 
    if (error) throw error; return r.data; 
  },
};
