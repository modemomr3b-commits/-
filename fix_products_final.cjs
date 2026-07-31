const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const regexToReplace = /<ShareDialog[\s\S]*/;

const finalRender = `<ShareDialog
        readyToShareFiles={readyToShareFiles}
        shareChunks={shareChunks}
        onClose={() => {
           setReadyToShareFiles(null);
           setShareChunks(null);
        }}
        showToast={showToast}
      />
      {initialLoading ? (
        <div className="flex-1 flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-brq-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-white/50 p-8 text-center h-64">
          <Layers size={48} className="mb-4 opacity-20" />
          <p>لا توجد منتجات في هذا القسم</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-24">
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <Link 
                to={\`/products/\${product.id}\`}
                key={product.id} 
                className={\`bg-white/5 rounded-xl border \${selectedIds.has(product.id!) ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'} overflow-hidden hover:bg-white/10 transition-colors relative block\`}
              >
                {isSelectionMode && (
                  <div 
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSelection(product.id!);
                    }}
                  >
                    <div className={\`w-6 h-6 rounded-md flex items-center justify-center border transition-colors \${
                      selectedIds.has(product.id!) 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-black/50 border-white/30 text-transparent hover:border-white/60'
                    }\`}>
                      <CheckSquare size={16} />
                    </div>
                  </div>
                )}
                
                {product.finalImageUrl ? (
                  <div className="aspect-square relative">
                    <OptimizedImage
                      src={product.finalImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="aspect-square bg-white/5 flex items-center justify-center relative">
                    <ImageIcon size={32} className="text-white/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  </div>
                )}
                <div className="p-2 absolute bottom-0 left-0 right-0">
                  <div className="text-xs text-brq-gold font-bold mb-1 truncate">{product.productCode}</div>
                  <h3 className="font-bold text-white text-xs line-clamp-1 truncate">{product.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

code = code.replace(regexToReplace, finalRender);
fs.writeFileSync('src/components/member/Products.tsx', code);
