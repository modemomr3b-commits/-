const fs = require('fs');
let code = fs.readFileSync('src/components/member/ProductDetail.tsx', 'utf8');

const anchorFunc = `useEffect(() => {`;

const handleToggleLock = `const handleToggleLock = async () => {
    if (!product) return;
    try {
      await api.updateProduct(product.id!, { isLocked: true });
      showToast("تم النقل للمواد المقفلة بنجاح", "success");
      
      // Update local state to remove the locked product
      useStore.setState((state) => ({
        products: state.products.filter(p => p.id !== product.id)
      }));
      
      navigate(-1);
    } catch (err) {
      console.error("Error locking product:", err);
      showToast("حدث خطأ أثناء نقل المنتج للمواد المقفلة", "error");
    }
  };

  useEffect(() => {`;

code = code.replace(anchorFunc, handleToggleLock);

const anchorBtn = `               <button 
                  onClick={(e) => {
                     e.stopPropagation();`;

const btnBlock = `{user?.role === 'admin' && (
               <button 
                  onClick={(e) => {
                     e.stopPropagation();
                     handleToggleLock();
                  }}
                  className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-purple-500 hover:border-purple-400 transition-colors flex items-center justify-center"
                  title="نقل للمواد المقفلة"
               >
                  <Lock size={24} />
               </button>
               )}
               <button 
                  onClick={(e) => {
                     e.stopPropagation();`;

code = code.replace(anchorBtn, btnBlock);

fs.writeFileSync('src/components/member/ProductDetail.tsx', code);
