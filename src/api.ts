import { supabase } from './supabase';

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

export const api = {
  // PRODUCTS
  getProducts: async () => await getData('products'),
  createProduct: async (data: any) => { 
    const { data: r, error } = await supabase.from('products').insert(data).select().single(); 
    if (error) throw error; return r; 
  },
  updateProduct: async (id: string, data: any) => { 
    const { data: r, error } = await supabase.from('products').update(data).match({ id }).select().single(); 
    if (error) throw error; return r; 
  },
  deleteProduct: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('products').update({ isDeleted: true, deletedAt: Date.now(), deletedBy }).match({ id }); 
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
    const { error } = await supabase.from('categories').update({ isDeleted: true, deletedAt: Date.now(), deletedBy }).match({ id }); 
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
  getUsers: async () => await getData('users'),
  getUser: async (id: string) => { 
    const { data, error } = await supabase.from('users').select('*').match({ id }).single(); 
    return error ? null : data; 
  },
  createUser: async (data: any) => { 
    const { data: r, error } = await supabase.from('users').insert({ id: data.id || data.uid, ...data }).select().single(); 
    if (error) throw error; return r; 
  },
  updateUser: async (id: string, data: any) => { 
    const { data: r, error } = await supabase.from('users').update(data).match({ id }).select().single(); 
    if (error) throw error; return r; 
  },
  deleteUser: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('users').update({ isDeleted: true, deletedAt: Date.now(), deletedBy }).match({ id }); 
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
  getOrders: async () => await getData('orders'),
  createOrder: async (data: any) => { 
    const { data: r, error } = await supabase.from('orders').insert(data).select().single(); 
    if (error) throw error; return r; 
  },
  updateOrder: async (id: string, data: any) => { 
    const { data: r, error } = await supabase.from('orders').update(data).match({ id }).select().single(); 
    if (error) throw error; return r; 
  },
  deleteOrder: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('orders').update({ isDeleted: true, deletedAt: Date.now(), deletedBy }).match({ id }); 
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
    if (error) throw error; return r; 
  },
  deleteUpdate: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('updates').update({ isDeleted: true, deletedAt: Date.now(), deletedBy }).match({ id }); 
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

  // TRASH FETCH
  getDeletedItems: async (collectionName: string) => getDeletedData(collectionName),

  // SETTINGS
  getSettings: async () => { 
    const { data, error } = await supabase.from('settings').select('*').match({ id: 'global' }).single(); 
    return error ? null : { id: data.id, ...data.data }; 
  },
  updateSettings: async (data: any) => { 
    const { data: r, error } = await supabase.from('settings').upsert({ id: 'global', data }).select().single(); 
    if (error) throw error; return r.data; 
  },
};
