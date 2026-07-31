const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const anchor = `                      <CheckSquare size={16} />
                    </div>
                  </div>
                )}`;

const replacement = `                      <CheckSquare size={16} />
                    </div>
                  </div>
                )}
                
                {user?.role === 'admin' && (
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => handleToggleLock(e, product)}
                  >
                    <div className="w-8 h-8 rounded-md bg-black/50 border border-white/20 hover:border-purple-500 hover:text-purple-400 text-white/70 transition-colors flex items-center justify-center backdrop-blur-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]" title="نقل للمواد المقفلة">
                      <Lock size={16} />
                    </div>
                  </div>
                )}`;

code = code.replace(anchor, replacement);
fs.writeFileSync('src/components/member/Products.tsx', code);
