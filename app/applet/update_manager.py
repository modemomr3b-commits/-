with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update proceedUpdate
old_update_logic = """    const wasInactive = originalProduct && (originalProduct.isHidden || originalProduct.isArchived);
    const isNowActive = !payloadToUpdate.isHidden && !payloadToUpdate.isArchived;
    const autoShowcaseCat = (wasInactive && isNowActive)
      ? (payloadToUpdate.showcaseCategory || detectShowcaseCategory(payloadToUpdate, categories) || 'عام')
      : payloadToUpdate.showcaseCategory;
    const fullUpdatedProduct = {
      ...payloadToUpdate,
      ...(wasInactive && isNowActive ? { isShowcase: true, showcaseCategory: autoShowcaseCat } : {}),
      finalImageUrl: finalImg,
      oldPriceInfo: oldPriceInfo
    };"""

new_update_logic = """    const wasInactive = originalProduct && originalProduct.isHidden;
    const isNowActive = !payloadToUpdate.isHidden && !originalProduct?.isArchived;
    const autoShowcaseCat = (wasInactive && isNowActive)
      ? (payloadToUpdate.showcaseCategory || detectShowcaseCategory(payloadToUpdate, categories) || 'عام')
      : payloadToUpdate.showcaseCategory;
    const fullUpdatedProduct = {
      ...payloadToUpdate,
      isArchived: originalProduct?.isArchived ? true : (payloadToUpdate.isArchived ?? false),
      ...(wasInactive && isNowActive ? { isShowcase: true, showcaseCategory: autoShowcaseCat } : {}),
      finalImageUrl: finalImg,
      oldPriceInfo: oldPriceInfo
    };"""

if old_update_logic in code:
    code = code.replace(old_update_logic, new_update_logic, 1)
    print("Successfully replaced proceedUpdate logic")
else:
    print("WARNING: old_update_logic not found")

# 2. Update handleRestoreArchive
old_restore = """  const handleRestoreArchive = async (p: Product) => {
    if (!window.confirm(`هل أنت متأكد من استرجاع المنتج "${p.name}" من المواد النافذة وإعادته؟`)) {
      return;
    }"""

new_restore = """  const handleRestoreArchive = async (p: Product) => {
    const pin = window.prompt(`🔒 استرجاع المنتج "${p.name}" من المواد النافذة:\\n\\nالرجاء إدخال الرمز السري للإرجاع (mode):`);
    if (pin !== 'mode') {
      if (pin !== null) {
        setAlertMessage("❌ الرمز السري غير صحيح! لا يمكن إرجاع المنتج النافذ.");
      }
      return;
    }"""

if old_restore in code:
    code = code.replace(old_restore, new_restore, 1)
    print("Successfully replaced handleRestoreArchive")
else:
    print("WARNING: old_restore not found")

# 3. Update handleBulkRestoreArchive
old_bulk_restore = """  const handleBulkRestoreArchive = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`هل أنت متأكد من استرجاع ${selectedIds.size} منتج من المواد النافذة؟`)) {
      return;
    }"""

new_bulk_restore = """  const handleBulkRestoreArchive = async () => {
    if (selectedIds.size === 0) return;
    const pin = window.prompt(`🔒 استرجاع ${selectedIds.size} منتج من المواد النافذة:\\n\\nالرجاء إدخال الرمز السري للإرجاع (mode):`);
    if (pin !== 'mode') {
      if (pin !== null) {
        setAlertMessage("❌ الرمز السري غير صحيح! لا يمكن إرجاع المنتجات النافذة.");
      }
      return;
    }"""

if old_bulk_restore in code:
    code = code.replace(old_bulk_restore, new_bulk_restore, 1)
    print("Successfully replaced handleBulkRestoreArchive")
else:
    print("WARNING: old_bulk_restore not found")

with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Done updating ProductManager.tsx")
