import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add recentlyModifiedRef near useState definitions
    target_state = "  const [aiStudioProduct, setAiStudioProduct] = useState<Product | null>(null);"
    ref_code = "  const recentlyModifiedRef = useRef<Record<string, number>>({});\n  const [aiStudioProduct, setAiStudioProduct] = useState<Product | null>(null);"

    if "recentlyModifiedRef" not in content:
        content = content.replace(target_state, ref_code, 1)

    # 2. Update loadData to protect recently modified products
    old_load = """      const prods = await api.getProducts();
      setProducts(
        prods
          .map((p: any) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
          }))
          .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)),
      );"""

    new_load = """      const prods = await api.getProducts();
      setProducts(prev => {
        const prevMap = new Map(prev.map(p => [p.id, p]));
        const now = Date.now();
        return prods
          .map((p: any) => {
            const mapped = {
              ...p,
              createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
            };
            const lastMod = recentlyModifiedRef.current[p.id];
            if (lastMod && (now - lastMod < 8000)) {
              const localProd = prevMap.get(p.id);
              if (localProd) {
                return {
                  ...mapped,
                  isArchived: localProd.isArchived,
                  isLocked: localProd.isLocked,
                  isHidden: localProd.isHidden,
                  isShowcase: localProd.isShowcase,
                };
              }
            }
            return mapped;
          })
          .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      });"""

    if old_load in content:
        content = content.replace(old_load, new_load, 1)

    # 3. Mark recently modified in handleToggleArchive, handleRestoreArchive, handleBulkRestoreArchive
    # Let's add recentlyModifiedRef.current[p.id] = Date.now(); inside handleToggleArchive and handleRestoreArchive
    
    archive_func = """  const handleToggleArchive = async (p: Product) => {
    if (p.isArchived) {
      return;
    }
    const updates: any = { isArchived: true, isShowcase: false, isLocked: true };
    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id 
          ? { ...prod, ...updates } 
          : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);"""

    archive_replacement = """  const handleToggleArchive = async (p: Product) => {
    if (p.isArchived) {
      return;
    }
    recentlyModifiedRef.current[p.id!] = Date.now();
    const updates: any = { isArchived: true, isShowcase: false, isLocked: true };
    // Optimistic update
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id 
          ? { ...prod, ...updates } 
          : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);"""

    if archive_func in content:
        content = content.replace(archive_func, archive_replacement, 1)

    restore_func = """  const handleRestoreArchive = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع المنتج "${p.name}" من المواد النافذة وإعادته؟`)) {
      return;
    }
    const updates: any = { isArchived: false, isLocked: false };"""

    restore_replacement = """  const handleRestoreArchive = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع المنتج "${p.name}" من المواد النافذة وإعادته؟`)) {
      return;
    }
    recentlyModifiedRef.current[p.id!] = Date.now();
    const updates: any = { isArchived: false, isLocked: false };"""

    if restore_func in content:
        content = content.replace(restore_func, restore_replacement, 1)

    with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Successfully updated ProductManager.tsx to prevent bounce!")

main()
