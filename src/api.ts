import { getServerTime } from './utils/time';
import { supabase } from './supabase';
import { ActivityLog } from './types';
import { parseOrderDetails } from './utils/orderUtils';
import { localCache } from './utils/localCache';

const getData = async (table: string) => {
  let allData: any[] = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + limit - 1);
      
    if (error) {
      console.error('Error in getData for table', table, error);
      return allData;
    }
    
    if (data && data.length > 0) {
      const activeData = data.filter((item: any) => item.isDeleted !== true);
      allData = [...allData, ...activeData];
      if (data.length < limit) {
        break;
      }
      from += limit;
    } else {
      break;
    }
  }
  return allData;
};

const getDeletedData = async (table: string) => {
  let allData: any[] = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('isDeleted', true)
      .range(from, from + limit - 1);
      
    if (error) {
      console.error(error);
      return allData;
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < limit) {
        break;
      }
      from += limit;
    } else {
      break;
    }
  }
  return allData;
};


// Fast in-memory and persistent IndexedDB cache
const memCache: Record<string, { data: any, timestamp: number }> = {};
const MEM_CACHE_TTL = 60000; // 1 minute in-memory

export const api = {
  clearCache: () => { 
    Object.keys(memCache).forEach(k => delete memCache[k]); 
    localCache.clearAll().catch(() => {});
  },
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
    if (memCache[cacheKey] && Date.now() - memCache[cacheKey].timestamp < MEM_CACHE_TTL) {
      return memCache[cacheKey].data;
    }
    
    // Check persistent local cache for instant retrieval
    const cachedCatProds = await localCache.get<any[]>(cacheKey, 1000 * 60 * 10);
    if (cachedCatProds && cachedCatProds.length > 0) {
      memCache[cacheKey] = { data: cachedCatProds, timestamp: Date.now() };
      // Background revalidation
      setTimeout(async () => {
        try {
          const fresh = await api.getProductsByCategoryDirect(categoryId);
          if (fresh) {
            memCache[cacheKey] = { data: fresh, timestamp: Date.now() };
            localCache.set(cacheKey, fresh);
          }
        } catch {}
      }, 50);
      return cachedCatProds;
    }

    return api.getProductsByCategoryDirect(categoryId);
  },

  getProductsByCategoryDirect: async (categoryId: string) => {
    const cacheKey = `products_cat_${categoryId}`;
    const categories = await api.getCategories();
    const currentCat = categories.find((c: any) => c.id === categoryId);

    const isMainCat = !currentCat?.parentId;
    const allProducts = await api.getProducts();

    let res: any[] = [];
    if (isMainCat) {
      // Find direct child subcategories for this main category
      const subCats = categories.filter((c: any) => c.parentId === categoryId);
      const childSubCatIds = new Set<string>(subCats.map((c: any) => c.id));

      res = allProducts.filter((p: any) => {
        // Product belongs directly to this category or to one of its subcategories
        if (p.categoryId === categoryId) return true;
        if (p.subcategoryId && childSubCatIds.has(p.subcategoryId)) return true;
        return false;
      });
    } else {
      // Subcategory: strictly match products assigned to this subcategory
      res = allProducts.filter((p: any) => {
        if (p.subcategoryId === categoryId) return true;
        if (p.categoryId === categoryId && !p.subcategoryId) return true;
        return false;
      });
    }

    memCache[cacheKey] = { data: res, timestamp: Date.now() };
    localCache.set(cacheKey, res).catch(() => {});
    return res;
  },

  getProductById: async (id: string) => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      ...data,
      isHidden: data.size?.isHidden !== undefined ? Boolean(data.size.isHidden) : Boolean(data.isHidden),
      isLocked: data.size?.isLocked !== undefined ? Boolean(data.size.isLocked) : Boolean(data.isLocked),
      isArchived: data.size?.isArchived !== undefined ? Boolean(data.size.isArchived) : Boolean(data.isArchived),
      isDeleted: Boolean(data.isDeleted),
      isShowcase: data.size?.isShowcase !== undefined ? Boolean(data.size.isShowcase) : Boolean(data.isShowcase),
      showcaseCategory: data.size?.showcaseCategory || data.showcaseCategory || '',
      oldPriceInfo: data.size?.oldPriceInfo || undefined,
      forceStandardCrush: data.size?.forceStandardCrush ?? true
    };
  },

  getProducts: async () => {
    const cacheKey = 'all_products';
    if (memCache[cacheKey] && Date.now() - memCache[cacheKey].timestamp < MEM_CACHE_TTL) {
      return memCache[cacheKey].data;
    }

    const mapProduct = (p: any) => ({
      ...p,
      isHidden: p.size?.isHidden !== undefined ? Boolean(p.size.isHidden) : Boolean(p.isHidden),
      isLocked: p.size?.isLocked !== undefined ? Boolean(p.size.isLocked) : Boolean(p.isLocked),
      isArchived: p.size?.isArchived !== undefined ? Boolean(p.size.isArchived) : Boolean(p.isArchived),
      isDeleted: Boolean(p.isDeleted),
      isShowcase: p.size?.isShowcase !== undefined ? Boolean(p.size.isShowcase) : Boolean(p.isShowcase),
      showcaseCategory: p.size?.showcaseCategory || p.showcaseCategory || '',
      oldPriceInfo: p.size?.oldPriceInfo || undefined,
      forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt
    });

    // Check fast local cache
    const localData = await localCache.get<any[]>(cacheKey, 1000 * 60 * 10);
    if (localData && localData.length > 0) {
      memCache[cacheKey] = { data: localData.map(mapProduct), timestamp: Date.now() };
      // Background revalidation
      setTimeout(async () => {
        try {
          const freshData = await getData('products');
          if (freshData && freshData.length > 0) {
            const res = freshData.map(mapProduct).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            memCache[cacheKey] = { data: res, timestamp: Date.now() };
            localCache.set(cacheKey, res).catch(() => {});
          }
        } catch {}
      }, 50);
      return localData.map(mapProduct);
    }

    const data = await getData('products');
    const res = data.map(mapProduct).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    memCache[cacheKey] = { data: res, timestamp: Date.now() };
    localCache.set(cacheKey, res).catch(() => {});
    return res;
  },
  createProduct: async (data: any) => { 
    const serverTime = await getServerTime();
    const safeData = { ...data, createdAt: data.createdAt || serverTime, updatedAt: data.updatedAt || serverTime };
    
    // Upload images if they are base64
    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = safeData.size || {};
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.isLocked !== undefined) safeData.size.isLocked = safeData.isLocked;
    if (safeData.isShowcase !== undefined) safeData.size.isShowcase = safeData.isShowcase;
    if (safeData.showcaseCategory !== undefined) safeData.size.showcaseCategory = safeData.showcaseCategory;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.isLocked;
    delete safeData.isShowcase;
    delete safeData.showcaseCategory;
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
        await supabase.channel('public:announcements').send({
          type: 'broadcast',
          event: 'new_product',
          payload: r
        });
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: randomTemplate.title,
            body: randomTemplate.body
          })
        });
      } catch (e) {}

    const finalProduct = {
      ...r,
      isHidden: r.size?.isHidden || false,
      isLocked: r.size?.isLocked || false,
      isArchived: r.size?.isArchived || false,
      isDeleted: false,
      isShowcase: r.size?.isShowcase || false,
      showcaseCategory: r.size?.showcaseCategory || '',
      oldPriceInfo: r.size?.oldPriceInfo || undefined,
      forceStandardCrush: r.size?.forceStandardCrush ?? true,
      updatedAt: r.size?.updatedAt || r.createdAt
    };

    // Update in-memory and persistent cache immediately
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = [finalProduct, ...memCache['all_products'].data];
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    // Invalidate category caches
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) delete memCache[k];
    });

    // Real-time broadcast
    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'PRODUCT_CREATED', product: finalProduct, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('products_changes').send({
        type: 'broadcast',
        event: 'product_created',
        payload: { product: finalProduct, timestamp: Date.now() }
      });
    } catch {}

    return finalProduct;
  },
  updateProduct: async (id: string, data: any) => {
    // Fetch the existing size first to avoid overwriting it
    const { data: op } = await supabase.from('products').select('size').match({ id }).single();
    const existingSize = op?.size || {};

    const wasHidden = data.isHidden === false && existingSize.isHidden === true;
    let oldProduct = wasHidden ? op : null;

    const serverTime = await getServerTime();
    const safeData = { ...data, updatedAt: serverTime };

    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = { ...existingSize, ...(safeData.size || {}) };
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.isLocked !== undefined) safeData.size.isLocked = safeData.isLocked;
    if (safeData.isArchived !== undefined) safeData.size.isArchived = safeData.isArchived;
    if (safeData.isShowcase !== undefined) safeData.size.isShowcase = safeData.isShowcase;
    if (safeData.showcaseCategory !== undefined) safeData.size.showcaseCategory = safeData.showcaseCategory;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.isLocked;
    delete safeData.isShowcase;
    delete safeData.showcaseCategory;
    delete safeData.oldPriceInfo;
    delete safeData.forceStandardCrush;

    const { data: r, error } = await supabase.from('products').update(safeData).match({ id }).select().single(); 
    if (error) throw error;
    
    // Update local cache immediately
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.map((p: any) =>
        p.id === id
          ? {
              ...p,
              ...r,
              isHidden: r.size?.isHidden !== undefined ? Boolean(r.size.isHidden) : Boolean(r.isHidden),
              isLocked: r.size?.isLocked !== undefined ? Boolean(r.size.isLocked) : Boolean(r.isLocked),
              isArchived: r.size?.isArchived !== undefined ? Boolean(r.size.isArchived) : Boolean(r.isArchived),
              isShowcase: r.size?.isShowcase !== undefined ? Boolean(r.size.isShowcase) : Boolean(r.isShowcase),
              showcaseCategory: r.size?.showcaseCategory || r.showcaseCategory || '',
              updatedAt: serverTime
            }
          : p
      );
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    // Invalidate category caches
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) delete memCache[k];
    });

    // Real-time broadcast
    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'PRODUCT_UPDATED', id, data, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('products_changes').send({
        type: 'broadcast',
        event: 'product_changed',
        payload: { id, data, timestamp: Date.now() }
      });
    } catch {}

    if (oldProduct && !safeData.size?.isHidden) {
      try {
        await supabase.channel('public:announcements').send({
          type: 'broadcast',
          event: 'new_product',
          payload: r
        });
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
            body: 'أجمل الموديلات بانتظارك في تطبيق شركة الوفاء المتميز BRQ. سارع بالشراء!'
          }
        ];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        fetch('/api/notify-publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: randomTemplate.title,
            body: randomTemplate.body
          })
        });
      } catch (e) {}
    }
 
    return { ...r, isHidden: r.size?.isHidden || false, isLocked: r.size?.isLocked || false, oldPriceInfo: r.size?.oldPriceInfo || undefined, forceStandardCrush: r.size?.forceStandardCrush ?? true }; 
  },
  bulkUpdateProducts: async (ids: string[], data: any) => {
    if (!ids || ids.length === 0) return { success: true };
    const serverTime = await getServerTime();
    
    // Separate direct table columns from metadata in 'size'
    const directKeys = [
      'categoryId',
      'subcategoryId',
      'isArchived',
      'isDeleted',
      'dozenPriceUsd',
      'price',
      'profitMargin',
      'originalDozenPriceUsd',
      'originalPrice',
      'piecePriceIqd',
      'notes',
      'name',
      'modelNumber',
      'productCode',
      'barcode',
      'imageUrl',
      'finalImageUrl',
      'views'
    ];
    
    const sizeKeys = [
      'isHidden',
      'isLocked',
      'isShowcase',
      'showcaseCategory',
      'oldPriceInfo',
      'forceStandardCrush'
    ];
    
    const directUpdates: any = { updatedAt: serverTime };
    const sizeUpdates: any = {};
    let hasSizeUpdates = false;
    let hasDirectUpdates = false;
    
    Object.keys(data).forEach(key => {
      if (directKeys.includes(key)) {
        directUpdates[key] = data[key];
        hasDirectUpdates = true;
      }
      if (sizeKeys.includes(key)) {
        sizeUpdates[key] = data[key];
        hasSizeUpdates = true;
      }
    });

    const chunkSize = 1000;
    
    if (hasDirectUpdates && !hasSizeUpdates) {
      // Direct SQL bulk update on Supabase table - blazing fast!
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
      }
      await Promise.all(chunks.map(chunk => 
        supabase.from('products').update(directUpdates).in('id', chunk)
      ));
    } else {
      // Direct updates and/or size JSON column updates
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
      }
      
      await Promise.all(chunks.map(async (chunk) => {
        const { data: existingRows } = await supabase
          .from('products')
          .select('id, size')
          .in('id', chunk);
          
        if (existingRows && existingRows.length > 0) {
          const updatePromises = existingRows.map(row => {
            const mergedSize = {
              ...(row.size || {}),
              ...sizeUpdates,
              updatedAt: serverTime
            };
            const itemUpdate = {
              ...directUpdates,
              size: mergedSize
            };
            return supabase.from('products').update(itemUpdate).eq('id', row.id);
          });
          for (let j = 0; j < updatePromises.length; j += 100) {
            await Promise.all(updatePromises.slice(j, j + 100));
          }
        }
      }));
    }

    // IMMEDIATELY update local in-memory cache and IndexedDB
    const idSet = new Set(ids);
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.map((p: any) => {
        if (idSet.has(p.id)) {
          return {
            ...p,
            ...data,
            size: {
              ...(p.size || {}),
              ...(hasSizeUpdates ? sizeUpdates : {})
            },
            updatedAt: serverTime
          };
        }
        return p;
      });
      memCache['all_products'].timestamp = Date.now();
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    // Invalidate all category caches so fresh queries reflect moved products immediately
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) {
        delete memCache[k];
      }
    });

    // Real-time broadcast across all open tabs and all remote clients
    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'PRODUCTS_BULK_UPDATED', ids, data, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('products_changes').send({
        type: 'broadcast',
        event: 'bulk_updated',
        payload: { ids, data, count: ids.length, timestamp: Date.now() }
      });
    } catch {}

    return { success: true };
  },
  bulkDeleteProducts: async (ids: string[], deletedBy?: string) => {
    if (!ids || ids.length === 0) return { success: true };
    const chunkSize = 1000;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }
    await Promise.all(chunks.map(chunk => 
      supabase.from('products').delete().in('id', chunk)
    ));
    
    // Invalidate caches
    const idSet = new Set(ids);
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.filter((p: any) => !idSet.has(p.id));
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) delete memCache[k];
    });

    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'PRODUCTS_DELETED', ids, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('products_changes').send({
        type: 'broadcast',
        event: 'bulk_deleted',
        payload: { ids, timestamp: Date.now() }
      });
    } catch {}

    return { success: true };
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
  getCategories: async () => {
    const cacheKey = 'all_categories';
    if (memCache[cacheKey] && Date.now() - memCache[cacheKey].timestamp < MEM_CACHE_TTL) {
      return memCache[cacheKey].data;
    }

    const localCats = await localCache.get<any[]>(cacheKey, 1000 * 60 * 15);
    if (localCats && localCats.length > 0) {
      memCache[cacheKey] = { data: localCats, timestamp: Date.now() };
      setTimeout(async () => {
        try {
          const fresh = await getData('categories');
          if (fresh && fresh.length > 0) {
            memCache[cacheKey] = { data: fresh, timestamp: Date.now() };
            localCache.set(cacheKey, fresh).catch(() => {});
          }
        } catch {}
      }, 50);
      return localCats;
    }

    const res = await getData('categories');
    memCache[cacheKey] = { data: res, timestamp: Date.now() };
    localCache.set(cacheKey, res).catch(() => {});
    return res;
  },
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
      const { data, error } = await supabase.from('users').select('*');
      if (error) { console.error('Error fetching users:', error); throw error; }
      const activeUsers = (data || []).filter((u: any) => u.isDeleted !== true);
      return activeUsers;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
  getUser: async (id: string) => { 
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error) return null;
      return data;
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
    return data.map((o: any) => {
      const parsed = parseOrderDetails(o);

      return {
        ...o,
        items: o.products || o.items || [],
        totalQuantity: o.total || o.totalQuantity || 0,
        userId: o.userId || parsed.agentId || '',
        agentId: parsed.agentId || o.userId || '',
        agentName: parsed.agentName || o.agentName || '',
        fullName: parsed.agentName || o.fullName || o.username || '',
        username: o.username || parsed.agentName || '',
        customerName: parsed.customerName || (o.customerName !== parsed.agentName ? o.customerName : '') || '',
        transport: parsed.transport || o.transport || '',
        notes: parsed.notes,
        displayNotes: parsed.displayNotes,
        rawNotes: o.notes || '',
      };
    });
  },
  createOrder: async (data: any) => { 
    const safeData: any = {};
    if (data.id) safeData.id = data.id;
    if (data.orderNumber !== undefined) safeData.orderNumber = data.orderNumber;
    if (data.status !== undefined) safeData.status = data.status;
    if (data.customerPhone !== undefined) safeData.customerPhone = data.customerPhone;
    if (data.address !== undefined) safeData.address = data.address;
    if (data.createdAt !== undefined) safeData.createdAt = data.createdAt;
    if (data.isDeleted !== undefined) safeData.isDeleted = data.isDeleted;
    if (data.deletedAt !== undefined) safeData.deletedAt = data.deletedAt;
    if (data.deletedBy !== undefined) safeData.deletedBy = data.deletedBy;

    // Identify agent and customer
    const agentName = (data.username || data.agentName || data.fullName || 'الوكيل').trim();
    const agentId = (data.userId || data.agentId || '').toString().trim();
    const explicitCustomer = data.customerName?.trim() || (data.visitorName ? `زائر المعرض: ${data.visitorName.trim()}` : '');

    // Set customerName in table (if explicit customer exists use it, otherwise use agent name)
    safeData.customerName = explicitCustomer || agentName || 'الوكيل';

    // Build structured notes with all details (agent, agentId, customer, transport, notes)
    const notesArray: string[] = [];
    if (agentName) {
      notesArray.push(`الوكيل: ${agentName}`);
    }
    if (agentId) {
      notesArray.push(`معرف الوكيل: ${agentId}`);
    }
    if (explicitCustomer && explicitCustomer !== agentName) {
      notesArray.push(`اسم الزبون: ${explicitCustomer}`);
    }
    if (data.transport && data.transport.trim()) {
      notesArray.push(`النقليات: ${data.transport.trim()}`);
    }
    if (data.notes && data.notes.trim()) {
      const raw = data.notes.trim();
      if (!raw.startsWith('الوكيل:') && !raw.startsWith('اسم الزبون:') && !raw.startsWith('معرف الوكيل:')) {
        notesArray.push(raw);
      }
    }
    safeData.notes = notesArray.join('\n').trim();


    if (data.products !== undefined) {
      safeData.products = data.products;
    } else if (data.items !== undefined) {
      safeData.products = data.items;
    } else {
      safeData.products = [];
    }

    if (data.total !== undefined) {
      safeData.total = Number(data.total) || 0;
    } else if (data.totalQuantity !== undefined) {
      safeData.total = Number(data.totalQuantity) || 0;
    } else {
      safeData.total = 0;
    }

    const { data: r, error } = await supabase.from('orders').insert(safeData).select().single(); 
    if (error) throw error; return r; 
  },
  updateOrder: async (id: string, data: any) => { 
    const safeData: any = {};
    if (data.orderNumber !== undefined) safeData.orderNumber = data.orderNumber;
    if (data.status !== undefined) safeData.status = data.status;
    if (data.customerPhone !== undefined) safeData.customerPhone = data.customerPhone;
    if (data.address !== undefined) safeData.address = data.address;
    if (data.isDeleted !== undefined) safeData.isDeleted = data.isDeleted;
    if (data.deletedAt !== undefined) safeData.deletedAt = data.deletedAt;
    if (data.deletedBy !== undefined) safeData.deletedBy = data.deletedBy;

    if (data.customerName !== undefined || data.fullName !== undefined || data.username !== undefined) {
      safeData.customerName = data.customerName || data.fullName || data.username;
    }

    if (data.notes !== undefined) {
      let combinedNotes = data.notes;
      if (data.transport && !combinedNotes.includes(data.transport)) {
        combinedNotes = `${combinedNotes}\nالنقليات: ${data.transport}`;
      }
      safeData.notes = combinedNotes;
    }

    if (data.products !== undefined) {
      safeData.products = data.products;
    } else if (data.items !== undefined) {
      safeData.products = data.items;
    }

    if (data.total !== undefined) {
      safeData.total = Number(data.total) || 0;
    } else if (data.totalQuantity !== undefined) {
      safeData.total = Number(data.totalQuantity) || 0;
    }

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
      await supabase.channel('public:announcements').send({
          type: 'broadcast',
          event: 'new_product',
          payload: r
        });
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
      const serverTime = await getServerTime();
      await supabase.from('activity_logs').insert({ ...log, createdAt: serverTime });
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
    const serverTime = await getServerTime();
    await supabase.from('notifications').insert({ ...data, createdAt: serverTime });
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
    try {
      const { data, error } = await supabase.from('settings').select('*').match({ id: 'global' }).maybeSingle(); 
      if (data && !error) {
        const parsed = data.data ? { id: data.id, ...data.data } : data;
        try {
          localStorage.setItem('alwafaa_settings_cache', JSON.stringify(parsed));
        } catch (e) {}
        return parsed;
      }
    } catch (e) {
      console.warn("Could not fetch settings from supabase:", e);
    }
    
    try {
      const cached = localStorage.getItem('alwafaa_settings_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    
    return { id: 'global', showcaseEnabled: true, companyName: 'شركة الوفاء المتميز' };
  },
  updateSettings: async (data: any) => { 
    const { id, ...dataJson } = data;
    const merged = { id: 'global', ...dataJson };
    
    // Save to local cache immediately
    try {
      localStorage.setItem('alwafaa_settings_cache', JSON.stringify(merged));
    } catch (e) {}

    // Try updating Supabase
    try {
      // 1. Try upserting with json data column
      const { error: err1 } = await supabase.from('settings').upsert({ id: 'global', data: dataJson });
      if (err1) {
        // 2. Try direct upserting fields
        await supabase.from('settings').upsert({ id: 'global', ...dataJson });
      }

      // Broadcast setting update
      try {
        await supabase.channel('public:announcements').send({
          type: 'broadcast',
          event: 'settings_updated',
          payload: merged,
        });
      } catch (broadcastErr) {}
    } catch (e) {
      console.warn("Error persisting settings to supabase:", e);
    }

    return merged;
  },
};
