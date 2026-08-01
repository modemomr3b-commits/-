import sys
def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    target = """                  const { downloadAsZip } = await import('../../utils/zipDownload');
                  
                  const catName = categoryId 
                    ? allCategories.find(c => c.id === categoryId)?.name || "category"
                    : "category";

                  const success = await downloadAsZip(catName, imagesToDownload, (progress, total) => {
                    setDownloadProgress({ progress, total });
                  });"""

    replacement = """                  const catName = categoryId 
                    ? allCategories.find(c => c.id === categoryId)?.name || "category"
                    : "category";

                  let success = false;
                  if ('showDirectoryPicker' in window) {
                    const { downloadToFolder } = await import('../../utils/folderDownload');
                    success = await downloadToFolder(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  } else {
                    // Fallback to multiple file download if folder picker not supported
                    const { downloadImages } = await import('../../utils/download');
                    success = await downloadImages(imagesToDownload.map(img => ({ url: img.url, filename: img.filename })), (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  }"""

    content = content.replace(target, replacement)
    
    # Also update onDownloadAllElastic
    target2 = """                  const { downloadAsZip } = await import('../../utils/zipDownload');
                  const success = await downloadAsZip('Elastic_Products', imagesToDownload, (progress, total) => {
                    setDownloadProgress({ progress, total });
                  });"""

    replacement2 = """                  let success = false;
                  if ('showDirectoryPicker' in window) {
                    const { downloadToFolder } = await import('../../utils/folderDownload');
                    success = await downloadToFolder(imagesToDownload, (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  } else {
                    const { downloadImages } = await import('../../utils/download');
                    success = await downloadImages(imagesToDownload.map(img => ({ url: img.url, filename: img.filename })), (progress, total) => {
                      setDownloadProgress({ progress, total });
                    });
                  }"""
                  
    content = content.replace(target2, replacement2)
                  
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/member/Products.tsx')
