/**
 * Utility to distribute and shuffle products for regular users so newly added / activated 
 * products are evenly dispersed across all pages (Page 1, Page 2, Page 3, etc.)
 * rather than all clustering on Page 1, while keeping a consistent session seed
 * for stable pagination and back-and-forth navigation.
 */
export function shuffleProductsForUser<T = any>(products: T[], pageSize: number = 100): T[] {
  if (!products || products.length <= 1) return products;

  // 1. Maintain a persistent session seed so pagination doesn't jump or shuffle on every page switch
  let seedStr: string | null = null;
  try {
    seedStr = sessionStorage.getItem('brq_user_product_seed');
    if (!seedStr) {
      seedStr = Math.floor(Math.random() * 1000000).toString();
      sessionStorage.setItem('brq_user_product_seed', seedStr);
    }
  } catch {
    seedStr = '42891';
  }

  const seed = parseInt(seedStr || '42891', 10);

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

  const total = products.length;
  const numPages = Math.ceil(total / pageSize);

  // If there's only 1 page, simple deterministic shuffle is sufficient
  if (numPages <= 1) {
    return [...products].sort((a, b) => getHash(a) - getHash(b));
  }

  // 2. Sort by recency (newest / most recently created first) so we know which products are new
  const sortedByRecency = [...products].sort((a, b) => {
    const rawA = a as any;
    const rawB = b as any;
    const timeA = rawA?.createdAt ? new Date(rawA.createdAt).getTime() : 0;
    const timeB = rawB?.createdAt ? new Date(rawB.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return 0;
  });

  // 3. Create page buckets for Page 0, 1, 2, ..., (numPages - 1)
  const pageBuckets: T[][] = Array.from({ length: numPages }, () => []);
  const pageCapacities = Array.from({ length: numPages }, (_, idx) => {
    return idx === numPages - 1 ? total - (numPages - 1) * pageSize : pageSize;
  });

  // Calculate starting page offset based on seed so different user sessions get different starting pages
  const startOffset = Math.abs(seed) % numPages;

  // 4. Distribute products round-robin across all page buckets
  // This guarantees that newly created/activated items (at the top of sortedByRecency)
  // are split equally across Page 1, Page 2, Page 3, etc.
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
  // so new items are not just at the top of each page, but scattered smoothly throughout that page!
  for (let p = 0; p < numPages; p++) {
    pageBuckets[p].sort((a, b) => getHash(a, p * 7919) - getHash(b, p * 7919));
  }

  // 6. Flatten buckets back to single array
  return pageBuckets.flat();
}

