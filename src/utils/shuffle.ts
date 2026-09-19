/**
 * Utility to distribute and shuffle products for regular users so newly added / activated 
 * products are evenly dispersed across all pages (Page 1, Page 2, Page 3, etc.)
 * rather than all clustering on Page 1, while keeping a consistent session seed
 * for stable pagination and back-and-forth navigation.
 */

export function shuffleProductsForUser<T = any>(
  products: T[], 
  pageSize: number = 40,
  subKey: string = 'default'
): T[] {
  if (!products || products.length <= 1) return products;

  // 1. Maintain a persistent session seed so pagination doesn't jump or reshuffle on navigation
  let baseSeedStr: string | null = null;
  try {
    baseSeedStr = sessionStorage.getItem('brq_user_product_seed');
    if (!baseSeedStr) {
      baseSeedStr = Math.floor(Math.random() * 1000000).toString();
      sessionStorage.setItem('brq_user_product_seed', baseSeedStr);
    }
  } catch {
    baseSeedStr = '42891';
  }

  // Combine session seed with subKey (e.g. category name)
  let subHash = 0;
  for (let i = 0; i < subKey.length; i++) {
    subHash = (Math.imul(31, subHash) + subKey.charCodeAt(i)) | 0;
  }
  const seed = (parseInt(baseSeedStr || '42891', 10) + subHash) | 0;

  // Deterministic seeded hash helper
  const getHash = (item: T, subSeed: number = 0) => {
    const raw = item as any;
    const key = (raw?.id || raw?.productCode || raw?.name || '') + '_' + (seed + subSeed);
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    return h;
  };

  const safePageSize = Math.max(1, pageSize);
  const total = products.length;
  const numPages = Math.ceil(total / safePageSize);

  // If all products fit on 1 single page, deterministic shuffle is sufficient
  if (numPages <= 1) {
    return [...products].sort((a, b) => getHash(a) - getHash(b));
  }

  // Helper to extract the most accurate timestamp for recency (creation, update, or activation)
  const getRecency = (item: any): number => {
    if (!item) return 0;
    const tUpdate = item.updatedAt
      ? (typeof item.updatedAt === 'string' ? new Date(item.updatedAt).getTime() : Number(item.updatedAt))
      : 0;
    const tCreate = item.createdAt
      ? (typeof item.createdAt === 'string' ? new Date(item.createdAt).getTime() : Number(item.createdAt))
      : 0;
    return Math.max(tUpdate || 0, tCreate || 0);
  };

  // 2. Sort all products strictly by recency (newest / most recently activated first)
  const sortedByRecency = [...products].sort((a, b) => {
    const timeA = getRecency(a);
    const timeB = getRecency(b);
    if (timeA !== timeB) return timeB - timeA;
    // Tie-breaker using item ID / Code to guarantee strict determinism
    const rawA = a as any;
    const rawB = b as any;
    const codeA = String(rawA?.productCode || rawA?.id || '');
    const codeB = String(rawB?.productCode || rawB?.id || '');
    return codeB.localeCompare(codeA);
  });

  // 3. Create page buckets for Page 0, 1, 2, ..., (numPages - 1)
  const pageBuckets: T[][] = Array.from({ length: numPages }, () => []);
  const pageCapacities = Array.from({ length: numPages }, (_, idx) => {
    return idx === numPages - 1 ? total - (numPages - 1) * safePageSize : safePageSize;
  });

  // Start round-robin offset starting at Page 1 (2nd human page) or staggered
  // to ensure Page 1 does NOT hoard the newest products, but distributes them
  // cleanly across Page 2, Page 3, and beyond first!
  const startOffset = ((Math.abs(seed) % (numPages - 1)) + 1) % numPages;

  // 4. Distribute products round-robin across all page buckets
  // This guarantees that newly created/activated items are split equally across
  // Page 1, Page 2, Page 3, etc., fulfilling the user requirement:
  // "اريد تتشر قسم بالصفحة الثانية قسم بالثالثة وهيج ماريد الجديد كلة يكون بالصفحة الأولى"
  for (let i = 0; i < sortedByRecency.length; i++) {
    const item = sortedByRecency[i];
    let targetPage = (i + startOffset) % numPages;

    // If target page is already full, find the next available page with capacity
    let tries = 0;
    while (pageBuckets[targetPage].length >= pageCapacities[targetPage] && tries < numPages) {
      targetPage = (targetPage + 1) % numPages;
      tries++;
    }

    pageBuckets[targetPage].push(item);
  }

  // 5. Shuffle the items INSIDE each page bucket deterministically
  // so new items are not grouped together at the top of any page, but smoothly scattered throughout
  for (let p = 0; p < numPages; p++) {
    pageBuckets[p].sort((a, b) => getHash(a, (p + 1) * 7919) - getHash(b, (p + 1) * 7919));
  }

  // 6. Flatten buckets back to single array corresponding to Page 1, Page 2, Page 3, etc.
  return pageBuckets.flat();
}
