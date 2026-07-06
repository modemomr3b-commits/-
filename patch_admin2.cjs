const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

code = code.replace(
  /<h3 className="text-lg font-bold mb-4 border-b border-white\/10 pb-2">\s*تعديل المنتج\s*<\/h3>/,
  `<h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">
              تعديل المنتج
            </h3>
            
            <div className="flex gap-4 mb-4 text-xs text-white/50 bg-black/20 p-3 rounded-lg border border-white/5">
              <div className="flex-1">
                <span className="block opacity-60 mb-1">تاريخ نزول المنتج:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.createdAt ? new Date(editingProduct.createdAt).toLocaleString('ar-IQ') : 'غير متوفر'}
                </span>
              </div>
              <div className="flex-1 border-r border-white/10 pr-4">
                <span className="block opacity-60 mb-1">تاريخ اخر تحديث:</span>
                <span className="font-mono text-white/90">
                  {editingProduct.updatedAt ? new Date(editingProduct.updatedAt).toLocaleString('ar-IQ') : (editingProduct.createdAt ? new Date(editingProduct.createdAt).toLocaleString('ar-IQ') : 'غير متوفر')}
                </span>
              </div>
            </div>`
);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
