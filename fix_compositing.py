import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    old_block = """          const shoeImg = new Image();
          shoeImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            shoeImg.onload = resolve;
            shoeImg.onerror = reject;
            shoeImg.src = currentImg;
          });"""

    new_block = """          let shoeSrc = currentImg;
          if (!shoeSrc.startsWith('data:')) {
            try {
              const shoeRes = await fetch(currentImg);
              const shoeBlob = await shoeRes.blob();
              shoeSrc = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(shoeBlob);
              });
            } catch (e) {
              console.warn('Could not convert shoe image to base64, using direct src:', e);
            }
          }

          const shoeImg = new Image();
          await new Promise((resolve, reject) => {
            shoeImg.onload = resolve;
            shoeImg.onerror = reject;
            shoeImg.src = shoeSrc;
          });"""

    if old_block in content:
        content = content.replace(old_block, new_block)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully fixed compositing in ProductManager.tsx")
    else:
        print("old_block not found in ProductManager.tsx")

main()
