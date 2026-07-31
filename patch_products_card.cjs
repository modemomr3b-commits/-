const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const regex = /<Link\s+to=\{`\/products\/\$\{product\.id\}`\}[\s\S]*?<\/Link>/g;

const replacement = `<div
                key={product.id} 
                className={\`bg-[#0B1120] rounded-xl border \${selectedIds.has(product.id!) ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-white/10'} overflow-hidden relative flex flex-col h-full\`}
              >
                <Link to={\`/products/\${product.id}\`} className="block relative">
                  {isSelectionMode && (
                    <div 
                      className="absolute top-2 right-2 z-20"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSelection(e, product.id!);
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

                  <div className="aspect-[4/5] relative bg-white/5">
                    {product.finalImageUrl ? (
                      <OptimizedImage
                        src={product.finalImageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                         <ImageIcon size={32} />
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 flex flex-col gap-2 z-10" onClick={(e) => e.preventDefault()}>
                      <button 
                         onClick={(e) => handleShareSingle(e, product)}
                         className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:bg-white/20 text-white transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                         title="مشاركة"
                      >
                         <Share2 size={16} />
                      </button>
                      <button 
                         onClick={(e) => handleDownloadSingle(e, product)}
                         className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:bg-white/20 text-white transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                         title="تحميل"
                      >
                         {downloadingId === product.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={(e) => handleToggleLock(e, product)}
                          className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:border-purple-500 hover:text-purple-400 text-white/70 transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                          title="نقل للمواد المقفلة"
                        >
                          <Lock size={16} />
                        </button>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 bg-white/90 text-black text-[10px] font-bold p-1 px-2 rounded text-center leading-tight shadow-md max-w-[60%]">
                      <div className="truncate">{product.productCode}</div>
                      <div className="truncate">{product.packaging || '18 PRS'}</div>
                      <div className="truncate">{product.modelNumber || '25-30'}</div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-[#D4AF37]/90 backdrop-blur text-black flex items-center justify-between px-1.5 py-1 text-[8px] font-bold">
                      <div className="flex flex-col flex-1">
                         <span className="truncate">التعبئة: {product.piecesCount || 12}</span>
                         <span className="truncate">سعر المفرد: {product.price?.toLocaleString() || '---'} د.ع</span>
                      </div>
                      <div className="text-center font-black text-[10px] text-black/80 px-1">BRQ</div>
                      <div className="flex flex-col flex-1 items-end text-left">
                         <span className="truncate">الكود: {product.productCode}</span>
                         <span className="truncate">الجملة: {(product.price && product.piecesCount) ? (product.price * product.piecesCount).toLocaleString() : '---'} د.ع</span>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-3 flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="bg-white/10 px-2 py-1 rounded text-white/70 text-xs font-mono shrink-0">{product.productCode}</div>
                    <h3 className="font-bold text-white text-sm text-right leading-tight line-clamp-2" style={{ wordBreak: 'break-word' }}>{product.name}</h3>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[10px] text-white/50 mb-0.5">الكمية/القطع</span>
                      <span className="text-white font-bold">{product.piecesCount || '---'}</span>
                    </div>
                    <div className="flex flex-col text-right truncate">
                      <span className="text-[10px] text-white/50 mb-0.5">د.ع / الجملة</span>
                      <span className="text-brq-gold font-bold text-lg truncate">{(product.price && product.piecesCount) ? (product.price * product.piecesCount).toLocaleString() : '---'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-auto">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[9px] text-white/50 mb-0.5">آخر تحديث</span>
                      <span className="text-[10px] text-white/70">{formatDate(product.updatedAt || product.createdAt)}</span>
                    </div>
                    <div className="flex flex-col text-right shrink-0">
                      <span className="text-[9px] text-white/50 mb-0.5">تاريخ النزول</span>
                      <span className="text-[10px] text-white/70">{formatDate(product.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 mt-auto">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart(product, 1);
                      showToast("تم إضافة المنتج للسلة", "success");
                    }}
                    className="w-full py-2 bg-[#1E3A8A] hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-colors shadow-[0_4px_10px_rgba(30,58,138,0.4)] text-sm"
                  >
                    <ShoppingCart size={16} />
                    <span>إضافة</span>
                  </button>
                </div>
              </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/member/Products.tsx', code);
