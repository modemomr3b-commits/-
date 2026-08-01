import sys

def process():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    target_effect = """  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll_${categoryId || 'all'}`, window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categoryId]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const savedScroll = sessionStorage.getItem(`scroll_${categoryId || 'all'}`);
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
      }, 0);
    }
  }, [loading, categoryId]);"""
  
    replacement_effect = """  useEffect(() => {
    if (!loading) {
      const returnCat = sessionStorage.getItem('return_category');
      if (returnCat === (categoryId || 'all')) {
        const savedPage = sessionStorage.getItem('return_page');
        if (savedPage) setCurrentPage(parseInt(savedPage));
        
        const savedSub = sessionStorage.getItem('return_sub');
        if (savedSub) setActiveSub(savedSub);
        
        const savedScroll = sessionStorage.getItem('return_scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
        
        sessionStorage.removeItem('return_category');
        sessionStorage.removeItem('return_page');
        sessionStorage.removeItem('return_scroll');
        sessionStorage.removeItem('return_sub');
      } else {
        setCurrentPage(1);
        setActiveSub(null);
        setTimeout(() => window.scrollTo(0, 0), 50);
      }
    }
  }, [loading, categoryId]);"""
  
    content = content.replace(target_effect, replacement_effect)
    
    # Reset page effect
    target_reset = """  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSub, categoryId]);"""
  
    # Remove it because we handle it in the loading effect and we don't want it resetting when we restore activeSub
    # But wait, if they MANUALLY click a sub category, we DO want to reset to page 1!
    replacement_reset = """  // Only reset if they manually change sub category AFTER loading
  useEffect(() => {
    if (!loading) {
      setCurrentPage(1);
      setTimeout(() => window.scrollTo(0, 0), 50);
    }
  }, [activeSub]);"""
  
    content = content.replace(target_reset, replacement_reset)
    
    # Intercept link click
    target_link = """              onClick={(e) => {
                if (isSelectionMode) {
                  e.preventDefault();
                  toggleSelection(e, p.id!);
                }
              }}"""
              
    replacement_link = """              onClick={(e) => {
                if (isSelectionMode) {
                  e.preventDefault();
                  toggleSelection(e, p.id!);
                } else {
                  sessionStorage.setItem('return_category', categoryId || 'all');
                  sessionStorage.setItem('return_page', currentPage.toString());
                  if (activeSub) sessionStorage.setItem('return_sub', activeSub);
                  sessionStorage.setItem('return_scroll', window.scrollY.toString());
                }
              }}"""
              
    # Note: there might be a toggleSelection call without e.preventDefault() if my grep was exact
    # Let's check exactly what the onClick is.
    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

process()
