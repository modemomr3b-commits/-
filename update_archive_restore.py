import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add handleRestoreArchive and handleBulkRestoreArchive after handleToggleArchive
    target_func = """  const handleToggleArchive = async (p: Product) => {
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
      await api.updateProduct(p.id!, updates);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تغيير حالة المنتج");
    }
  };"""

    added_funcs = """  const handleToggleArchive = async (p: Product) => {
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
      await api.updateProduct(p.id!, updates);
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      const updated = await api.getProducts();
      setProducts(updated);
      setAlertMessage("فشل تغيير حالة المنتج");
    }
  };

  const handleRestoreArchive = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع المنتج "${p.name}" من المواد النافذة وإعادته؟`)) {
      return;
    }
    const updates: any = { isArchived: false };
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
    const updates = { isArchived: false };
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
  };"""

    if target_func in content:
        content = content.replace(target_func, added_funcs)
    else:
        print("Warning: target_func for archive not found exact")

    # 2. Replace bulk archived message with restore button
    old_bulk_msg = """                  {selectedIds.size > 0 && filterStatus === 'archived' && (
                    <div className="text-xs text-red-400 font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                      المواد النافذة لا يمكن استرجاعها نهائياً
                    </div>
                  )}"""

    new_bulk_btn = """                  {selectedIds.size > 0 && filterStatus === 'archived' && (
                    <button
                      onClick={handleBulkRestoreArchive}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-lg text-sm hover:bg-orange-500/30 transition-colors font-bold whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                      استرجاع المحدد من المواد النافذة
                    </button>
                  )}"""

    if old_bulk_msg in content:
        content = content.replace(old_bulk_msg, new_bulk_btn)

    # 3. Replace single archive button
    old_btn = """                            <button
                              type="button"
                              disabled={p.isArchived}
                              onClick={() => handleToggleArchive(p)}
                              className={`p-1.5 rounded transition-colors ${p.isArchived ? 'opacity-50 cursor-not-allowed text-red-400' : 'hover:bg-yellow-500/20 text-yellow-400'}`}
                              title={
                                p.isArchived
                                  ? "المواد النافذة (لا يمكن استرجاعها نهائياً)"
                                  : "نقل مباشر إلى المواد النافذة"
                              }
                            >
                              <Package size={16} />
                            </button>"""

    new_btn = """                            <button
                              type="button"
                              onClick={() => {
                                if (p.isArchived) {
                                  handleRestoreArchive(p);
                                } else {
                                  handleToggleArchive(p);
                                }
                              }}
                              className={`p-1.5 rounded transition-colors cursor-pointer ${
                                p.isArchived 
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30' 
                                  : 'hover:bg-yellow-500/20 text-yellow-400'
                              }`}
                              title={
                                p.isArchived
                                  ? "استرجاع من المواد النافذة"
                                  : "نقل مباشر إلى المواد النافذة"
                              }
                            >
                              <Package size={16} />
                            </button>"""

    if old_btn in content:
        content = content.replace(old_btn, new_btn)

    with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Successfully updated ProductManager.tsx for archive restore with confirmation")

main()
