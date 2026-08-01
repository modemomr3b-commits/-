import sys

def process():
    with open('src/components/member/Cart.tsx', 'r') as f:
        content = f.read()

    target = """                        const response = await fetch(url);
                        const blob = await response.blob();
                        const extension = blob.type.split('/')[1] || 'jpeg';
                        filesArray.push(new File([blob], `product-${cart[i].product.productCode || i+1}.${extension}`, { type: blob.type }));"""
                        
    replacement = """                        const response = await fetch(url);
                        const blob = await response.blob();
                        let type = blob.type;
                        if (!type || !type.startsWith('image/')) type = 'image/jpeg';
                        const extension = type.split('/')[1] || 'jpeg';
                        filesArray.push(new File([blob], `product-${cart[i].product.productCode || i+1}.${extension}`, { type }));"""
                        
    content = content.replace(target, replacement)
    
    with open('src/components/member/Cart.tsx', 'w') as f:
        f.write(content)

process()
