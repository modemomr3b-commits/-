import { getServerTime } from './utils/time';
import { supabase } from './supabase';
import { ActivityLog } from './types';
import { parseOrderDetails } from './utils/orderUtils';
import { localCache } from './utils/localCache';
import { isArchivedCategoryName } from './utils/search';
import { compressImage } from './utils/compressImage';

// Helper to strictly deduplicate database records by id to guarantee zero duplicate keys across React renders
const deduplicateItems = <T extends { id?: any; [key: string]: any }>(items: T[]): T[] => {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  const unique: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const id = item.id !== undefined && item.id !== null ? String(item.id) : null;
    if (id) {
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(item);
      }
    } else {
      unique.push(item);
    }
  }
  return unique;
};

// Helper to deduplicate categories by ID as well as normalized name & parentId to guarantee no duplicate categories appear
export const deduplicateCategories = (cats: any[]): any[] => {
  if (!cats || !Array.isArray(cats)) return [];
  const seenIds = new Set<string>();
  const seenNameKeys = new Set<string>();
  const unique: any[] = [];
  
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    if (!cat || cat.isDeleted) continue;
    const id = cat.id !== undefined && cat.id !== null ? String(cat.id) : null;
    if (id && seenIds.has(id)) continue;
    
    // Group by parentId + normalized trimmed name
    const parentKey = cat.parentId ? String(cat.parentId) : 'root';
    const normName = (cat.name || '').trim().replace(/\s+/g, ' ');
    const compositeKey = `${parentKey}___${normName}`;
    
    if (normName && seenNameKeys.has(compositeKey)) {
      continue;
    }
    
    if (id) seenIds.add(id);
    if (normName) seenNameKeys.add(compositeKey);
    unique.push(cat);
  }
  return unique;
};

const sanitizeOrderProducts = (raw: any[]) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    const prod = item.product || item;
    return {
      productId: item.productId || prod.id || prod.productId,
      quantity: Number(item.quantity) || 1,
      product: {
        id: prod.id || prod.productId,
        name: prod.name || 'منتج',
        productCode: prod.productCode || prod.code || '',
        modelNumber: prod.modelNumber || '',
        imageUrl: prod.imageUrl || '',
        finalImageUrl: prod.finalImageUrl || prod.imageUrl || '',
        sellingPrice: Number(prod.sellingPrice || prod.price) || 0,
        costPrice: Number(prod.costPrice) || 0,
      }
    };
  });
};

// Global tracking to prevent duplicate in-flight requests and database connection throttling
const inFlightTableFetches: Record<string, Promise<any[]> | null> = {};
const lastTableFetchTimestamps: Record<string, number> = {};
const MIN_BACKGROUND_FETCH_INTERVAL = 30000; // 30s cooldown between full background network fetches

const getData = async (table: string, forceNetwork = false) => {
  // Try local cache first for instant response (0ms load time), sanitized for unique IDs
  const rawCached = await localCache.get<any[]>(`all_${table}`, Infinity);
  const cached = rawCached ? deduplicateItems(rawCached) : null;
  if (rawCached && cached && rawCached.length !== cached.length) {
    // Purge stale duplicate entries from storage if found
    localCache.set(`all_${table}`, cached).catch(() => {});
  }

  // Background network fetch function with deduplication and sequential paging
  const fetchFromNetwork = async (): Promise<any[]> => {
    // If an in-flight network request for this table is already running, reuse that exact promise
    if (inFlightTableFetches[table]) {
      return inFlightTableFetches[table]!;
    }

    // Unless forced, respect cooldown if we already have valid cached data
    const now = Date.now();
    const lastFetch = lastTableFetchTimestamps[table] || 0;
    if (!forceNetwork && cached && cached.length > 0 && (now - lastFetch < MIN_BACKGROUND_FETCH_INTERVAL)) {
      return cached;
    }

    const fetchPromise = (async () => {
      try {
        const limit = 1000;
        let allData: any[] = [];
        const seenIds = new Set<string>();
        let from = 0;
        let hasMore = true;

        let selectColumns = 'id, name, description, category, size, costPrice, sellingPrice, imageUrl, stock, minStock, qrCode, isArchived, isDeleted, deletedAt, deletedBy, createdAt, categoryId, subcategoryId, price, dozenPriceUsd, piecePriceUsd, piecePriceIqd, packaging, piecesCount, modelNumber, productCode, barcode, finalImageUrl, views';
        if (table === 'orders') {
          selectColumns = 'id, orderNumber, customerName, customerPhone, address, status, notes, total, products, isDeleted, deletedAt, deletedBy, createdAt';
        } else if (table === 'categories') {
          selectColumns = 'id, name, description, icon, isDeleted, deletedAt, deletedBy, createdAt, order, parentId, isHidden';
        } else if (table === 'users') {
          selectColumns = '*';
        } else if (table === 'activity_logs') {
          selectColumns = 'id, userId, userName, action, entityType, entityId, details, createdAt';
        } else if (table === 'notifications') {
          selectColumns = 'id, userId, message, type, read, createdAt, isDeleted, deletedAt, deletedBy';
        } else if (table === 'settings') {
          selectColumns = 'id, data';
        }

        // Fetch sequentially in moderate batches to eliminate statement timeouts (Error 57014)
        // Order by id guarantees deterministic pagination without row shifting or repetition
        while (hasMore) {
          let { data, error } = await supabase
            .from(table)
            .select(selectColumns)
            .order('id', { ascending: true })
            .range(from, from + limit - 1);

          if (error) {
            console.warn(`Error fetching batch from ${table} [${from}-${from + limit - 1}]:`, error.message);
            // Automatic safe fallback: if any column mismatch or query syntax error happens, fallback to select('*')
            if (error.code === '42703' || error.message?.includes('does not exist')) {
              console.warn(`Column mismatch detected for ${table}, attempting safe fallback select('*')...`);
              const fallback = await supabase
                .from(table)
                .select('*')
                .order('id', { ascending: true })
                .range(from, from + limit - 1);
              if (!fallback.error && fallback.data) {
                data = fallback.data;
                error = null;
              }
            }
            if (error) {
              break;
            }
          }

          if (data && data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              const item = data[i] as any;
              if (item.isDeleted === true) continue;
              const id = item.id !== undefined && item.id !== null ? String(item.id) : null;
              if (id) {
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  allData.push(item);
                }
              } else {
                allData.push(item);
              }
            }
            if (data.length < limit) {
              hasMore = false;
              break;
            }
            from += limit;
          } else {
            hasMore = false;
            break;
          }
        }

        if (allData.length > 0) {
          lastTableFetchTimestamps[table] = Date.now();
          localCache.set(`all_${table}`, allData).catch(() => {});
          return allData;
        }

        return cached || [];
      } catch (err) {
        console.warn(`Background network fetch failed for ${table}:`, err);
        return cached || [];
      } finally {
        inFlightTableFetches[table] = null;
      }
    })();

    inFlightTableFetches[table] = fetchPromise;
    return fetchPromise;
  };

  // If we have cached data, return it instantly and trigger throttled background sync
  if (cached && cached.length > 0 && !forceNetwork) {
    fetchFromNetwork().catch(() => {});
    return cached;
  }

  // If forceNetwork or no cache exists at all, fetch synchronously from network
  const netData = await fetchFromNetwork();
  if (netData && netData.length > 0) {
    return netData;
  }

  return cached || [];
};

