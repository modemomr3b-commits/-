const fs = require('fs');
let code = fs.readFileSync('src/components/member/SearchPage.tsx', 'utf8');

const idx = code.indexOf('{/* Pagination Controls */}');
code = code.substring(0, idx) + `{/* Pagination Controls */}
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
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/components/member/SearchPage.tsx', code);
