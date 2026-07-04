const fs = require('fs');

let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const anchor = `</div>
      )}

      {selectedIds.size > 0 && (`

const replacement = `</div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && filteredProducts.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-4 mb-16 pb-24" dir="ltr">
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

      {selectedIds.size > 0 && (`

if (code.includes(anchor)) {
    code = code.replace(anchor, replacement);
    fs.writeFileSync('src/components/member/Products.tsx', code);
    console.log("Pagination UI inserted successfully.");
} else {
    console.log("Could not find the anchor to insert pagination UI.");
}
