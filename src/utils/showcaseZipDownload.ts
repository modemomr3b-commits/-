import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Product, Category } from '../types';
import { detectShowcaseCategory, VALID_SHOWCASE_CATEGORIES } from './showcaseClassifier';
import { detectShoeSubtype } from './productFolderClassifier';

export interface CategoryExportStats {
  category: string;
  folderName: string;
  count: number;
  imageCount: number;
  products: Product[];
}

export interface ShowcaseZipExportOptions {
  scope: 'showcase_only' | 'all_active';
  selectedCategories?: string[];
  includePriceInFilename?: boolean;
  includeTextCatalog?: boolean;
  includeHtmlCatalog?: boolean;
  categories?: Category[];
}

export interface ShowcaseZipProgress {
  current: number;
  total: number;
  percent: number;
  currentCategory: string;
  currentFilename: string;
  statusMessage: string;
}

const CATEGORY_ORDER: { [key: string]: { prefix: string; name: string } } = {
  'رجالي': { prefix: '01', name: 'رجالي' },
  'نسائي': { prefix: '02', name: 'نسائي' },
  'شبابي': { prefix: '03', name: 'شبابي' },
  'ولادي': { prefix: '04', name: 'ولادي' },
  'بناتي': { prefix: '05', name: 'بناتي' },
  'طفل': { prefix: '06', name: 'طفل' },
  'طفلة': { prefix: '07', name: 'طفلة' },
  'بيبي': { prefix: '08', name: 'بيبي' },
  'مواليد': { prefix: '09', name: 'مواليد' },
  'الحقائب': { prefix: '10', name: 'الحقائب' },
};

/**
 * Clean string for safe file and directory names
 */
