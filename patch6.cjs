const fs = require('fs');
let code = fs.readFileSync('src/components/admin/BatchProductUpload.tsx', 'utf8');

code = code.replace(
  /const val = e\.target\.value;\s*const num = parseInt\(val\) \|\| 12;\s*handlePriceAndPackaging\(/,
  `const val = e.target.value;
                    const num = product.piecesCount || 12;
                    handlePriceAndPackaging(`
);

// Add piecesCount input below the select
code = code.replace(
  /<select\n                  value=\{product\.forceStandardCrush \? 'yes' : 'no'\}[\s\S]*?<\/select>\n              <\/div>/,
  `$&
              {!product.forceStandardCrush && (
                <div>
                  <label className="text-[10px] text-white/50 block mb-0.5">عدد القطع</label>
                  <input
                    type="number"
                    value={product.piecesCount || ""}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      handlePriceAndPackaging(
                        idx,
                        product.dozenPriceUsd || 0,
                        product.packaging || '',
                        num,
                        product.forceStandardCrush
                      );
                    }}
                    className="w-full bg-white border border-black rounded-lg px-2 py-1.5 text-xs focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>
              )}`
);

fs.writeFileSync('src/components/admin/BatchProductUpload.tsx', code);
