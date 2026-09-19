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

// Development diagnostic logger (only active in development)
const isDev = process.env.NODE_ENV !== 'production';
export const logDev = (tag: string, details?: any) => {
  if (isDev) {
    console.log(`%c[${tag}]`, 'color: #D4AF37; font-weight: bold;', details || '');
  }
};

export const PRODUCT_SELECT_COLUMNS = 'id, name, description, category, size, costPrice, sellingPrice, imageUrl, stock, minStock, qrCode, isArchived, isDeleted, deletedAt, deletedBy, createdAt, categoryId, subcategoryId, price, dozenPriceUsd, piecePriceUsd, piecePriceIqd, packaging, piecesCount, modelNumber, productCode, barcode, finalImageUrl, views';
export const USERS_SELECT_COLUMNS = 'id, uid, email, username, role, phone, password, allowedPages, isDeleted, deletedAt, deletedBy, createdAt, fullName, status, allowedDevice, lastActive, currentPage, isOnline, userNumber';
export const ORDERS_SELECT_COLUMNS = 'id, orderNumber, customerName, customerPhone, address, status, notes, total, products, isDeleted, deletedAt, deletedBy, createdAt';
export const CATEGORIES_SELECT_COLUMNS = 'id, name, description, icon, isDeleted, deletedAt, deletedBy, createdAt, order, parentId, isHidden';

// Global tracking to prevent duplicate in-flight requests and database connection throttling
const inFlightTableFetches: Record<string, Promise<any[]> | null> = {};
const lastTableFetchTimestamps: Record<string, number> = {};
const MIN_BACKGROUND_FETCH_INTERVAL = 30000; // 30s cooldown between full background network fetches

