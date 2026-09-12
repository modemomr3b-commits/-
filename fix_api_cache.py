import sys

def main():
    with open('src/api.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update getProductsDirect
    old_get_prods = """  getProductsDirect: async () => {
    const mapProduct = (p: any) => ({"""

    new_get_prods = """  getProductsDirect: async () => {
    if (memCache['all_products']?.data?.length && (Date.now() - (memCache['all_products'].timestamp || 0) < 30000)) {
      return memCache['all_products'].data;
    }
    const mapProduct = (p: any) => ({"""

    if old_get_prods in content:
        content = content.replace(old_get_prods, new_get_prods, 1)

    # 2. Update getCategories
    old_get_cats = """  getCategories: async () => {
    const cacheKey = 'all_categories';"""

    new_get_cats = """  getCategories: async () => {
    const cacheKey = 'all_categories';
    if (memCache[cacheKey]?.data?.length && (Date.now() - (memCache[cacheKey].timestamp || 0) < 30000)) {
      return memCache[cacheKey].data;
    }"""

    if old_get_cats in content:
        content = content.replace(old_get_cats, new_get_cats, 1)

    with open('src/api.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Successfully updated api.ts with fast TTL cache")

main()
