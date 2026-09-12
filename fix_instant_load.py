import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Import localCache if not imported
    if "localCache" not in content:
        content = "import { localCache } from '../../utils/localCache';\n" + content

    old_init = """  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const initialLoad = async () => {
      await loadData();
      if (mounted) setLoading(false);
    };
    initialLoad();"""

    new_init = """  useEffect(() => {
    let mounted = true;
    let fetchTimeout: any;
    const initialLoad = async () => {
      // 1. Instantly load from local cache for 0ms delay display
      try {
        const cached = await localCache.get<any[]>('all_products', Infinity);
        if (cached && cached.length > 0 && mounted && products.length === 0) {
          const mappedCached = cached.map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          })).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          setProducts(mappedCached);
          setLoading(false);
        }
      } catch {}

      // 2. Fetch fresh data in background
      await loadData();
      if (mounted) setLoading(false);
    };
    initialLoad();"""

    if old_init in content:
        content = content.replace(old_init, new_init, 1)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully updated ProductManager.tsx for instant stale-while-revalidate load")
    else:
        print("Could not find old_init pattern")

main()
