const fs = require('fs');

let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const oldModal = `{deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[200] backdrop-blur-sm">
          <div className="bg-brq-card border border-brq-border rounded-xl p-6 max-w-sm w-full relative overflow-hidden" dir="rtl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-700"></div>
            <h3 className="text-xl font-bold text-white mb-3">تأكيد الحذف</h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              {deleteConfirm.isBulk 
                ? \`هل أنت متأكد من حذف \${deleteConfirm.count} منتج بشكل نهائي؟\` 
                : \`هل أنت متأكد من حذف المنتج "\${deleteConfirm.name}" بشكل نهائي؟\`}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm"
              >
                إلغاء
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500 border border-red-500/50 hover:border-red-500 text-red-500 hover:text-white rounded-lg transition-all font-bold text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}`;

const newModal = `{deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border-2 border-red-500 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <Trash2 size={40} className="text-red-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
              تنبيه هام!
            </h3>
            <p className="text-gray-800 text-xl font-bold mb-8 leading-relaxed">
              {deleteConfirm.isBulk 
                ? \`هل أنت متأكد من حذف (\${deleteConfirm.count}) منتجات بشكل نهائي ولا يمكن التراجع؟\` 
                : \`هل أنت متأكد من حذف المنتج "\${deleteConfirm.name}" بشكل نهائي ولا يمكن التراجع؟\`}
            </p>
            
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-4 px-4 rounded-xl font-black text-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
              >
                نعم، احذف الموديل
              </button>
            </div>
          </motion.div>
        </div>
      )}`;

code = code.replace(oldModal, newModal);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
