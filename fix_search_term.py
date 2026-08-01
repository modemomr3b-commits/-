import sys

def process():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    target_memo = """  const filteredProductsAll = useMemo(() => activeSub
    ? products.filter((p) => p.subcategoryId === activeSub)
    : products, [activeSub, products]);"""
    
    replacement_memo = """  const filteredProductsAll = useMemo(() => {
    let result = products;
    if (activeSub) {
      result = result.filter((p) => p.subcategoryId === activeSub);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim().replace(/[-_]/g, '');
      result = result.filter((p) => {
        return (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(q)) ||
               (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
               (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
               (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q));
      });
    }
    return result;
  }, [activeSub, products, searchTerm]);"""
  
    content = content.replace(target_memo, replacement_memo)
    
    target_effect = """  // Only reset if they manually change sub category AFTER loading
  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      setTimeout(() => window.scrollTo(0, 0), 50);
    }
  }, [activeSub]);"""
  
    content = content.replace(target_effect, "")
    
    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

process()
