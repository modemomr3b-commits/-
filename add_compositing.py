import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to wrap the generatedImgUrl with a canvas compositing step
    target_code = """        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data?.imageUrl) {
              generatedImgUrl = data.imageUrl;
            }
          }
        }"""

    composite_code = """        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data?.imageUrl) {
              generatedImgUrl = data.imageUrl;
            }
          }
        }

      // Professional Canvas Compositing to guarantee 100% shoe fidelity on top of the luxury background
      if (generatedImgUrl) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            bgImg.onload = resolve;
            bgImg.onerror = reject;
            bgImg.src = generatedImgUrl;
          });

          const shoeImg = new Image();
          shoeImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            shoeImg.onload = resolve;
            shoeImg.onerror = reject;
            shoeImg.src = currentImg;
          });

          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 1000;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw luxury background
            ctx.drawImage(bgImg, 0, 0, 1000, 1000);

            // Draw shadow for realism
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 25;

            // Draw product shoe in the center with proper scaling
            const maxW = 600;
            const maxH = 600;
            let w = shoeImg.width || 500;
            let h = shoeImg.height || 500;
            const ratio = Math.min(maxW / w, maxH / h);
            w *= ratio;
            h *= ratio;
            const x = (1000 - w) / 2;
            const y = (1000 - h) / 2 + 50; // slight offset down for natural placement

            ctx.drawImage(shoeImg, x, y, w, h);
            ctx.restore();

            generatedImgUrl = canvas.toDataURL('image/jpeg', 0.95);
          }
        } catch (compErr) {
          console.warn('Canvas compositing fallback:', compErr);
        }
      }"""

    if target_code in content:
        content = content.replace(target_code, composite_code)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully added canvas compositing to ProductManager.tsx")
    else:
        print("Target code not found in ProductManager.tsx")

main()
