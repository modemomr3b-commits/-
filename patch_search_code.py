import sys

def patch():
    with open('src/components/member/SearchPage.tsx', 'r') as f:
        content = f.read()

    old_logic = """    const rawQuery = query.toLowerCase().trim();
    const exactCodeMatches = result.filter(p => p.productCode && p.productCode.toLowerCase().trim() === rawQuery);
    
    if (exactCodeMatches.length > 0) {
      result = exactCodeMatches;
    } else {
      const searchWords = rawQuery.replace(/[-_]/g, '').split(/\\s+/).filter(Boolean);
      result = result.filter(p => {
        let catName = '';
        let subCatName = '';
        if (p.categoryId) {
          const cat = allCategories.find(c => c.id === p.categoryId);
          if (cat) catName = cat.name;
        }
        if (p.subcategoryId) {
          const sub = allCategories.find(c => c.id === p.subcategoryId);
          if (sub) subCatName = sub.name;
        }
        const fullText = [p.name, p.productCode, p.modelNumber, p.barcode, catName, subCatName].filter(Boolean).join(' ').toLowerCase().replace(/[-_]/g, '');
        return searchWords.every(word => fullText.includes(word));
      });
    }"""

    new_logic = """    const rawQuery = query.toLowerCase().trim();
    
    const exactCodeMatches = result.filter(p => 
      (p.productCode && p.productCode.toLowerCase().trim() === rawQuery) ||
      (p.barcode && p.barcode.toLowerCase().trim() === rawQuery) ||
      (p.modelNumber && p.modelNumber.toLowerCase().trim() === rawQuery)
    );
    
    if (exactCodeMatches.length > 0) {
      result = exactCodeMatches;
    } else {
      const isCodeSearch = /^[\\d\\w\\-]+$/.test(rawQuery) && /\\d/.test(rawQuery);
      const partialCodeMatches = result.filter(p => 
        (p.productCode && p.productCode.toLowerCase().includes(rawQuery)) ||
        (p.barcode && p.barcode.toLowerCase().includes(rawQuery)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().includes(rawQuery))
      );
      
      if (isCodeSearch && partialCodeMatches.length > 0) {
        result = partialCodeMatches;
      } else {
        const searchWords = rawQuery.replace(/[-_]/g, '').split(/\\s+/).filter(Boolean);
        result = result.filter(p => {
          let catName = '';
          let subCatName = '';
          if (p.categoryId) {
            const cat = allCategories.find(c => c.id === p.categoryId);
            if (cat) catName = cat.name;
          }
          if (p.subcategoryId) {
            const sub = allCategories.find(c => c.id === p.subcategoryId);
            if (sub) subCatName = sub.name;
          }
          const fullText = [p.name, p.productCode, p.modelNumber, p.barcode, catName, subCatName].filter(Boolean).join(' ').toLowerCase().replace(/[-_]/g, '');
          return searchWords.every(word => fullText.includes(word));
        });
      }
    }"""

    content = content.replace(old_logic, new_logic)

    with open('src/components/member/SearchPage.tsx', 'w') as f:
        f.write(content)

patch()
