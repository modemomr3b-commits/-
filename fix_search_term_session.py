import sys

def process():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    # In useEffect loading
    target_loading = """        const savedScroll = sessionStorage.getItem('return_scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
        
        sessionStorage.removeItem('return_category');"""
        
    replacement_loading = """        const savedScroll = sessionStorage.getItem('return_scroll');
        if (savedScroll) {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 100);
        }
        
        const savedSearch = sessionStorage.getItem('return_searchTerm');
        if (savedSearch) setSearchTerm(savedSearch);
        
        sessionStorage.removeItem('return_category');
        sessionStorage.removeItem('return_searchTerm');"""
        
    content = content.replace(target_loading, replacement_loading)
    
    # In onClick
    target_link = """                  if (activeSub) sessionStorage.setItem('return_sub', activeSub);
                  sessionStorage.setItem('return_scroll', window.scrollY.toString());
                }
              }}"""
              
    replacement_link = """                  if (activeSub) sessionStorage.setItem('return_sub', activeSub);
                  if (searchTerm) sessionStorage.setItem('return_searchTerm', searchTerm);
                  sessionStorage.setItem('return_scroll', window.scrollY.toString());
                }
              }}"""
              
    content = content.replace(target_link, replacement_link)
    
    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

process()
