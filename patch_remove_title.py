import sys
import os

def patch_file(filepath, old, new):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

patch_file('src/components/member/ProductDetail.tsx', 
'''                           await navigator.share({
                             files: [file],
                             title: product.name,
                           });''', 
'''                           await navigator.share({
                             files: [file]
                           });''')

patch_file('src/components/member/Products.tsx', 
'''           await navigator.share({
             files: [file],
             title: p.name,
           });''', 
'''           await navigator.share({
             files: [file]
           });''')

patch_file('src/components/member/Cart.tsx', 
'''                await navigator.share({
                    files: filesArray,
                    title: 'طلب جديد',
                    text,
                });''', 
'''                await navigator.share({
                    files: filesArray,
                    text,
                });''')
                
print("Patched")
