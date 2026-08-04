import sys

def patch_searchpage():
    with open('src/components/member/SearchPage.tsx', 'r') as f:
        content = f.read()

    target = """    if (query) {
      const q = query.toLowerCase().trim().replace(/[-_]/g, '');
      matchesQuery = (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q));
    }"""

    replacement = """    if (query) {
      const searchWords = query.toLowerCase().trim().replace(/[-_]/g, '').split(/\s+/).filter(Boolean);
      matchesQuery = searchWords.every(word => {
        return (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(word)) ||
          (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').includes(word)) ||
          (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').includes(word)) ||
          (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').includes(word));
      });
    }"""
    if target in content:
        content = content.replace(target, replacement)
        with open('src/components/member/SearchPage.tsx', 'w') as f:
            f.write(content)
        print("Patched SearchPage.tsx")
    else:
        print("Target not found in SearchPage.tsx")

patch_searchpage()