function sanitizeFilename(str: string): string {
  if (!str) return '';
  return str
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Groups given products into the 10 Showcase categories
 */
export function groupProductsForShowcaseExport(
  products: Product[],
  categories?: Category[],
  scope: 'showcase_only' | 'all_active' = 'showcase_only'
): CategoryExportStats[] {
  const filtered = products.filter(p => {
    if (p.isHidden || p.isArchived || p.isLocked || p.isDeleted) return false;
    if (scope === 'showcase_only') {
      return p.isShowcase === true;
    }
    return true;
  });

  const map = new Map<string, Product[]>();

  // Initialize standard categories in order
  Object.keys(CATEGORY_ORDER).forEach(cat => {
    map.set(cat, []);
  });

  filtered.forEach(p => {
    let cat = p.showcaseCategory;
    if (!cat || !VALID_SHOWCASE_CATEGORIES.includes(cat as any)) {
      cat = detectShowcaseCategory(p, categories);
    }
    if (!map.has(cat)) {
      map.set(cat, []);
    }
    map.get(cat)!.push(p);
  });

  const result: CategoryExportStats[] = [];

  // Add in predefined order
  Object.entries(CATEGORY_ORDER).forEach(([catKey, info]) => {
    const prods = map.get(catKey) || [];
    const imageCount = prods.filter(p => p.finalImageUrl || p.imageUrl).length;
    result.push({
      category: catKey,
      folderName: `${info.prefix} - ${info.name}`,
      count: prods.length,
      imageCount,
      products: prods
    });
    map.delete(catKey);
  });

  // Add any leftover categories
  let leftoverIdx = 11;
  map.forEach((prods, catKey) => {
    if (prods.length > 0) {
      const imageCount = prods.filter(p => p.finalImageUrl || p.imageUrl).length;
      result.push({
        category: catKey,
        folderName: `${leftoverIdx++} - ${catKey}`,
        count: prods.length,
        imageCount,
        products: prods
      });
    }
  });

  return result;
}

/**
 * Formats price in Iraqi Dinars
 */
function formatIqdPrice(price?: number): string {
  if (!price && price !== 0) return '0 د.ع';
  return price.toLocaleString('ar-IQ') + ' د.ع';
}

/**
 * Generates plain text catalog for a category
 */
function generateCategoryTextCatalog(categoryName: string, products: Product[]): string {
  const dateStr = new Date().toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let text = `=========================================================\n`;
  text += `   معرض شركة الوفاء التجاري - قسم: ${categoryName}\n`;
  text += `   تاريخ التصدير: ${dateStr}\n`;
  text += `   إجمالي عدد الموديلات في هذا القسم: ${products.length}\n`;
  text += `=========================================================\n\n`;

  products.forEach((p, idx) => {
    text += `[${idx + 1}] ${p.name}\n`;
    if (p.productCode) text += `   - كود الموديل: ${p.productCode}\n`;
    if (p.modelNumber) text += `   - الرمز / رقم الموديل: ${p.modelNumber}\n`;
    text += `   - السعر: ${formatIqdPrice(p.price)}`;
    if (p.dozenPriceUsd) text += ` | سعر الدرزن: $${p.dozenPriceUsd}`;
    text += `\n`;
    if (p.packaging) text += `   - التعبئة: ${p.packaging}\n`;
    if (p.piecesCount) text += `   - عدد القطع: ${p.piecesCount}\n`;
    text += `---------------------------------------------------------\n`;
  });

  text += `\nمعرض شركة الوفاء - هاتف / واتساب الإدارة: 07801359735\n`;
  return text;
}

/**
 * Generates an offline HTML interactive catalog for the category
 */
function generateCategoryHtmlCatalog(categoryName: string, products: Product[], filenames: Map<string, string>): string {
  const dateStr = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });

  const cardsHtml = products.map((p, idx) => {
    const filename = filenames.get(p.id || String(idx)) || '';
    const imgTag = filename 
      ? `<img src="${encodeURIComponent(filename)}" alt="${p.name}" loading="lazy" class="product-img" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'>👟 لا توجد صورة</div>'" />`
      : `<div class="no-img">👟 بدون صورة</div>`;

    return `
      <div class="card">
        <div class="img-box">
          ${imgTag}
          <span class="badge">#${idx + 1}</span>
        </div>
        <div class="info">
          <h3 class="name">${p.name}</h3>
          <div class="meta">
            ${p.productCode ? `<span class="tag">كود: <strong>${p.productCode}</strong></span>` : ''}
            ${p.modelNumber ? `<span class="tag">رمز: <strong>${p.modelNumber}</strong></span>` : ''}
          </div>
          <div class="price-box">
            <span class="price">${formatIqdPrice(p.price)}</span>
            ${p.dozenPriceUsd ? `<span class="usd-price">$${p.dozenPriceUsd} درزن</span>` : ''}
          </div>
          ${p.packaging ? `<div class="pack">التعبئة: ${p.packaging}</div>` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>معرض شركة الوفاء - ${categoryName}</title>
  <style>
    :root {
      --gold: #D4AF37;
      --gold-light: #FDF4DC;
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 24px; direction: rtl; }
    header { max-width: 1200px; margin: 0 auto 28px; text-align: center; border-bottom: 2px solid var(--border); padding-bottom: 20px; }
    h1 { color: var(--gold); font-size: 28px; margin-bottom: 8px; }
    .subtitle { color: var(--text-muted); font-size: 14px; }
    .search-box { max-width: 500px; margin: 16px auto 0; }
    .search-box input { width: 100%; padding: 12px 18px; border-radius: 12px; border: 1px solid var(--border); background: var(--card-bg); color: #fff; font-size: 15px; outline: none; }
    .search-box input:focus { border-color: var(--gold); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; }
    .card:hover { transform: translateY(-4px); border-color: var(--gold); }
    .img-box { position: relative; width: 100%; height: 220px; background: #0b1120; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .product-img { width: 100%; height: 100%; object-fit: contain; }
    .no-img { color: var(--text-muted); font-size: 14px; }
    .badge { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: var(--gold); padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: bold; border: 1px solid var(--gold); }
    .info { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .name { font-size: 16px; font-weight: 700; color: #fff; line-height: 1.4; }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 6px; font-size: 11px; color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); }
    .tag strong { color: #fff; }
    .price-box { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
    .price { font-size: 18px; font-weight: 800; color: var(--gold); }
    .usd-price { font-size: 13px; color: #10B981; font-weight: 600; }
    .pack { font-size: 12px; color: var(--text-muted); }
    footer { text-align: center; margin-top: 40px; color: var(--text-muted); font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <h1>معرض شركة الوفاء - كتالوج ${categoryName} 🌟</h1>
    <p class="subtitle">تاريخ التصدير: ${dateStr} • إجمالي عدد المنتجات: ${products.length}</p>
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="ابحث باسم الموديل أو الكود..." onkeyup="filterCards()" />
    </div>
  </header>

  <div class="grid" id="productsGrid">
    ${cardsHtml}
  </div>

  <footer>
    <p>شركة الوفاء التجارية • جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
  </footer>

  <script>
    function filterCards() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    }
  </script>
</body>
</html>`;
}

// High-performance image fetcher with concurrency pool and ultra-fast base64/blob conversion
async function fetchImageAsBlob(url: string, timeoutMs: number = 10000): Promise<Blob | null> {
  if (!url) return null;

  // 1. If it's a data URL, convert directly in memory (0ms network cost)
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const b64Data = parts[1];
      const byteCharacters = atob(b64Data);
      const byteArrays = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([byteArrays], { type: mimeType });
    } catch (e) {
      console.warn('Failed to decode data URL in memory, falling back to fetch', e);
    }
  }

  // 2. Network fetch with abort controller and retry
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.blob();
      }
    } catch (err) {
      if (attempt === 1) {
        console.warn(`Failed to fetch image: ${url.slice(0, 60)}...`, err);
      }
    }
  }

  return null;
}

