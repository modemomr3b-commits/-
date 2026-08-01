import sys

def process():
    with open('src/components/member/SearchPage.tsx', 'r') as f:
        content = f.read()

    target_mount = """  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {"""
    
    replacement_mount = """  useEffect(() => {
    let mounted = true;
    
    // Restore search state if returning
    if (sessionStorage.getItem('return_search') === 'true') {
      const savedQuery = sessionStorage.getItem('return_search_query');
      if (savedQuery) {
        setSearchInput(savedQuery);
        setQuery(savedQuery);
      }
      setSearchArchived(sessionStorage.getItem('return_search_archived') === 'true');
    }
    
    const fetchProducts = async () => {"""
    
    content = content.replace(target_mount, replacement_mount)
    
    target_loading = """  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);"""
  
    replacement_loading = """  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!loading) {
      if (sessionStorage.getItem('return_search') === 'true') {
        const savedPage = sessionStorage.getItem('return_search_page');
        if (savedPage) setCurrentPage(parseInt(savedPage));
        
        const savedScroll = sessionStorage.getItem('return_search_scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 150);
        }
        
        sessionStorage.removeItem('return_search');
        sessionStorage.removeItem('return_search_page');
        sessionStorage.removeItem('return_search_scroll');
        sessionStorage.removeItem('return_search_query');
        sessionStorage.removeItem('return_search_archived');
      }
    }
  }, [loading]);"""
  
    content = content.replace(target_loading, replacement_loading)
    
    target_link = """                    <Link to={`/product/${p.id}`} state={{ product: p }} key={p.id} className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/5 relative group hover:border-brq-gold transition-colors">"""
    
    replacement_link = """                    <Link to={`/product/${p.id}`} state={{ product: p }} key={p.id} className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/5 relative group hover:border-brq-gold transition-colors"
                          onClick={() => {
                            sessionStorage.setItem('return_search', 'true');
                            sessionStorage.setItem('return_search_page', currentPage.toString());
                            sessionStorage.setItem('return_search_scroll', window.scrollY.toString());
                            sessionStorage.setItem('return_search_query', searchInput);
                            sessionStorage.setItem('return_search_archived', searchArchived.toString());
                          }}>"""
                          
    content = content.replace(target_link, replacement_link)
    
    with open('src/components/member/SearchPage.tsx', 'w') as f:
        f.write(content)

process()
