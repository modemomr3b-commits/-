/**
 * Utility to shuffle products for regular users so newly activated products 
 * appear scattered randomly ("بطشرات") instead of always at the top,
 * while keeping a consistent session seed for clean pagination.
 */
export function shuffleProductsForUser<T extends { id?: string; productCode?: string }>(products: T[]): T[] {
  if (!products || products.length <= 1) return products;

  let seedStr = sessionStorage.getItem('brq_user_product_seed');
  if (!seedStr) {
    seedStr = Math.floor(Math.random() * 1000000).toString();
    sessionStorage.setItem('brq_user_product_seed', seedStr);
  }

  const seed = parseInt(seedStr, 10);

  const getHash = (item: T) => {
    const key = (item.id || item.productCode || '') + '_' + seed;
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
    return h;
  };

  return [...products].sort((a, b) => getHash(a) - getHash(b));
}
