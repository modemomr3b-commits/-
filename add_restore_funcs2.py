import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    target = "  const handleToggleArchive = async (p: Product) => {"
    
    restore_code = """  const handleRestoreArchive = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع المنتج "${p.name}" من المواد النافذة وإعادته؟`)) {
      return;
    }
    const updates: any = { isArchived: false, isLocked: false };
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === p.id 
          ? { ...prod, ...updates } 
          : prod
      )
    );
    try {
      await api.updateProduct(p.id!, updates);
      setAlertMessage("تم استرجاع المنتج بنجاح");
    } catch (e) {
      console.error(e);
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل استرجاع المنتج");
    }
  };

  const handleBulkRestoreArchive = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`هل أنت متأكد من استرجاع ${selectedIds.size} منتج من المواد النافذة؟`)) {
      return;
    }
    setIsSubmitting(true);
    const updates = { isArchived: false, isLocked: false };
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.updateProduct(id, updates))
      );
      setProducts(prev => prev.map(p => selectedIds.has(p.id!) ? { ...p, ...updates } : p));
      setSelectedIds(new Set());
      setAlertMessage(`تم استرجاع ${selectedIds.size} منتج بنجاح`);
    } catch (e) {
      console.error(e);
      setAlertMessage("حدث خطأ أثناء استرجاع المنتجات المحددة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (p: Product) => {"""

    if target in content and "handleRestoreArchive" not in content:
        content = content.replace(target, restore_code, 1)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully added restore functions!")
    else:
        print("Already present or target not found")

main()
