import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update duplicatesSet calculation
    old_dups = """  const { duplicatesSet, modelMap } = useMemo(() => {
    const dups = new Set<string>();
    const map = new Map<string, string[]>();
    products.forEach(p => {
      const key = p.modelNumber || p.productCode;
      if (key) {
        if (map.has(key)) {
           dups.add(key);
           map.get(key)!.push(p.id!);
        } else {
           map.set(key, [p.id!]);
        }
      }
    });
    return { duplicatesSet: dups, modelMap: map };
  }, [products]);"""

    new_dups = """  const { duplicatesSet, modelMap } = useMemo(() => {
    const dups = new Set<string>();
    const map = new Map<string, string[]>();
    products.forEach(p => {
      if (p.isArchived || p.isHidden) return;
      const key = p.modelNumber || p.productCode;
      if (key) {
        if (map.has(key)) {
           dups.add(key);
           map.get(key)!.push(p.id!);
        } else {
           map.set(key, [p.id!]);
        }
      }
    });
    return { duplicatesSet: dups, modelMap: map };
  }, [products]);"""

    if old_dups in content:
        content = content.replace(old_dups, new_dups, 1)

    # 2. Update tabCounts.duplicates
    old_tab_dup = "      duplicates: products.filter(p => duplicatesSet.has(p.modelNumber || p.productCode)).length,"
    new_tab_dup = "      duplicates: products.filter(p => !p.isHidden && !p.isArchived && duplicatesSet.has(p.modelNumber || p.productCode)).length,"
    if old_tab_dup in content:
        content = content.replace(old_tab_dup, new_tab_dup, 1)

    # 3. Update filterStatus === 'duplicates' check
    old_filter_dup = """      } else if (filterStatus === 'duplicates') {
        // Only duplicates
        if (!duplicatesSet.has(p.modelNumber || p.productCode)) return false;"""

    new_filter_dup = """      } else if (filterStatus === 'duplicates') {
        // Only active duplicates
        if (p.isHidden || p.isArchived || !duplicatesSet.has(p.modelNumber || p.productCode)) return false;"""

    if old_filter_dup in content:
        content = content.replace(old_filter_dup, new_filter_dup, 1)

    with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Successfully updated duplicates logic in ProductManager.tsx")

main()
