import sys

def patch_products():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    # Replace itemsPerPage
    content = content.replace("const itemsPerPage = 24;", "const itemsPerPage = 100;")

    # Replace Link onClick
    target_link = """            <Link to={`/product/${p.id}`} state={{ product: p }}
              key={p.id}
              className={`glass-card rounded-2xl overflow-hidden flex flex-col border relative group transition-colors shadow-lg ${
                selectedIds.has(p.id!) ? "border-blue-500 bg-blue-500/10" : "border-white/5 hover:border-brq-gold"
              }`}
              onClick={(e) => {
                if (isSelectionMode) {
                  toggleSelection(e, p.id!);
                }
              }}
            >"""
            
    replacement_link = """            <Link to={`/product/${p.id}`} state={{ product: p }}
              key={p.id}
              className={`glass-card rounded-2xl overflow-hidden flex flex-col border relative group transition-colors shadow-lg ${
                selectedIds.has(p.id!) ? "border-blue-500 bg-blue-500/10" : "border-white/5 hover:border-brq-gold"
              }`}
              onClick={(e) => {
                if (isSelectionMode) {
                  toggleSelection(e, p.id!);
                  return;
                }
                sessionStorage.setItem('return_category', categoryId || 'all');
                sessionStorage.setItem('return_page', currentPage.toString());
                sessionStorage.setItem('return_searchTerm', searchTerm);
                if (activeSub) sessionStorage.setItem('return_sub', activeSub);
                sessionStorage.setItem('return_scroll', window.scrollY.toString());
              }}
            >"""

    if target_link in content:
        content = content.replace(target_link, replacement_link)
        print("Patched Link in Products.tsx")
    else:
        print("Link target not found in Products.tsx")

    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

patch_products()
