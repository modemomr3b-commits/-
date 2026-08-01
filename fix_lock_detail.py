import sys

def process():
    with open('src/components/member/ProductDetail.tsx', 'r') as f:
        content = f.read()

    # Import Lock
    if 'Lock' not in content:
        content = content.replace('Download, Share2', 'Download, Share2, Lock')
    
    # Add handleLock
    target_btn = """               <button
                 onClick={async () => {"""
    replacement_btn = """               {user?.role === 'admin' && (
                 <button
                   onClick={async () => {
                     try {
                       showToast("جاري القفل...", "loading");
                       await api.updateProduct(product.id!, { isHidden: true });
                       showToast("تم قفل المنتج بنجاح", "success");
                       navigate(-1);
                     } catch (error) {
                       console.error(error);
                       showToast("حدث خطأ أثناء قفل المنتج", "error");
                     }
                   }}
                   className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-red-500/50 hover:text-white transition-colors flex items-center justify-center"
                   title="قفل المنتج (للمسؤولين فقط)"
                 >
                    <Lock size={24} />
                 </button>
               )}
               <button
                 onClick={async () => {"""
    
    content = content.replace(target_btn, replacement_btn)
    
    with open('src/components/member/ProductDetail.tsx', 'w') as f:
        f.write(content)

process()
