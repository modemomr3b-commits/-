const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const regex = /const imagesToDownload = imagesWithData\s*\.filter\(p => p\.finalImageUrl \|\| p\.imageUrl\)\s*\.map\(p => \{\s*const imgUrl = p\.finalImageUrl \|\| p\.imageUrl;\s*const ext = imgUrl!\.split\('\.'\)\.pop\(\)\?\.split\('\?'\)\[0\] \|\| 'jpg';\s*const safeName = \(p\.productCode \|\| p\.name \|\| 'product'\)\.replace\(\/\[\\\/\\\?<>\\\\:\\\*\\\|":\]\/g, '-'\);\s*const filename = \`\$\{safeName\}\.\$\{ext\}\`;\s*return \{ url: imgUrl!, filename \};\s*\}\);\s*const \{ downloadImages \} = await import\('\.\.\/\.\.\/utils\/download'\);\s*await downloadImages\(imagesToDownload, \(progress, total\) => \{\s*setDownloadProgress\(\{ progress, total \}\);\s*\}\);/gm;

const newLogic = `const imagesToDownload = imagesWithData
      .filter(p => p.finalImageUrl || p.imageUrl)
      .map(p => {
        const imgUrl = p.finalImageUrl || p.imageUrl;
        const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
        const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
        const filename = \`\${safeName}.\${ext}\`;
        
        let mainCatName = 'عام';
        if (p.categoryId) {
          const mainCat = categories.find(c => c.id === p.categoryId);
          if (mainCat) mainCatName = mainCat.name;
        }
        
        const getProductType = (name) => {
          if (!name) return 'أخرى';
          const lowerName = name.toLowerCase();
          if (lowerName.includes('رياض')) return 'رياضة';
          if (lowerName.includes('شحاط')) return 'شحاطة';
          if (lowerName.includes('صندل') || lowerName.includes('صنادل')) return 'صندل';
          if (lowerName.includes('سليبر')) return 'سليبر';
          if (lowerName.includes('حذاء') || lowerName.includes('احذية') || lowerName.includes('أحذية')) return 'أحذية';
          if (lowerName.includes('لاستيك')) return 'لاستيك';
          if (lowerName.includes('ايفا') || lowerName.includes('إيفا')) return 'ايفا';
          if (lowerName.includes('قندر') || lowerName.includes('قنادر')) return 'قنادر';
          if (lowerName.includes('بوت') || lowerName.includes('جزم') || lowerName.includes('بسطال')) return 'بوت وجزم';
          if (lowerName.includes('نص')) return 'نصف';
          return 'أخرى';
        };

        const productType = getProductType(p.name);
        const folderName = \`\${mainCatName}/\${productType}\`;

        return { url: imgUrl!, filename, folderName };
      });
      
    const { downloadAsZip } = await import('../../utils/zipDownload');
    await downloadAsZip('products', imagesToDownload, (progress, total) => {
      setDownloadProgress({ progress, total });
    });`;

code = code.replace(regex, newLogic);
fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