const getDeletedData = async (table: string) => {
  let allData: any[] = [];
  let from = 0;
  const limit = 1000;
  
  let selectColumns = 'id, name, description, category, size, costPrice, sellingPrice, imageUrl, stock, minStock, qrCode, isArchived, isDeleted, deletedAt, deletedBy, createdAt, categoryId, subcategoryId, price, dozenPriceUsd, piecePriceUsd, piecePriceIqd, packaging, piecesCount, modelNumber, productCode, barcode, finalImageUrl, views';
  if (table === 'orders') {
    selectColumns = 'id, orderNumber, customerName, customerPhone, address, status, notes, total, products, isDeleted, deletedAt, deletedBy, createdAt';
  } else if (table === 'categories') {
    selectColumns = 'id, name, description, icon, isDeleted, deletedAt, deletedBy, createdAt, order, parentId, isHidden';
  } else if (table === 'users') {
    selectColumns = '*';
  }

  while (true) {
    let { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq('isDeleted', true)
      .range(from, from + limit - 1);
      
    if (error) {
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        const fallback = await supabase
          .from(table)
          .select('*')
          .eq('isDeleted', true)
          .range(from, from + limit - 1);
        if (!fallback.error && fallback.data) {
          data = fallback.data;
          error = null;
        }
      }
      if (error) {
        console.error(error);
        throw error;
      }
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

// Deduplicate concurrent requests so parallel callers share the same active network promise
let inFlightProductsPromise: Promise<any[]> | null = null;
let inFlightCategoriesPromise: Promise<any[]> | null = null;

export const api = {
  clearCache: () => { 
    Object.keys(memCache).forEach(k => delete memCache[k]); 
    localCache.clearAll().catch(() => {});
  },
  uploadImage: async (base64Str: string): Promise<string> => {
    try {
      if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
      
      const res = await fetch(base64Str);
      let blob = await res.blob();
      
      try {
        blob = await compressImage(blob, 1200, 0.75);
      } catch (compErr) {
        console.warn('Image compression warning:', compErr);
      }

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
    const prodCols = 'id, name, description, category, size, costPrice, sellingPrice, imageUrl, stock, minStock, qrCode, isArchived, isDeleted, deletedAt, deletedBy, createdAt, categoryId, subcategoryId, price, dozenPriceUsd, piecePriceUsd, piecePriceIqd, packaging, piecesCount, modelNumber, productCode, barcode, finalImageUrl, views';
    let { data, error } = await supabase.from('products').select(prodCols).eq('id', id).single();
    if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
      const fb = await supabase.from('products').select('*').eq('id', id).single();
      data = fb.data;
      error = fb.error;
    }
    if (error || !data) return null;
    const rawProd = data as any;
    return {
      ...rawProd,
      packaging: rawProd.packaging !== undefined && rawProd.packaging !== null && rawProd.packaging !== '' && rawProd.packaging !== '---'
        ? String(rawProd.packaging)
        : (rawProd.size?.packaging || (rawProd.piecesCount ? String(rawProd.piecesCount) : (rawProd.size?.piecesCount ? String(rawProd.size.piecesCount) : ''))),
      piecesCount: rawProd.piecesCount !== undefined && rawProd.piecesCount !== null
        ? Number(rawProd.piecesCount)
        : (rawProd.size?.piecesCount !== undefined ? Number(rawProd.size.piecesCount) : undefined),
      isHidden: rawProd.size?.isHidden !== undefined ? Boolean(rawProd.size.isHidden) : Boolean(rawProd.isHidden),
      isLocked: rawProd.size?.isLocked !== undefined ? Boolean(rawProd.size.isLocked) : Boolean(rawProd.isLocked),
      isArchived: rawProd.isArchived !== undefined ? Boolean(rawProd.isArchived) : (rawProd.size?.isArchived !== undefined ? Boolean(rawProd.size.isArchived) : false),
      isDeleted: Boolean(rawProd.isDeleted),
      isShowcase: rawProd.size?.isShowcase !== undefined ? Boolean(rawProd.size.isShowcase) : Boolean(rawProd.isShowcase),
      showcaseCategory: rawProd.size?.showcaseCategory || rawProd.showcaseCategory || '',
      oldPriceInfo: rawProd.size?.oldPriceInfo || undefined,
      forceStandardCrush: rawProd.size?.forceStandardCrush ?? true
    };
  },

  getProducts: async (forceNetwork = false) => {
    return api.getProductsDirect(forceNetwork);
  },

  getProductsDirect: async (forceNetwork = false): Promise<any[]> => {
    const mapProduct = (p: any) => ({
      ...p,
      packaging: p.packaging !== undefined && p.packaging !== null && p.packaging !== '' && p.packaging !== '---'
        ? String(p.packaging)
        : (p.size?.packaging || (p.piecesCount ? String(p.piecesCount) : (p.size?.piecesCount ? String(p.size.piecesCount) : ''))),
      piecesCount: p.piecesCount !== undefined && p.piecesCount !== null
        ? Number(p.piecesCount)
        : (p.size?.piecesCount !== undefined ? Number(p.size.piecesCount) : undefined),
      isHidden: p.size?.isHidden !== undefined ? Boolean(p.size.isHidden) : Boolean(p.isHidden),
      isLocked: p.size?.isLocked !== undefined ? Boolean(p.size.isLocked) : Boolean(p.isLocked),
      isArchived: p.isArchived !== undefined ? Boolean(p.isArchived) : (p.size?.isArchived !== undefined ? Boolean(p.size.isArchived) : false),
      isDeleted: Boolean(p.isDeleted),
      isShowcase: p.size?.isShowcase !== undefined ? Boolean(p.size.isShowcase) : Boolean(p.isShowcase),
      showcaseCategory: p.size?.showcaseCategory || p.showcaseCategory || '',
      oldPriceInfo: p.size?.oldPriceInfo || undefined,
      forceStandardCrush: p.size?.forceStandardCrush ?? true,
      updatedAt: p.size?.updatedAt || p.createdAt
    });

    // 1. Return memory cache instantly if fresh
    if (!forceNetwork && memCache['all_products'] && (Date.now() - memCache['all_products'].timestamp < MEM_CACHE_TTL)) {
      return deduplicateItems(memCache['all_products'].data);
    }

    // 2. Try fast return from local cache instantly (0ms load for instant UI render)
    const localCached = await localCache.get<any[]>('all_products', Infinity);
    if (!forceNetwork && localCached && localCached.length > 0) {
      const processed = deduplicateItems(localCached).map(mapProduct);
      memCache['all_products'] = { data: processed, timestamp: Date.now() };
      
      // Trigger background silent sync to fetch any new models or depleted changes without blocking
      setTimeout(async () => {
        try {
          const freshData = await getData('products', true);
          if (freshData && freshData.length > 0) {
            const clean = deduplicateItems(freshData);
            const freshRes = clean.map(mapProduct).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            memCache['all_products'] = { data: freshRes, timestamp: Date.now() };
            localCache.set('all_products', freshRes).catch(() => {});
          }
        } catch (e) {
          // silent background sync error ignore
        }
      }, 50);

      return processed;
    }

    // Deduplicate active in-flight fetch
    if (inFlightProductsPromise) {
      return inFlightProductsPromise;
    }

    inFlightProductsPromise = (async () => {
      try {
        const data = await getData('products', forceNetwork);
        if (data && data.length > 0) {
          const cleanData = deduplicateItems(data);
          const res = cleanData.map(mapProduct).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          memCache['all_products'] = { data: res, timestamp: Date.now() };
          localCache.set('all_products', res).catch(() => {});
          return res;
        }
      } catch (networkErr) {
        console.warn('Network fetch failed, falling back to local cache:', networkErr);
      }

      const fallbackLocal = await localCache.get<any[]>('all_products', Infinity);
      if (fallbackLocal && fallbackLocal.length > 0) {
        return deduplicateItems(fallbackLocal).map(mapProduct);
      }

      if (memCache['all_products']?.data?.length) {
        return deduplicateItems(memCache['all_products'].data);
      }

      return [];
    })().finally(() => {
      inFlightProductsPromise = null;
    });

    return inFlightProductsPromise;
  },
  createProduct: async (data: any) => { 
    const serverTime = await getServerTime();
    const safeData = { ...data, createdAt: data.createdAt || serverTime, updatedAt: data.updatedAt || serverTime };
    
    // Sanitize UUID fields: PostgreSQL uuid columns fail with empty string ""
    if (safeData.id && String(safeData.id).trim() === '') {
      delete safeData.id;
    }
    if ('subcategoryId' in safeData) {
      safeData.subcategoryId = (safeData.subcategoryId && String(safeData.subcategoryId).trim() !== '') 
        ? safeData.subcategoryId 
        : null;
    }
    if ('categoryId' in safeData) {
      safeData.categoryId = (safeData.categoryId && String(safeData.categoryId).trim() !== '') 
        ? safeData.categoryId 
        : null;
    }
    if (safeData.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f') {
      safeData.subcategoryId = null;
    }

    // Upload images if they are base64
    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = safeData.size || {};
    if (safeData.packaging !== undefined) safeData.size.packaging = safeData.packaging;
    if (safeData.piecesCount !== undefined) safeData.size.piecesCount = safeData.piecesCount;
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.isLocked !== undefined) safeData.size.isLocked = safeData.isLocked;
    if (safeData.isShowcase !== undefined) safeData.size.isShowcase = safeData.isShowcase;
    if (safeData.showcaseCategory !== undefined) safeData.size.showcaseCategory = safeData.showcaseCategory;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.lastEditDiffs !== undefined) safeData.size.lastEditDiffs = safeData.lastEditDiffs;
    if (safeData.lastEditDate !== undefined) safeData.size.lastEditDate = safeData.lastEditDate;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.isLocked;
    delete safeData.isShowcase;
    delete safeData.showcaseCategory;
    delete safeData.oldPriceInfo;
    delete safeData.lastEditDiffs;
    delete safeData.lastEditDate;
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

    // Prevent UUID casting error for empty strings: PostgreSQL requires valid UUID or NULL
    delete safeData.id;
    if ('subcategoryId' in safeData) {
      safeData.subcategoryId = (safeData.subcategoryId && String(safeData.subcategoryId).trim() !== '') 
        ? safeData.subcategoryId 
        : null;
    }
    if ('categoryId' in safeData) {
      safeData.categoryId = (safeData.categoryId && String(safeData.categoryId).trim() !== '') 
        ? safeData.categoryId 
        : null;
    }
    if (safeData.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f') {
      safeData.subcategoryId = null;
    }

    if (safeData.imageUrl?.startsWith('data:image')) {
        safeData.imageUrl = await api.uploadImage(safeData.imageUrl);
    }
    if (safeData.finalImageUrl?.startsWith('data:image')) {
        safeData.finalImageUrl = await api.uploadImage(safeData.finalImageUrl);
    }

    safeData.size = { ...existingSize, ...(safeData.size || {}) };
    if (safeData.packaging !== undefined) safeData.size.packaging = safeData.packaging;
    if (safeData.piecesCount !== undefined) safeData.size.piecesCount = safeData.piecesCount;
    if (safeData.isHidden !== undefined) safeData.size.isHidden = safeData.isHidden;
    if (safeData.isLocked !== undefined) safeData.size.isLocked = safeData.isLocked;
    if (safeData.isArchived !== undefined) safeData.size.isArchived = safeData.isArchived;
    if (safeData.isShowcase !== undefined) safeData.size.isShowcase = safeData.isShowcase;
    if (safeData.showcaseCategory !== undefined) safeData.size.showcaseCategory = safeData.showcaseCategory;
    if (safeData.oldPriceInfo !== undefined) safeData.size.oldPriceInfo = safeData.oldPriceInfo;
    if (safeData.lastEditDiffs !== undefined) safeData.size.lastEditDiffs = safeData.lastEditDiffs;
    if (safeData.lastEditDate !== undefined) safeData.size.lastEditDate = safeData.lastEditDate;
    if (safeData.forceStandardCrush !== undefined) safeData.size.forceStandardCrush = safeData.forceStandardCrush;
    if (safeData.updatedAt !== undefined) { safeData.size.updatedAt = safeData.updatedAt; delete safeData.updatedAt; }
    delete safeData.isHidden;
    delete safeData.isLocked;
    delete safeData.isShowcase;
    delete safeData.showcaseCategory;
    delete safeData.oldPriceInfo;
    delete safeData.lastEditDiffs;
    delete safeData.lastEditDate;
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
              packaging: r.packaging !== undefined && r.packaging !== null && r.packaging !== '' && r.packaging !== '---'
                ? String(r.packaging)
                : (r.size?.packaging || (r.piecesCount ? String(r.piecesCount) : (r.size?.piecesCount ? String(r.size.piecesCount) : p.packaging))),
              piecesCount: r.piecesCount !== undefined && r.piecesCount !== null
                ? Number(r.piecesCount)
                : (r.size?.piecesCount !== undefined ? Number(r.size.piecesCount) : p.piecesCount),
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
    localCache.clearMatching('products_cat_').catch(() => {});

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
      'deletedAt',
      'deletedBy',
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
      'packaging',
      'piecesCount',
      'views'
    ];
    
    const sizeKeys = [
      'isHidden',
      'isLocked',
      'isArchived',
      'isShowcase',
      'showcaseCategory',
      'oldPriceInfo',
      'packaging',
      'piecesCount',
      'forceStandardCrush'
    ];
    
    const directUpdates: any = {};
    const sizeUpdates: any = {};
    let hasSizeUpdates = false;
    let hasDirectUpdates = false;
    
    Object.keys(data).forEach(key => {
      if (directKeys.includes(key)) {
        if (key === 'subcategoryId' || key === 'categoryId') {
          directUpdates[key] = (data[key] && String(data[key]).trim() !== '') ? data[key] : null;
        } else {
          directUpdates[key] = data[key];
        }
        hasDirectUpdates = true;
      }
      if (sizeKeys.includes(key)) {
        sizeUpdates[key] = data[key];
        hasSizeUpdates = true;
      }
    });

    // If moving to the depleted category, always clear subcategoryId to null
    if (directUpdates.categoryId === 'be0a70a8-f9c6-430d-8416-11745f26576f') {
      directUpdates.subcategoryId = null;
      hasDirectUpdates = true;
    }

    const chunkSize = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }
    
    if (hasDirectUpdates && !hasSizeUpdates) {
      // Direct SQL bulk update on Supabase table sequentially per chunk with small pacing
      for (const chunk of chunks) {
        const { error } = await supabase.from('products').update(directUpdates).in('id', chunk);
        if (error) {
          console.error('Bulk direct update error:', error);
          throw error;
        }
        await new Promise(r => setTimeout(r, 50));
      }
    } else {
      // Direct updates and size JSON column updates sequentially per chunk
      for (const chunk of chunks) {
        if (hasDirectUpdates) {
          const { error: directErr } = await supabase.from('products').update(directUpdates).in('id', chunk);
          if (directErr) console.warn('Bulk direct update partial error:', directErr);
          await new Promise(r => setTimeout(r, 50));
        }

        const { data: existingRows, error: fetchErr } = await supabase
          .from('products')
          .select('id, size')
          .in('id', chunk);
          
        if (fetchErr) throw fetchErr;

        if (existingRows && existingRows.length > 0) {
          const updatePromises = existingRows.map(row => {
            const mergedSize = {
              ...(row.size || {}),
              ...sizeUpdates,
              updatedAt: serverTime
            };
            const itemUpdate: any = {
              ...directUpdates,
              size: mergedSize
            };
            return supabase.from('products').update(itemUpdate).eq('id', row.id);
          });
          // Process in smaller safe batches of 10 with delay to prevent overloading database connection limits
          for (let j = 0; j < updatePromises.length; j += 10) {
            const batchRes = await Promise.all(updatePromises.slice(j, j + 10));
            for (const r of batchRes) {
              if (r.error) throw r.error;
            }
            await new Promise(r => setTimeout(r, 50));
          }
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // IMMEDIATELY update local in-memory cache and IndexedDB
    const idSet = new Set(ids.map(String));
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.map((p: any) => {
        if (idSet.has(String(p.id))) {
          const mergedSize = {
            ...(p.size || {}),
            ...(hasSizeUpdates ? sizeUpdates : {})
          };
          if (data.isArchived !== undefined) mergedSize.isArchived = Boolean(data.isArchived);
          if (data.isHidden !== undefined) mergedSize.isHidden = Boolean(data.isHidden);
          if (data.isLocked !== undefined) mergedSize.isLocked = Boolean(data.isLocked);
          if (data.isShowcase !== undefined) mergedSize.isShowcase = Boolean(data.isShowcase);
          if (data.showcaseCategory !== undefined) mergedSize.showcaseCategory = data.showcaseCategory;

          return {
            ...p,
            ...directUpdates,
            ...(hasSizeUpdates ? sizeUpdates : {}),
            isHidden: data.isHidden !== undefined ? Boolean(data.isHidden) : (mergedSize.isHidden !== undefined ? Boolean(mergedSize.isHidden) : p.isHidden),
            isLocked: data.isLocked !== undefined ? Boolean(data.isLocked) : (mergedSize.isLocked !== undefined ? Boolean(mergedSize.isLocked) : p.isLocked),
            isArchived: data.isArchived !== undefined ? Boolean(data.isArchived) : (mergedSize.isArchived !== undefined ? Boolean(mergedSize.isArchived) : p.isArchived),
            isShowcase: data.isShowcase !== undefined ? Boolean(data.isShowcase) : (mergedSize.isShowcase !== undefined ? Boolean(mergedSize.isShowcase) : p.isShowcase),
            showcaseCategory: data.showcaseCategory !== undefined ? data.showcaseCategory : (mergedSize.showcaseCategory || p.showcaseCategory),
            categoryId: data.categoryId !== undefined ? data.categoryId : p.categoryId,
            subcategoryId: data.subcategoryId !== undefined ? (data.subcategoryId || undefined) : p.subcategoryId,
            size: mergedSize,
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
    localCache.clearMatching('products_cat_').catch(() => {});

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
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from('products').delete().in('id', chunk);
      if (error) throw error;
    }
    
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
    return await api.bulkDeleteProducts([id], deletedBy);
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
  getCategories: async (forceNetwork = false): Promise<any[]> => {
    const cacheKey = 'all_categories';
    if (!forceNetwork && memCache[cacheKey]?.data?.length && (Date.now() - (memCache[cacheKey].timestamp || 0) < 30000)) {
      return deduplicateCategories(memCache[cacheKey].data);
    }

    if (inFlightCategoriesPromise) {
      return inFlightCategoriesPromise;
    }
    
    inFlightCategoriesPromise = (async () => {
      try {
        const fresh = await getData('categories', forceNetwork);
        if (fresh && fresh.length > 0) {
          const cleanCats = deduplicateCategories(fresh);
          memCache[cacheKey] = { data: cleanCats, timestamp: Date.now() };
          localCache.set(cacheKey, cleanCats).catch(() => {});
          return cleanCats;
        }
      } catch (networkErr) {
        console.warn('Network fetch failed, falling back to cached local storage version:', networkErr);
      }

      // Fallback to cache if network fails
      const localCats = await localCache.get<any[]>(cacheKey, Infinity);
      if (localCats && localCats.length > 0) {
        const cleanCats = deduplicateCategories(localCats);
        memCache[cacheKey] = { data: cleanCats, timestamp: Date.now() };
        return cleanCats;
      }

      if (memCache[cacheKey]?.data?.length) {
        return deduplicateCategories(memCache[cacheKey].data);
      }

      return [];
    })().finally(() => {
      inFlightCategoriesPromise = null;
    });

    return inFlightCategoriesPromise;
  },
  createCategory: async (data: any) => { 
    const safeData = { ...data };
    if ('parentId' in safeData) {
      safeData.parentId = (safeData.parentId && String(safeData.parentId).trim() !== '') ? safeData.parentId : null;
    }
    const { data: r, error } = await supabase.from('categories').insert(safeData).select().single(); 
    if (error) throw error; 
    
    // Invalidate categories cache
    delete memCache['all_categories'];
    localCache.remove('all_categories').catch(() => {});

    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'CATEGORY_CREATED', category: r, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('categories_changes').send({
        type: 'broadcast',
        event: 'category_created',
        payload: { category: r, timestamp: Date.now() }
      });
    } catch {}

    return r; 
  },
  updateCategory: async (id: string, data: any) => { 
    const safeData = { ...data };
    delete safeData.id;
    if ('parentId' in safeData) {
      safeData.parentId = (safeData.parentId && String(safeData.parentId).trim() !== '') ? safeData.parentId : null;
    }
    const { data: r, error } = await supabase.from('categories').update(safeData).match({ id }).select().single(); 
    if (error) throw error; 
    
    // Invalidate categories cache
    delete memCache['all_categories'];
    localCache.remove('all_categories').catch(() => {});

    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'CATEGORY_UPDATED', category: r, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('categories_changes').send({
        type: 'broadcast',
        event: 'category_updated',
        payload: { category: r, timestamp: Date.now() }
      });
    } catch {}

    return r; 
  },
  deleteCategory: async (id: string, deletedBy?: string) => { 
    // If it is a parent category, also delete child subcategories
    await supabase.from('categories').delete().eq('parentId', id);
    
    // Delete the category itself
    const { error } = await supabase.from('categories').delete().match({ id }); 
    if (error) throw error; 
    
    // Invalidate categories and products cache
    delete memCache['all_categories'];
    localCache.remove('all_categories').catch(() => {});
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) delete memCache[k];
    });

    try {
      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'CATEGORY_DELETED', id, timestamp: Date.now() });
        bc.close();
      }
    } catch {}

    try {
      await supabase.channel('categories_changes').send({
        type: 'broadcast',
        event: 'category_deleted',
        payload: { id, timestamp: Date.now() }
      });
    } catch {}

    return { success: true }; 
  },
  hardDeleteCategory: async (id: string) => { 
    await supabase.from('categories').delete().eq('parentId', id);
    const { error } = await supabase.from('categories').delete().match({ id }); 
    if (error) throw error; 
    
    delete memCache['all_categories'];
    localCache.remove('all_categories').catch(() => {});
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) delete memCache[k];
    });
    return { success: true }; 
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
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error) return null;
      return data;
    } catch (e) {
      return null;
    }
  },
  createUser: async (data: any) => { 
    const { data: r, error } = await supabase.from('users').insert({ id: data.id || data.uid, ...data }).select().maybeSingle(); 
    if (error) throw error; return r; 
  },
  updateUser: async (id: string, data: any, silent?: boolean) => { 
    const { data: r, error } = await supabase.from('users').update(data).match({ id }).select().maybeSingle(); 
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
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const activeOrders: any[] = [];

    for (const o of (data || [])) {
      const parsed = parseOrderDetails(o);
      const completedAt = o.completedAt || parsed.completedAt || undefined;
      
      if (o.status === 'completed' && completedAt && (now - Number(completedAt) >= TWENTY_FOUR_HOURS)) {
        try {
          await supabase.from('orders').delete().match({ id: o.id });
        } catch (err) {
          // ignore
        }
        continue;
      }

      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      const orderCreatedAt = Number(o.createdAt || 0);
      if ((o.status === 'cancelled' || o.status === 'rejected') && orderCreatedAt && (now - orderCreatedAt >= THREE_DAYS)) {
        try {
          await supabase.from('orders').delete().match({ id: o.id });
        } catch (err) {
          // ignore
        }
        continue;
      }

      activeOrders.push({
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
        completedAt,
      });
    }
    return activeOrders;
  },
  // Real-time validation of order items to filter out any sold-out/depleted items
  validateOrderItemsAvailability: async (items: Array<{ productId?: string; product?: any; quantity?: number }>): Promise<{
    availableItems: any[];
    depletedItems: Array<{ id: string; name: string; code: string }>;
    hasDepleted: boolean;
  }> => {
    if (!items || items.length === 0) {
      return { availableItems: [], depletedItems: [], hasDepleted: false };
    }

    const itemProductIds = items
      .map(item => item.productId || item.product?.id)
      .filter(Boolean)
      .map(id => String(id));

    if (itemProductIds.length === 0) {
      return { availableItems: items, depletedItems: [], hasDepleted: false };
    }

    try {
      // 1. Fetch categories to identify all archived/depleted category IDs in real time
      const { data: categories } = await supabase.from('categories').select('id, name, isDeleted');
      const archivedCatIds = new Set<string>();
      (categories || []).forEach((c: any) => {
        if (isArchivedCategoryName(c.name)) {
          archivedCatIds.add(String(c.id));
        }
      });

      // 2. Fetch fresh real-time status of these products directly from Supabase
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, productCode, modelNumber, categoryId, subcategoryId, isArchived, isDeleted, size')
        .in('id', itemProductIds);

      const dbProdMap = new Map<string, any>();
      (dbProducts || []).forEach((p: any) => dbProdMap.set(String(p.id), p));

      const availableItems: any[] = [];
      const depletedItems: Array<{ id: string; name: string; code: string }> = [];

      for (const item of items) {
        const prodId = String(item.productId || item.product?.id);
        const dbP = dbProdMap.get(prodId);

        // Product is depleted if:
        // - Missing from DB (deleted)
        // - isDeleted is true
        // - isArchived is true (or in size?.isArchived)
        // - size?.isLocked is true
        // - size?.isHidden is true
        // - categoryId belongs to any archived/depleted category (e.g. "المواد النافذة")
        const isDepleted =
          !dbP ||
          Boolean(dbP.isDeleted) ||
          Boolean(dbP.isArchived) ||
          Boolean(dbP.size?.isArchived) ||
          Boolean(dbP.size?.isLocked) ||
          Boolean(dbP.size?.isHidden) ||
          Boolean(dbP.categoryId && archivedCatIds.has(String(dbP.categoryId)));

        if (isDepleted) {
          const code = (dbP?.productCode || dbP?.modelNumber || item.product?.productCode || item.product?.modelNumber || '---').toString();
          const name = (dbP?.name || item.product?.name || 'منتج غير معروف').toString();
          depletedItems.push({ id: prodId, name, code });
        } else {
          availableItems.push(item);
        }
      }

      return {
        availableItems,
        depletedItems,
        hasDepleted: depletedItems.length > 0
      };
    } catch (err) {
      console.error('Error in validateOrderItemsAvailability:', err);
      return { availableItems: items, depletedItems: [], hasDepleted: false };
    }
  },

  createOrder: async (data: any) => { 
    const rawItems = data.products || data.items || [];
    if (rawItems.length > 0) {
      const validation = await api.validateOrderItemsAvailability(rawItems);
      if (validation.hasDepleted) {
        if (validation.availableItems.length === 0) {
          const names = validation.depletedItems.map(d => `كود: ${d.code} (${d.name})`).join('، ');
          throw new Error(`عذراً، جميع المنتجات في الطلبية نافذة وغير متوفرة: ${names}`);
        }
        // Filter out depleted items automatically
        data.products = validation.availableItems;
        data.items = validation.availableItems;
        const newTotal = validation.availableItems.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0);
        data.total = newTotal;
        data.totalQuantity = newTotal;

        const excludedSummary = validation.depletedItems.map(d => d.code).join(', ');
        const excludedNote = `[تم تلقائياً استبعاد مواد نافذة: ${excludedSummary}]`;
        data.notes = data.notes ? `${data.notes}\n${excludedNote}` : excludedNote;
      }
    }

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
      safeData.products = sanitizeOrderProducts(data.products);
    } else if (data.items !== undefined) {
      safeData.products = sanitizeOrderProducts(data.items);
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

    // ----------------------------------------------------
    // Duplicate Order Prevention (Idempotency Guard)
    // ----------------------------------------------------
    try {
      const checkWindow = Date.now() - 120000; // 2 minutes window
      const targetCustomer = (safeData.customerName || agentName || '').trim();
      
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, orderNumber, customerName, total, products, createdAt')
        .gte('createdAt', checkWindow)
        .order('createdAt', { ascending: false })
        .limit(10);

      if (recentOrders && recentOrders.length > 0) {
        const newSummary = (safeData.products || [])
          .map((p: any) => `${p.productId || p.product?.id}:${p.quantity}`)
          .sort()
          .join('|');

        for (const prev of recentOrders) {
          const prevCust = (prev.customerName || '').trim();
          const custMatches = 
            prevCust === targetCustomer ||
            (prevCust && targetCustomer && (prevCust.includes(targetCustomer) || targetCustomer.includes(prevCust)));

          if (custMatches && Number(prev.total) === Number(safeData.total)) {
            const prevSummary = (prev.products || [])
              .map((p: any) => `${p.productId || p.product?.id}:${p.quantity}`)
              .sort()
              .join('|');

            if (newSummary && prevSummary && newSummary === prevSummary) {
              console.warn(`[Deduplication] Prevented duplicate order creation for ${targetCustomer}. Returning existing order: ${prev.orderNumber}`);
              return prev; // Return existing order without creating a duplicate!
            }
          }
        }
      }
    } catch (dedupErr) {
      console.warn('Deduplication check error:', dedupErr);
    }

    const { data: r, error } = await supabase.from('orders').insert(safeData).select().single(); 
    if (error) throw error; 

    // Update local cache immediately
    localCache.get<any[]>('all_orders', Infinity).then(cached => {
      if (cached && Array.isArray(cached)) {
        localCache.set('all_orders', [r, ...cached]).catch(() => {});
      }
    }).catch(() => {});

    return r; 
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

    // Handle completedAt timestamp seamlessly
    let finalNotes = data.notes;
    if (data.status === 'completed' || data.completedAt !== undefined) {
      const ts = data.completedAt || Date.now();
      if (finalNotes === undefined) {
        try {
          const { data: cur } = await supabase.from('orders').select('notes').eq('id', id).single();
          finalNotes = cur?.notes || '';
        } catch (e) {
          finalNotes = '';
        }
      }
      const cleaned = (finalNotes || '').replace(/\n?\[completedAt:\d+\]/gi, '').trim();
      finalNotes = `${cleaned}\n[completedAt:${ts}]`.trim();
    }

    if (finalNotes !== undefined) {
      let combinedNotes = finalNotes;
      if (data.transport && !combinedNotes.includes(data.transport)) {
        combinedNotes = `${combinedNotes}\nالنقليات: ${data.transport}`;
      }
      safeData.notes = combinedNotes;
    }

    if (data.products !== undefined) {
      safeData.products = sanitizeOrderProducts(data.products);
    } else if (data.items !== undefined) {
      safeData.products = sanitizeOrderProducts(data.items);
    }

    if (data.total !== undefined) {
      safeData.total = Number(data.total) || 0;
    } else if (data.totalQuantity !== undefined) {
      safeData.total = Number(data.totalQuantity) || 0;
    }

    const { data: r, error } = await supabase.from('orders').update(safeData).match({ id }).select().single(); 
    if (error) throw error; 

    // Synchronously update local cache so any immediate getOrders() call sees the update without lag
    localCache.get<any[]>('all_orders', Infinity).then(cached => {
      if (cached && Array.isArray(cached)) {
        const updated = cached.map((o: any) => {
          if (o.id === id) {
            return {
              ...o,
              ...safeData,
              notes: safeData.notes !== undefined ? safeData.notes : o.notes,
              status: safeData.status !== undefined ? safeData.status : o.status,
              completedAt: data.completedAt || o.completedAt
            };
          }
          return o;
        });
        localCache.set('all_orders', updated).catch(() => {});
      }
    }).catch(() => {});

    return r; 
  },
  deleteOrder: async (id: string, deletedBy?: string) => { 
    const { error } = await supabase.from('orders').delete().match({ id }); 
    if (error) throw error; 
    localCache.get<any[]>('all_orders', Infinity).then(cached => {
      if (cached && Array.isArray(cached)) {
        localCache.set('all_orders', cached.filter((o: any) => o.id !== id)).catch(() => {});
      }
    }).catch(() => {});
    return { success: true }; 
  },
  deleteAllCompletedOrders: async () => {
    const { error } = await supabase.from('orders').delete().eq('status', 'completed');
    if (error) throw error;
    localCache.get<any[]>('all_orders', Infinity).then(cached => {
      if (cached && Array.isArray(cached)) {
        localCache.set('all_orders', cached.filter((o: any) => o.status !== 'completed')).catch(() => {});
      }
    }).catch(() => {});
    return { success: true };
  },
  hardDeleteOrder: async (id: string) => { 
    const { error } = await supabase.from('orders').delete().match({ id }); 
    if (error) throw error; 
    localCache.get<any[]>('all_orders', Infinity).then(cached => {
      if (cached && Array.isArray(cached)) {
        localCache.set('all_orders', cached.filter((o: any) => o.id !== id)).catch(() => {});
      }
    }).catch(() => {});
    return { success: true }; 
  },
  restoreOrder: async (id: string) => { 
    const { error } = await supabase.from('orders').update({ isDeleted: false, deletedAt: null, deletedBy: null }).match({ id }); 
    if (error) throw error; 
    return { success: true }; 
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
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      await supabase.from('activity_logs').delete().lt('createdAt', thirtyDaysAgo);
    } catch (e) {
      // ignore
    }

    const { data, error } = await supabase.from('activity_logs').select('id, userId, userName, action, entityType, entityId, details, createdAt').order('createdAt', { ascending: false }).limit(200);
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
    const { data, error } = await supabase.from('notifications').select('id, userId, message, type, read, createdAt, isDeleted').eq('read', false).neq('isDeleted', true).order('createdAt', { ascending: false });
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
      const { data, error } = await supabase.from('settings').select('id, data').match({ id: 'global' }).maybeSingle(); 
      if (data && !error) {
        const parsed = data.data ? { id: data.id, ...data.data } : data;
        const complete = {
          companyName: 'شركة الوفاء المتميز',
          phone: '07801359735',
          phone2: '07817982888',
          telegram1: '07801359735',
          telegram2: '07817982888',
          ...parsed,
        };
        try {
          localStorage.setItem('alwafaa_settings_cache', JSON.stringify(complete));
        } catch (e) {}
        return complete;
      }
    } catch (e) {
      console.warn("Could not fetch settings from supabase:", e);
    }
    
    try {
      const cached = localStorage.getItem('alwafaa_settings_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    
    return {
      id: 'global',
      showcaseEnabled: true,
      companyName: 'شركة الوفاء المتميز',
      phone: '07801359735',
      phone2: '07817982888',
      telegram1: '07801359735',
      telegram2: '07817982888',
    };
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

  forceRefreshAll: async (forceNetwork = true) => {
    try {
      if (forceNetwork) {
        delete memCache['all_products'];
        delete memCache['all_categories'];
      }

      // Fetch products and categories in parallel directly from Supabase
      const [prods, cats] = await Promise.all([
        api.getProductsDirect(forceNetwork),
        api.getCategories(forceNetwork)
      ]);

      if (typeof window !== 'undefined' && (window as any).BroadcastChannel) {
        const bc = new (window as any).BroadcastChannel('brq_products_sync');
        bc.postMessage({ type: 'FORCE_REFRESH', timestamp: Date.now() });
        bc.close();
      }

      try {
        await supabase.channel('products_changes').send({
          type: 'broadcast',
          event: 'force_refresh',
          payload: { timestamp: Date.now() }
        });
      } catch {}

      return { success: true, count: prods?.length || 0, categoriesCount: cats?.length || 0 };
    } catch (e) {
      console.warn("forceRefreshAll error:", e);
      return { success: false };
    }
  },
};