/**
 * Master exporter function: Downloads all categorized showcase products into a beautiful structured ZIP with maximum speed
 */
export async function exportShowcaseToCategorizedZip(
  categoriesStats: CategoryExportStats[],
  options: ShowcaseZipExportOptions,
  onProgress?: (progress: ShowcaseZipProgress) => void
): Promise<{ success: boolean; totalFiles: number; error?: string }> {
  try {
    const zip = new JSZip();

    // Filter categories based on selection
    const activeStats = categoriesStats.filter(c => {
      if (!options.selectedCategories || options.selectedCategories.length === 0) return true;
      return options.selectedCategories.includes(c.category);
    });

    // Prepare all image download tasks across all categories
    interface DownloadTask {
      catName: string;
      folderName: string;
      product: Product;
      imgUrl: string;
      filename: string;
    }

    const tasks: DownloadTask[] = [];
    const usedFilenamesPerFolder = new Map<string, Set<string>>();
    const categoryFilenamesMap = new Map<string, Map<string, string>>();

    activeStats.forEach(cat => {
      const catFileMap = new Map<string, string>();
      categoryFilenamesMap.set(cat.category, catFileMap);

      cat.products.forEach(product => {
        const imgUrl = product.finalImageUrl || product.imageUrl;
        if (!imgUrl) return;

        // Calculate specific subfolder for shoes (احذية، رياضة، شحاطة، صندل، لاستيك), or unified for bags
        let targetFolder = cat.folderName;
        if (cat.category !== 'الحقائب') {
          const subtype = detectShoeSubtype(product, options.categories);
          targetFolder = `${cat.folderName}/${subtype}`;
        }

        if (!usedFilenamesPerFolder.has(targetFolder)) {
          usedFilenamesPerFolder.set(targetFolder, new Set<string>());
        }
        const usedNames = usedFilenamesPerFolder.get(targetFolder)!;

        const extMatch = imgUrl.split('.').pop()?.split('?')[0];
        const ext = extMatch && extMatch.length <= 4 ? extMatch : 'jpg';

        let baseParts: string[] = [];
        if (product.productCode) baseParts.push(sanitizeFilename(product.productCode));
        if (product.name) baseParts.push(sanitizeFilename(product.name));
        if (options.includePriceInFilename && product.price) {
          baseParts.push(`${product.price.toLocaleString('ar-IQ')} دينار`);
        }

        let baseName = baseParts.join(' - ');
        if (!baseName) baseName = `product_${product.id || 'item'}`;

        let filename = `${baseName}.${ext}`;
        let counter = 1;
        while (usedNames.has(filename)) {
          filename = `${baseName}_${counter++}.${ext}`;
        }
        usedNames.add(filename);
        catFileMap.set(product.id || '', filename);

        tasks.push({
          catName: cat.category,
          folderName: targetFolder,
          product,
          imgUrl,
          filename
        });
      });
    });

    const totalImages = tasks.length;

    if (totalImages === 0 && activeStats.every(c => c.products.length === 0)) {
      return { success: false, totalFiles: 0, error: 'لا توجد منتجات أو صور في الأقسام المحددة.' };
    }

    let processedImages = 0;
    const updateProgress = (categoryName: string, filename: string, message: string) => {
      if (onProgress) {
        const percent = totalImages > 0 ? Math.round((processedImages / totalImages) * 90) : 0;
        onProgress({
          current: processedImages,
          total: totalImages,
          percent,
          currentCategory: categoryName,
          currentFilename: filename,
          statusMessage: message
        });
      }
    };

    updateProgress('بدء التصدير السريع', '', 'جاري تنزيل الصور بالتوازي بأقصى سرعة...');

    // Parallel Concurrent Worker Pool (Downloads 12 images at the exact same instant)
    const CONCURRENCY = 12;
    let taskIndex = 0;

    const worker = async () => {
      while (taskIndex < tasks.length) {
        const currentTask = tasks[taskIndex++];
        if (!currentTask) break;

        try {
          const blob = await fetchImageAsBlob(currentTask.imgUrl, 8000);
          if (blob) {
            const folder = zip.folder(currentTask.folderName);
            if (folder) {
              folder.file(currentTask.filename, blob);
            }
          }
        } catch (e) {
          console.warn(`Error processing image ${currentTask.filename}`, e);
        } finally {
          processedImages++;
          updateProgress(
            currentTask.catName,
            currentTask.filename,
            `تم تحميل صورة (${processedImages}/${totalImages})`
          );
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker());
    await Promise.all(workers);

    // Master Summary file content
    const masterDateStr = new Date().toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let masterReport = `=========================================================\n`;
    masterReport += `        معرض شركة الوفاء المتميز - التقرير الشامل\n`;
    masterReport += `=========================================================\n`;
    masterReport += `تاريخ التصدير: ${masterDateStr}\n`;
    masterReport += `نوع التصدير: ${options.scope === 'showcase_only' ? 'منتجات المعرض العام المفعلة' : 'جميع منتجات المتجر المتاحة'}\n`;
    masterReport += `إجمالي الصور المُحملة: ${processedImages}\n\n`;
    masterReport += `تقسيم الأقسام والمجلدات:\n`;

    activeStats.forEach(cat => {
      masterReport += `  📁 ${cat.folderName}: ${cat.products.length} موديل (${cat.imageCount} صورة)\n`;
      const folder = zip.folder(cat.folderName);
      if (folder) {
        const catFilenames = categoryFilenamesMap.get(cat.category) || new Map();
        // Add Category Plain Text Catalog if enabled
        if (options.includeTextCatalog !== false && cat.products.length > 0) {
          const textCatalog = generateCategoryTextCatalog(cat.category, cat.products);
          folder.file(`00_دليل_منتجات_${sanitizeFilename(cat.category)}.txt`, textCatalog);
        }

        // Add Category HTML interactive catalog if enabled
        if (options.includeHtmlCatalog !== false && cat.products.length > 0) {
          const htmlCatalog = generateCategoryHtmlCatalog(cat.category, cat.products, catFilenames);
          folder.file(`00_كتالوج_${sanitizeFilename(cat.category)}_التفاعلي.html`, htmlCatalog);
        }
      }
    });
    masterReport += `\n=========================================================\n`;

    // Add Master report at root of ZIP
    zip.file('00_دليل_معرض_شركة_الوفاء_الشامل.txt', masterReport);

    if (onProgress) {
      onProgress({
        current: processedImages,
        total: totalImages,
        percent: 92,
        currentCategory: 'ضغط الملفات',
        currentFilename: 'جاري الحفظ...',
        statusMessage: 'جاري تجميع الملفات في أرشيف Zip فائق السرعة...'
      });
    }

    // Generate ZIP with STORE mode for already compressed images -> near INSTANT speed
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'STORE'
      },
      (metadata) => {
        if (onProgress) {
          const zipPercent = 90 + Math.round((metadata.percent / 100) * 10);
          onProgress({
            current: processedImages,
            total: totalImages,
            percent: Math.min(100, zipPercent),
            currentCategory: 'ضغط الملفات',
            currentFilename: `${Math.round(metadata.percent)}%`,
            statusMessage: 'جاري إنشاء ملف الـ Zip بسرعة فائقة...'
          });
        }
      }
    );

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const zipName = `معرض_شركة_الوفاء_المبوب_${dateFormatted}.zip`;

    saveAs(zipBlob, zipName);

    return { success: true, totalFiles: processedImages };
  } catch (err: any) {
    console.error('Showcase categorized export error:', err);
    return { success: false, totalFiles: 0, error: err?.message || 'حدث خطأ غير متوقع أثناء تصدير المعرض.' };
  }
}
