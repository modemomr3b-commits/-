const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const functionRegex = /const handleShareSelected = async \(\) => \{/;

const newFunc = `const handleToggleLock = async (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await api.updateProduct(product.id!, { isLocked: true });
      showToast("تم النقل للمواد المقفلة بنجاح", "success");
      
      // Update local state to remove the locked product
      useStore.setState((state) => ({
        products: state.products.filter(p => p.id !== product.id)
      }));
    } catch (err) {
      console.error("Error locking product:", err);
      showToast("حدث خطأ أثناء نقل المنتج للمواد المقفلة", "error");
    }
  };

  const handleShareSelected = async () => {`;

code = code.replace(functionRegex, newFunc);
fs.writeFileSync('src/components/member/Products.tsx', code);
