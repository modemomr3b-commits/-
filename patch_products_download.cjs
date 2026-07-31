const fs = require('fs');
let code = fs.readFileSync('src/components/member/Products.tsx', 'utf8');

const oldLogic = /const imagesToDownload = imagesWithData[\s\S]*?showToast\("تم الحفظ بنجاح", "success"\);/m;

const newLogic = `
                  const imagesToDownload = imagesWithData
                    .filter(p => p.finalImageUrl || p.imageUrl)
                    .map(p => {
                      const imgUrl = p.finalImageUrl || p.imageUrl;
                      const ext = imgUrl!.split('.').pop()?.split('?')[0] || 'jpg';
                      const safeName = (p.productCode || p.name || 'product').replace(/[\\/\\?<>\\\\:\\*\\|":]/g, '-');
                      const filename = \`\${safeName}.\${ext}\`;
                      
                      let mainCatName = 'عام';
                      if (p.categoryId) {
                        const mainCat = allCategories.find(c => c.id === p.categoryId);
                        if (mainCat) mainCatName = mainCat.name;
                      }
                      
                      const getProductType = (name: string) => {
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
                  
                  if ((user?.role !== 'admin' && user?.role !== 'sales')) {
                    const { downloadImages } = await import('../../utils/download');
                    const success = await downloadImages(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                    if (success) {
                       showToast("تم الحفظ في الاستوديو بنجاح", "success");
                    } else {
                       showToast("حدث خطأ أثناء الحفظ", "error");
                    }
                  } else {
                    const { downloadAsZip } = await import('../../utils/zipDownload');
                    
                    const catName = activeCategory 
                      ? allCategories.find(c => c.id === activeCategory)?.name || "category"
                      : "category";

                    const success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                    if (success) {
                       showToast("تم تحميل الملف المضغوط بنجاح", "success");
                    } else {
                       showToast("حدث خطأ أثناء التحميل", "error");
                    }
                  }
                  
                  setDownloadProgress(null);
`;

code = code.replace(oldLogic, newLogic.trim());
fs.writeFileSync('src/components/member/Products.tsx', code);
