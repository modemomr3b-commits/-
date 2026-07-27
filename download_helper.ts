export const handleDownloadSingleHelper = async (e: any, p: any, showToast: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = p.finalImageUrl || p.imageUrl;
    if (!imgUrl) {
      showToast("لا توجد صورة لهذا المنتج.", "error");
      return;
    }

    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const safeName = (p.productCode || p.name || "product").replace(/[\/\?<>\\:\*\|":]/g, '-');
      const filename = `${safeName}.${ext}`;
      
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      showToast("تم التحميل بنجاح", "success");
    } catch (error) {
      console.error('Error downloading file', error);
      showToast("حدث خطأ أثناء التحميل.", "error");
    }
  };
