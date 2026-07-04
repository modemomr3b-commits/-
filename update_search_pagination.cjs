const fs = require('fs');
let code = fs.readFileSync('src/components/member/SearchPage.tsx', 'utf8');

if (!code.includes('currentPage')) {
  // Add state
  code = code.replace(
    'const [query, setQuery] = useState(\'\');',
    `const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;`
  );

  // Add pagination logic
  code = code.replace(
    /const filteredProducts = products\.filter\(p => \{[\s\S]*?\}\);/,
    `const filteredProductsAll = products.filter(p => {
    if (p.isHidden) return false;
    
    if (!query) return false; 
    const q = query.toLowerCase().trim().replace(/[-_]/g, '');
    if (searchArchived) {
      if (!p.isArchived) return false;
      return (
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q))
      );
    } else {
      if (p.isArchived) return false;
      return (
        (p.name && p.name.toLowerCase().replace(/[-_]/g, '').includes(q)) ||
        (p.productCode && p.productCode.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.modelNumber && p.modelNumber.toLowerCase().replace(/[-_]/g, '').startsWith(q)) ||
        (p.barcode && p.barcode.toLowerCase().replace(/[-_]/g, '').startsWith(q))
      );
    }
  });

  const totalPages = Math.ceil(filteredProductsAll.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const filteredProducts = filteredProductsAll.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, searchArchived]);`
  );

  // Add pagination UI at the bottom
  const paginationUI = `
               </div>
               
               {/* Pagination Controls */}
               {totalPages > 1 && (
                 <div className="flex flex-wrap justify-center items-center gap-2 mt-8 pb-12" dir="ltr">
                   {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                     <button
                       key={pageNumber}
                       onClick={() => {
                         setCurrentPage(pageNumber);
                         window.scrollTo({ top: 0, behavior: 'smooth' });
                       }}
                       className={\`w-12 h-12 flex items-center justify-center rounded-xl font-bold text-lg transition-all \${
                         currentPage === pageNumber 
                           ? 'bg-brq-gold text-black scale-110 shadow-[0_0_15px_rgba(255,215,0,0.4)] border-2 border-yellow-300' 
                           : 'bg-brq-card border border-brq-border text-white hover:bg-white/10'
                       }\`}
                     >
                       {pageNumber}
                     </button>
                   ))}
                 </div>
               )}
             )}
           </div>`;
           
  // In SearchPage, the grid closing div is inside the conditional render
  // Let's replace the end of the return statement
  code = code.replace(
    /<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<\/div>/,
    paginationUI + '\n        </div>'
  );

  fs.writeFileSync('src/components/member/SearchPage.tsx', code);
  console.log("Updated SearchPage");
} else {
  console.log("SearchPage already has pagination");
}
