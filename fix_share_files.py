import sys

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # handleShareSelected
    target1 = """          const res = await fetch(imgUrl);
          const blob = await res.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          files.push(new File([blob], filename, { type: blob.type }));"""
          
    replacement1 = """          const res = await fetch(imgUrl);
          const blob = await res.blob();
          let type = blob.type;
          if (!type || !type.startsWith('image/')) type = 'image/jpeg';
          const ext = type.split("/")[1] || "jpg";
          const safeName = (p.productCode || p.name || "product").replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
          const filename = `${safeName}.${ext}`;
          files.push(new File([blob], filename, { type }));"""
          
    content = content.replace(target1, replacement1)
    
    # handleShareSingle
    target2 = """      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      const file = new File([blob], filename, { type: blob.type });"""
      
    replacement2 = """      const res = await fetch(imgUrl);
      const blob = await res.blob();
      let type = blob.type;
      if (!type || !type.startsWith('image/')) type = 'image/jpeg';
      const ext = type.split("/")[1] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      const file = new File([blob], filename, { type });"""
      
    content = content.replace(target2, replacement2)
    
    # ProductDetail share
    target3 = """                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      const ext = blob.type.split("/")[1] || "jpg";
                      const safeName = (product.productCode || product.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
                      const filename = `${safeName}.${ext}`;
                      const file = new File([blob], filename, { type: blob.type });"""
                      
    replacement3 = """                      const res = await fetch(imgUrl);
                      const blob = await res.blob();
                      let type = blob.type;
                      if (!type || !type.startsWith('image/')) type = 'image/jpeg';
                      const ext = type.split("/")[1] || "jpg";
                      const safeName = (product.productCode || product.name || "product").replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
                      const filename = `${safeName}.${ext}`;
                      const file = new File([blob], filename, { type });"""
                      
    content = content.replace(target3, replacement3)
    
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/member/Products.tsx')
process_file('src/components/member/ProductDetail.tsx')

