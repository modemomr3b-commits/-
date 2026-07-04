const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

// replace displayedCount logic with currentPage logic
code = code.replace(
  'const [displayedCount, setDisplayedCount] = useState(30);',
  'const [currentPage, setCurrentPage] = useState(1);\n  const itemsPerPage = 100;'
);

code = code.replace(
  /const filteredProductsAll = activeSub\s*\?\s*products\.filter\(\(p\) => p\.subcategoryId === activeSub\)\s*:\s*products;/m,
  `const filteredProductsAll = activeSub
    ? products.filter((p) => p.subcategoryId === activeSub)
    : products;
  
  // Pagination logic
  const totalPages = Math.ceil(filteredProductsAll.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredProducts = filteredProductsAll.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSub, categoryId]);`
);

// Remove the old slice
code = code.replace(
  /const filteredProducts = filteredProductsAll\.slice\(0, displayedCount\);/m,
  `// Pagination handled above`
);

// Remove scroll listener
code = code.replace(
  /useEffect\(\(\) => \{\n\s*const handleScrollForMore = \(\) => \{\n\s*if \(window\.innerHeight \+ window\.scrollY >= document\.documentElement\.scrollHeight - 1000\) \{\n\s*setDisplayedCount\(prev => prev \+ 20\);\n\s*\}\n\s*\};\n\s*window\.addEventListener\('scroll', handleScrollForMore\);\n\s*return \(\) => window\.removeEventListener\('scroll', handleScrollForMore\);\n\s*\}, \[\]\);/m,
  ''
);

const paginationUI = `
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 pb-8" dir="ltr">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => {
                setCurrentPage(pageNumber);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={\`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg transition-all \${
                currentPage === pageNumber 
                  ? 'bg-brq-gold text-black scale-110 shadow-[0_0_15px_rgba(255,215,0,0.4)]' 
                  : 'bg-white/5 text-white hover:bg-white/10'
              }\`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      )}
`;

code = code.replace(
  /\{filteredProducts\.length === 0 && !loading && \([\s\S]*?<\/div>\n\s*\)\}/m,
  `$&${paginationUI}`
);

fs.writeFileSync('src/components/member/Products.tsx', code);