const getData = async (table: string, forceNetwork = false) => {
  // Try local cache first for instant response (0ms load time), sanitized for unique IDs
  // Products must ALWAYS be fetched from network as per user requirement for Supabase to be sole source
  const isProducts = table === 'products';
  const rawCached = isProducts ? null : await localCache.get<any[]>(`all_${table}`, Infinity);
  const cached = rawCached ? deduplicateItems(rawCached) : null;
  if (rawCached && cached && rawCached.length !== cached.length) {
    // Purge stale duplicate entries from storage if found
    localCache.set(`all_${table}`, cached).catch(() => {});
  }

  // Background network fetch function with deduplication and sequential paging
  const fetchFromNetwork = async (): Promise<any[]> => {
    // If an in-flight network request for this table is already running, reuse that exact promise
    if (inFlightTableFetches[table]) {
      logDev('DUPLICATE REQUEST PREVENTED', { table });
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

        let selectColumns = PRODUCT_SELECT_COLUMNS;
        if (table === 'orders') {
          selectColumns = ORDERS_SELECT_COLUMNS;
        } else if (table === 'categories') {
          selectColumns = CATEGORIES_SELECT_COLUMNS;
        } else if (table === 'users') {
          selectColumns = USERS_SELECT_COLUMNS;
        } else if (table === 'activity_logs') {
          selectColumns = 'id, userId, userName, action, entityType, entityId, details, createdAt';
        } else if (table === 'notifications') {
          selectColumns = 'id, userId, message, type, read, createdAt, isDeleted, deletedAt, deletedBy';
        } else if (table === 'settings') {
          selectColumns = 'id, data';
        }

        logDev('SUPABASE REQUEST', { table, from, limit });
        // Fetch sequentially in moderate batches to eliminate statement timeouts (Error 57014)
        // Order by id guarantees deterministic pagination without row shifting or repetition
        while (hasMore) {
          const { data, error } = await supabase
            .from(table)
            .select(selectColumns)
            .order('id', { ascending: true })
            .range(from, from + limit - 1);

          if (error) {
            console.warn(`Error fetching batch from ${table} [${from}-${from + limit - 1}]:`, error.message);
            break;
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
          if (table !== 'products') {
            localCache.set(`all_${table}`, allData).catch(() => {});
          }
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
  
  let selectColumns = PRODUCT_SELECT_COLUMNS;
  if (table === 'orders') {
    selectColumns = ORDERS_SELECT_COLUMNS;
  } else if (table === 'categories') {
    selectColumns = CATEGORIES_SELECT_COLUMNS;
  } else if (table === 'users') {
    selectColumns = USERS_SELECT_COLUMNS;
  }

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns)
      .eq('isDeleted', true)
      .range(from, from + limit - 1);
      
    if (error) {
      console.error(`Error fetching deleted records from ${table}:`, error.message);
      break;
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


// Map raw database product to fully typed application product
export const mapProduct = (p: any) => ({
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

// Category-specific request and sync deduplication
const inFlightCategoryRequests: Record<string, Promise<any[]> | null> = {};
const inFlightCategorySyncs: Record<string, boolean> = {};
const lastCategorySyncTimestamps: Record<string, number> = {};

// Fast in-memory and persistent cache
const memCache: Record<string, { data: any; lastSyncAt?: number; timestamp: number }> = {};
const MEM_CACHE_TTL = 60000; // 1 minute in-memory

// Deduplicate concurrent requests so parallel callers share the same active network promise
let inFlightProductsPromise: Promise<any[]> | null = null;
let inFlightCategoriesPromise: Promise<any[]> | null = null;
let inFlightCategoryCountsPromise: Promise<{ counts: Record<string, number>; showcaseCount: number }> | null = null;

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
  // PRODUCTS - CATEGORY SPECIFIC OPTIMIZED CACHING & INCREMENTAL SYNC
  // SERVER-SIDE PAGINATED FETCH (The single source of truth for the product catalog)
  getProductsPaginated: async (options: {
    page: number;
    pageSize: number;
    categoryId?: string;
    searchTerm?: string;
    searchArchived?: boolean;
    showcaseCategory?: string;
    isAdmin?: boolean;
  }): Promise<{ products: any[]; hasMore: boolean }> => {
    const { page, pageSize, categoryId, searchTerm, searchArchived, showcaseCategory, isAdmin } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    logDev('SUPABASE PAGINATED REQUEST', { categoryId, searchTerm, page, pageSize });

    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT_COLUMNS, { count: 'exact' });

    // 1. Basic Status Filters
    query = query.eq('isDeleted', false);

    if (!isAdmin) {
      // Normal users only see active (not hidden, not locked) and published products
      query = query.eq('isHidden', false);
      query = query.eq('isLocked', false);
      
      if (searchArchived) {
        query = query.eq('isArchived', true);
      } else {
        query = query.eq('isArchived', false);
        // Only published to showcase
        query = query.eq('size->>isShowcase', 'true');
      }
    } else {
      // Admin side logic (if needed, though this is primarily for user side)
      if (searchArchived) query = query.eq('isArchived', true);
    }

    // 2. Showcase Category Filter
    if (showcaseCategory && showcaseCategory !== 'all') {
      query = query.eq('size->>showcaseCategory', showcaseCategory);
    }

    // 3. Category Filter (Recursive)
    if (categoryId && categoryId !== 'all') {
      const categories = await api.getCategories();
      const getAllDescendantIds = (catId: string, cats: any[]): string[] => {
        const children = cats.filter((c: any) => c.parentId === catId);
        let ids: string[] = [];
        for (const child of children) {
          ids.push(child.id);
          ids.push(...getAllDescendantIds(child.id, cats));
        }
        return ids;
      };
      const descendantIds = getAllDescendantIds(categoryId, categories);
      const catIds = [categoryId, ...descendantIds];

      if (catIds.length === 1) {
        query = query.or(`categoryId.eq.${catIds[0]},subcategoryId.eq.${catIds[0]}`);
      } else {
        query = query.or(`categoryId.in.(${catIds.join(',')}),subcategoryId.in.(${catIds.join(',')})`);
      }
    }

    // 3. Search Filter
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      query = query.or(`name.ilike.%${term}%,productCode.ilike.%${term}%,modelNumber.ilike.%${term}%,barcode.ilike.%${term}%`);
    }

    // 4. Sorting & Pagination
    // Stable sorting using createdAt desc and id asc to prevent row skipping during pagination
    const { data, count, error } = await query
      .order('createdAt', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Paginated fetch error:', error.message);
      return { products: [], hasMore: false };
    }

    const mapped = (data || []).map(mapProduct);
    const hasMore = count ? (from + mapped.length < count) : (mapped.length === pageSize);

    return { products: mapped, hasMore };
  },

  getProductsByCategory: async (categoryId: string, forceNetwork = false): Promise<any[]> => {
    if (!categoryId) return [];
    const cacheKey = `products_cat_${categoryId}`;
    const now = Date.now();

    // 1. Memory Cache check (0ms instant return)
    if (!forceNetwork && memCache[cacheKey]?.data?.length) {
      logDev('CACHE HIT', { categoryId, count: memCache[cacheKey].data.length });
      const lastSync = memCache[cacheKey].lastSyncAt || memCache[cacheKey].timestamp || 0;
      // If synced > 60s ago, trigger silent background incremental sync
      if (now - lastSync > 60000) {
        api.syncCategoryIncremental(categoryId).catch(() => {});
      }
      return deduplicateItems(memCache[cacheKey].data);
    }

    // 2. Local Cache check (instant offline / return from previous session)
    const cached = await localCache.get<any>(cacheKey, Infinity);
    if (!forceNetwork && cached) {
      const rawList = Array.isArray(cached) ? cached : (cached.products || []);
      if (rawList.length > 0) {
        logDev('LOCAL CACHE HIT', { categoryId, count: rawList.length });
        const processed = deduplicateItems(rawList).map(mapProduct);
        const lastSync = cached.lastSyncAt || now;
        memCache[cacheKey] = { data: processed, lastSyncAt: lastSync, timestamp: now };
        
        // Trigger silent background incremental sync if synced > 60s ago
        if (now - lastSync > 60000) {
          api.syncCategoryIncremental(categoryId).catch(() => {});
        }
        return processed;
      }
    }

    // 3. Cache Miss: Fetch category data from network with request deduplication
    logDev('CACHE MISS', { categoryId });
    return api.fetchCategoryProductsDirect(categoryId, forceNetwork);
  },

  fetchCategoryProductsDirect: async (categoryId: string, forceNetwork = false): Promise<any[]> => {
    if (!categoryId) return [];
    const cacheKey = `products_cat_${categoryId}`;

    // Deduplicate in-flight requests for the exact same category
    if (inFlightCategoryRequests[categoryId]) {
      logDev('DUPLICATE REQUEST PREVENTED', { categoryId });
      return inFlightCategoryRequests[categoryId]!;
    }

    const fetchPromise = (async () => {
      const startTime = Date.now();
      try {
        const categories = await api.getCategories();
        const getAllDescendantIds = (catId: string, cats: any[]): string[] => {
          const children = cats.filter((c: any) => c.parentId === catId);
          let ids: string[] = [];
          for (const child of children) {
            ids.push(child.id);
            ids.push(...getAllDescendantIds(child.id, cats));
          }
          return ids;
        };
        const descendantIds = getAllDescendantIds(categoryId, categories);
        const catIds = [categoryId, ...descendantIds];

        logDev('SUPABASE REQUEST', { categoryId, catIds });

        let query = supabase
          .from('products')
          .select(PRODUCT_SELECT_COLUMNS)
          .eq('isDeleted', false);

        if (catIds.length === 1) {
          query = query.or(`categoryId.eq.${catIds[0]},subcategoryId.eq.${catIds[0]}`);
        } else {
          query = query.or(`categoryId.in.(${catIds.join(',')}),subcategoryId.in.(${catIds.join(',')})`);
        }

        const { data, error } = await query.order('createdAt', { ascending: false });
        if (error) {
          console.error(`Error fetching category products for ${categoryId}:`, error.message);
          throw error;
        }

        const rawList = data || [];
        const clean = deduplicateItems(rawList);
        const mapped = clean.map(mapProduct);

        const duration = Date.now() - startTime;
        logDev('SUPABASE REQUEST', { categoryId, count: mapped.length, duration: `${duration}ms` });

        const now = Date.now();
        memCache[cacheKey] = { data: mapped, lastSyncAt: now, timestamp: now };
        // No localCache for products
        lastCategorySyncTimestamps[categoryId] = now;

        return mapped;
      } catch (err) {
        console.warn(`Fetch category failed for ${categoryId}:`, err);
        const fallback = await localCache.get<any>(cacheKey, Infinity);
        const rawList = Array.isArray(fallback) ? fallback : (fallback?.products || []);
        if (rawList.length > 0) {
          return deduplicateItems(rawList).map(mapProduct);
        }
        return memCache[cacheKey]?.data || [];
      } finally {
        inFlightCategoryRequests[categoryId] = null;
      }
    })();

    inFlightCategoryRequests[categoryId] = fetchPromise;
    return fetchPromise;
  },

  // INCREMENTAL SYNC: Fetch ONLY new, updated, or deleted products since lastSyncAt
  syncCategoryIncremental: async (categoryId: string): Promise<void> => {
    if (!categoryId || inFlightCategorySyncs[categoryId]) return;

    const cacheKey = `products_cat_${categoryId}`;
    const cachedEntry = memCache[cacheKey];
    let currentProducts: any[] = cachedEntry?.data || [];
    let lastSync = cachedEntry?.lastSyncAt || lastCategorySyncTimestamps[categoryId] || 0;

    if (currentProducts.length === 0) {
      const localEntry = await localCache.get<any>(cacheKey, Infinity);
      currentProducts = Array.isArray(localEntry) ? localEntry : (localEntry?.products || []);
      lastSync = localEntry?.lastSyncAt || lastSync;
    }

    if (currentProducts.length === 0 || !lastSync || (Date.now() - lastSync < 30000)) {
      return; // Need at least initial products and minimum 30s cooldown
    }

    inFlightCategorySyncs[categoryId] = true;
    const startTime = Date.now();

    try {
      const categories = await api.getCategories();
      const getAllDescendantIds = (catId: string, cats: any[]): string[] => {
        const children = cats.filter((c: any) => c.parentId === catId);
        let ids: string[] = [];
        for (const child of children) {
          ids.push(child.id);
          ids.push(...getAllDescendantIds(child.id, cats));
        }
        return ids;
      };
      const descendantIds = getAllDescendantIds(categoryId, categories);
      const catIds = [categoryId, ...descendantIds];

      const catFilter = catIds.length === 1
        ? `categoryId.eq.${catIds[0]},subcategoryId.eq.${catIds[0]}`
        : `categoryId.in.(${catIds.join(',')}),subcategoryId.in.(${catIds.join(',')})`;

      // 1. Fetch products created or updated since lastSyncAt
      // 2. Fetch products deleted since lastSyncAt
      const [modRes, delRes] = await Promise.all([
        supabase
          .from('products')
          .select(PRODUCT_SELECT_COLUMNS)
          .or(catFilter)
          .or(`createdAt.gt.${lastSync},size->>updatedAt.gt.${lastSync}`)
          .eq('isDeleted', false),
        supabase
          .from('products')
          .select('id, isDeleted, deletedAt')
          .or(catFilter)
          .eq('isDeleted', true)
          .gt('deletedAt', lastSync)
      ]);

      const modified = (modRes.data || []).map(mapProduct);
      const deletedIds = new Set((delRes.data || []).map((d: any) => String(d.id)));

      logDev('BACKGROUND SYNC', {
        categoryId,
        duration: `${Date.now() - startTime}ms`,
        newOrUpdatedCount: modified.length,
        deletedCount: deletedIds.size
      });

      const now = Date.now();
      lastCategorySyncTimestamps[categoryId] = now;

      // If zero changes, do NOT re-render or re-download anything!
      if (modified.length === 0 && deletedIds.size === 0) {
        if (memCache[cacheKey]) memCache[cacheKey].lastSyncAt = now;
        localCache.set(cacheKey, { categoryId, products: currentProducts, lastSyncAt: now }).catch(() => {});
        return;
      }

      // Apply incremental changes
      let updatedList = [...currentProducts];

      // Remove deleted products
      if (deletedIds.size > 0) {
        updatedList = updatedList.filter(p => !deletedIds.has(String(p.id)));
      }

      // Upsert modified / new products
      modified.forEach(modProd => {
        const idx = updatedList.findIndex(p => String(p.id) === String(modProd.id));
        if (idx >= 0) {
          updatedList[idx] = modProd;
        } else {
          updatedList.unshift(modProd);
        }
      });

      const clean = deduplicateItems(updatedList);
      memCache[cacheKey] = { data: clean, lastSyncAt: now, timestamp: now };
      // No localCache for products
    } catch (err) {
      console.warn(`Incremental sync failed for category ${categoryId}:`, err);
    } finally {
      inFlightCategorySyncs[categoryId] = false;
    }
  },

  // FAST CATEGORY PRODUCT COUNTS (Used by Home.tsx without fetching heavy product data)
  getCategoryProductCounts: async (forceNetwork = false): Promise<{ counts: Record<string, number>; showcaseCount: number }> => {
    const cacheKey = 'category_product_counts';
    const now = Date.now();

    if (!forceNetwork && memCache[cacheKey]?.data && (now - memCache[cacheKey].timestamp < 60000)) {
      logDev('CACHE HIT', { type: 'category_counts' });
      return memCache[cacheKey].data;
    }

    const cached = await localCache.get<any>(cacheKey, 1000 * 60 * 10);
    if (!forceNetwork && cached && cached.counts) {
      logDev('LOCAL CACHE HIT', { type: 'category_counts' });
      memCache[cacheKey] = { data: cached, timestamp: now };
      // Background revalidation
      setTimeout(() => {
        api.getCategoryProductCounts(true).catch(() => {});
      }, 100);
      return cached;
    }

    if (inFlightCategoryCountsPromise) {
      logDev('DUPLICATE REQUEST PREVENTED', { type: 'category_counts' });
      return inFlightCategoryCountsPromise;
    }

    inFlightCategoryCountsPromise = (async () => {
      try {
        logDev('SUPABASE REQUEST', { type: 'category_counts_projection' });
        const startTime = Date.now();
        const { data, error } = await supabase
          .from('products')
          .select('categoryId, subcategoryId, size')
          .eq('isDeleted', false)
          .eq('isArchived', false);

        if (error || !data) {
          return cached || { counts: {}, showcaseCount: 0 };
        }

        const counts: Record<string, number> = {};
        let showcaseCount = 0;

        for (let i = 0; i < data.length; i++) {
          const item = data[i] as any;
          const size = item.size || {};
          if (size.isHidden || size.isLocked) continue;

          if (size.isShowcase) {
            showcaseCount++;
          }

          if (item.categoryId) {
            counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
          }
        }

        const result = { counts, showcaseCount };
        logDev('SUPABASE REQUEST', { type: 'category_counts_done', duration: `${Date.now() - startTime}ms` });

        memCache[cacheKey] = { data: result, timestamp: Date.now() };
        localCache.set(cacheKey, result).catch(() => {});
        return result;
      } catch (err) {
        console.warn('Failed to fetch category counts:', err);
        return cached || { counts: {}, showcaseCount: 0 };
      } finally {
        inFlightCategoryCountsPromise = null;
      }
    })();

    return inFlightCategoryCountsPromise;
  },

  // SHOWCASE PRODUCTS (Cached dedicated subset)
  getShowcaseProducts: async (forceNetwork = false): Promise<any[]> => {
    const cacheKey = 'products_showcase';
    const now = Date.now();

    if (!forceNetwork && memCache[cacheKey]?.data?.length && (now - memCache[cacheKey].timestamp < 60000)) {
      logDev('CACHE HIT', { type: 'showcase' });
      return memCache[cacheKey].data;
    }

    const cached = await localCache.get<any[]>(cacheKey, 1000 * 60 * 10);
    if (!forceNetwork && cached && cached.length > 0) {
      logDev('LOCAL CACHE HIT', { type: 'showcase' });
      memCache[cacheKey] = { data: cached, timestamp: now };
      return cached;
    }

    logDev('SUPABASE REQUEST', { type: 'showcase' });
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_COLUMNS)
      .eq('size->>isShowcase', 'true')
      .eq('isDeleted', false)
      .eq('isArchived', false);

    if (error) {
      console.warn('Failed to fetch showcase products:', error.message);
      return cached || [];
    }

    const clean = deduplicateItems(data || []).map(mapProduct);
    memCache[cacheKey] = { data: clean, timestamp: Date.now() };
    localCache.set(cacheKey, clean).catch(() => {});
    return clean;
  },

  // SERVER-SIDE SEARCH (Debounced, lightweight, zero download of entire database)
  searchProducts: async (searchTerm: string, options: { searchArchived?: boolean; limit?: number } = {}): Promise<any[]> => {
    if (!searchTerm || !searchTerm.trim()) return [];
    const term = searchTerm.trim();
    const limit = options.limit || 60;

    logDev('SUPABASE REQUEST', { type: 'searchProducts', query: term });
    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT_COLUMNS)
      .eq('isDeleted', false);

    if (!options.searchArchived) {
      query = query.eq('isArchived', false);
    }

    query = query
      .or(`name.ilike.%${term}%,productCode.ilike.%${term}%,modelNumber.ilike.%${term}%,barcode.ilike.%${term}%`)
      .order('createdAt', { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) {
      console.error('Search query error:', error.message);
      return [];
    }

    return deduplicateItems(data || []).map(mapProduct);
  },

  // SINGLE PRODUCT BY ID: Cache-first, then single item fetch (never select('*'), never load all products)
  getProductById: async (id: string): Promise<any | null> => {
    if (!id) return null;

    // 1. Check all memory caches first
    for (const key of Object.keys(memCache)) {
      if (key.startsWith('products_cat_') && memCache[key]?.data) {
        const found = memCache[key].data.find((p: any) => String(p.id) === String(id));
        if (found) {
          logDev('CACHE HIT', { type: 'productById', id });
          return found;
        }
      }
    }
    if (memCache['all_products']?.data) {
      const found = memCache['all_products'].data.find((p: any) => String(p.id) === String(id));
      if (found) {
        logDev('CACHE HIT', { type: 'productById_all', id });
        return found;
      }
    }

    // 2. Query Supabase for this single product ID
    logDev('SUPABASE REQUEST', { type: 'productById', id });
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_COLUMNS)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapProduct(data);
  },

  // EXACT TOTAL PRODUCT COUNT (Used by Dashboard without loading rows)
  getProductsCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('isDeleted', false);
    if (error) return 0;
    return count || 0;
  },

  getProducts: async (forceNetwork = false) => {
    return api.getProductsDirect(forceNetwork);
  },

  getProductsDirect: async (forceNetwork = false): Promise<any[]> => {
    // 1. Return memory cache instantly if fresh
    if (!forceNetwork && memCache['all_products'] && (Date.now() - memCache['all_products'].timestamp < MEM_CACHE_TTL)) {
      return deduplicateItems(memCache['all_products'].data);
    }

    // Deduplicate active in-flight fetch
    if (inFlightProductsPromise) {
      logDev('DUPLICATE REQUEST PREVENTED', { type: 'all_products' });
      return inFlightProductsPromise;
    }

    inFlightProductsPromise = (async () => {
      try {
        const data = await getData('products', forceNetwork);
        if (data && data.length > 0) {
          const cleanData = deduplicateItems(data);
          const res = cleanData.map(mapProduct).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          memCache['all_products'] = { data: res, timestamp: Date.now() };
          return res;
        }
      } catch (networkErr) {
        console.warn('Network fetch failed:', networkErr);
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

    const finalProduct = mapProduct(r);
    logDev('INSERT', { id: finalProduct.id, categoryId: finalProduct.categoryId });

    // Update in-memory and persistent cache immediately
    if (memCache['all_products']?.data) {
      memCache['all_products'].data = [finalProduct, ...memCache['all_products'].data.filter((p: any) => String(p.id) !== String(finalProduct.id))];
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    // Granular Category Cache Update: Add to the specific category / subcategory caches without clearing
    if (finalProduct.categoryId) {
      const catKey = `products_cat_${finalProduct.categoryId}`;
      if (memCache[catKey]?.data) {
        memCache[catKey].data = [finalProduct, ...memCache[catKey].data.filter((p: any) => String(p.id) !== String(finalProduct.id))];
        localCache.set(catKey, { categoryId: finalProduct.categoryId, products: memCache[catKey].data, lastSyncAt: Date.now() }).catch(() => {});
      }
    }
    if (finalProduct.subcategoryId) {
      const subKey = `products_cat_${finalProduct.subcategoryId}`;
      if (memCache[subKey]?.data) {
        memCache[subKey].data = [finalProduct, ...memCache[subKey].data.filter((p: any) => String(p.id) !== String(finalProduct.id))];
        localCache.set(subKey, { categoryId: finalProduct.subcategoryId, products: memCache[subKey].data, lastSyncAt: Date.now() }).catch(() => {});
      }
    }

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
    const updatedProduct = mapProduct(r);
    logDev('UPDATE', { id, categoryId: updatedProduct.categoryId });

    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.map((p: any) =>
        String(p.id) === String(id) ? updatedProduct : p
      );
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    // Granular Category Cache Update: Update in-place across category caches without clearing all
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) {
        const catId = k.replace('products_cat_', '');
        const entry = memCache[k];
        if (entry?.data) {
          const belongs = (updatedProduct.categoryId === catId || updatedProduct.subcategoryId === catId);
          const exists = entry.data.some((p: any) => String(p.id) === String(id));
          if (belongs) {
            entry.data = exists
              ? entry.data.map((p: any) => String(p.id) === String(id) ? updatedProduct : p)
              : [updatedProduct, ...entry.data];
            localCache.set(k, { categoryId: catId, products: entry.data, lastSyncAt: Date.now() }).catch(() => {});
          } else if (exists) {
            entry.data = entry.data.filter((p: any) => String(p.id) !== String(id));
            localCache.set(k, { categoryId: catId, products: entry.data, lastSyncAt: Date.now() }).catch(() => {});
          }
        }
      }
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

    // Surgical Category Cache Update for bulk updates: update or invalidate only affected categories
    const idSetBulk = new Set(ids.map(String));
    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) {
        const catId = k.replace('products_cat_', '');
        const entry = memCache[k];
        if (entry?.data) {
          const hasAffected = entry.data.some((p: any) => idSetBulk.has(String(p.id)));
          if (hasAffected) {
            // Apply updates in-place to the category items
            entry.data = entry.data.map((p: any) => {
              if (idSetBulk.has(String(p.id))) {
                return {
                  ...p,
                  ...data,
                  size: { ...(p.size || {}), ...(data.size || {}) },
                  updatedAt: serverTime
                };
              }
              return p;
            });
            localCache.set(k, { categoryId: catId, products: entry.data, lastSyncAt: Date.now() }).catch(() => {});
          }
        }
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
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await supabase.from('products').delete().in('id', chunk);
      if (error) throw error;
    }
    
    // Surgical Cache Update: Remove deleted IDs from memory and local cache without clearing all
    const idSet = new Set(ids.map(String));
    logDev('DELETE', { count: ids.length });

    if (memCache['all_products']?.data) {
      memCache['all_products'].data = memCache['all_products'].data.filter((p: any) => !idSet.has(String(p.id)));
      localCache.set('all_products', memCache['all_products'].data).catch(() => {});
    }

    Object.keys(memCache).forEach(k => {
      if (k.startsWith('products_cat_')) {
        const catId = k.replace('products_cat_', '');
        const entry = memCache[k];
        if (entry?.data) {
          const hadDeleted = entry.data.some((p: any) => idSet.has(String(p.id)));
          if (hadDeleted) {
            entry.data = entry.data.filter((p: any) => !idSet.has(String(p.id)));
            localCache.set(k, { categoryId: catId, products: entry.data, lastSyncAt: Date.now() }).catch(() => {});
          }
        }
      }
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
