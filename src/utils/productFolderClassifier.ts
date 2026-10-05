import { Product, Category } from '../types';

/**
 * Normalizes Arabic text for flexible matching:
 * - Unifies Alef shapes (أ, إ, آ -> ا)
 * - Unifies Taa Marbuta and Haa (ة -> ه)
 * - Unifies Yaa and Alef Maksura (ى -> ي)
 * - Strips Tashkeel / diacritics / Tatweel
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, '') // strip diacritics & tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valid Main Sections for Products in the store / download export:
 */
export const STORE_MAIN_SECTIONS = [
  'رجالي',
  'نسائي',
  'شبابي',
  'ولادي',
  'بناتي',
  'طفل',
  'طفلة',
  'بيبي',
  'مواليد',
  'الحقائب'
] as const;

export type StoreMainSection = typeof STORE_MAIN_SECTIONS[number];

/**
 * Valid Product Subtypes:
 * - احذية (أو حذاء)
 * - رياضة
 * - شحاطة
 * - صندل
 * - لاستيك
 * - لابجين (صنف لابجين للشبابي والرجالي والطفل والولادي)
 */
export const SHOE_SUBTYPES = [
  'احذية',
  'رياضة',
  'شحاطة',
  'صندل',
  'لاستيك',
  'لابجين'
] as const;

export type ShoeSubtype = typeof SHOE_SUBTYPES[number];

/**
 * Detects the Main Section (رجالي، نسائي، شبابي، ولادي، بناتي، طفل، طفلة، بيبي، مواليد، الحقائب)
 * based strictly on product category, subcategory, name and attributes.
 */
export function detectStoreMainSection(
  product: Partial<Product>,
  categories?: Category[] | string
): StoreMainSection {
  let categoryName = '';
  let subcategoryName = '';

  if (typeof categories === 'string') {
    categoryName = categories;
  } else if (Array.isArray(categories)) {
    if (product.categoryId) {
      const found = categories.find(c => c.id === product.categoryId);
      if (found) categoryName = found.name;
    }
    if (product.subcategoryId) {
      const foundSub = categories.find(c => c.id === product.subcategoryId);
      if (foundSub) subcategoryName = foundSub.name;
    }
  }

  const nameNorm = normalizeArabic([
    product.name || '',
    product.productCode || '',
    product.modelNumber || '',
    (product as any).description || ''
  ].join(' '));

  const catNorm = normalizeArabic(categoryName);
  const subNorm = normalizeArabic(subcategoryName);

  // 1. الحقائب (Bags) - Priority 1
  if (
    catNorm.includes('حقائب') ||
    subNorm.includes('حقائب') ||
    nameNorm.includes('حقائب') ||
    nameNorm.includes('حقيبه') ||
    nameNorm.includes('جنط') ||
    nameNorm.includes('شنط') ||
    nameNorm.includes('مدرسيه') ||
    nameNorm.includes('اعداديه') ||
    nameNorm.includes('سفر') ||
    nameNorm.includes('محفظه') ||
    nameNorm.includes('مخلاه') ||
    nameNorm.includes('bag') ||
    nameNorm.includes('backpack')
  ) {
    return 'الحقائب';
  }

  // 2. Explicit Subcategory Matching
  if (subNorm) {
    if (subNorm.includes('مواليد')) return 'مواليد';
    if (subNorm.includes('بيبي')) return 'بيبي';
    if (subNorm.includes('طفله')) return 'طفلة';
    if (subNorm.includes('طفل & طفله')) {
      if (nameNorm.includes('طفله') || nameNorm.includes('بنات') || nameNorm.includes('بنت') || nameNorm.includes('بنوته')) {
        return 'طفلة';
      }
      return 'طفل';
    }
    if (subNorm.includes('طفل')) return 'طفل';
    if (subNorm.includes('بناتي')) return 'بناتي';
    if (subNorm.includes('ولادي & بناتي')) {
      if (nameNorm.includes('بنات') || nameNorm.includes('بنت')) {
        return 'بناتي';
      }
      return 'ولادي';
    }
    if (subNorm.includes('ولادي')) return 'ولادي';
    if (subNorm.includes('شبابي')) return 'شبابي';
    if (subNorm.includes('نسائي')) return 'نسائي';
    if (subNorm.includes('رجالي') || subNorm.includes('رجال')) return 'رجالي';
  }

  // 3. Product Name & Code Matching
  if (nameNorm.includes('مواليد') || nameNorm.includes('مولود') || nameNorm.includes('حديث الولاده') || nameNorm.includes('newborn') || nameNorm.includes('infant')) {
    return 'مواليد';
  }
  if (nameNorm.includes('بيبي') || nameNorm.includes('رضع') || nameNorm.includes('رضيع') || nameNorm.includes('baby')) {
    return 'بيبي';
  }
  if (nameNorm.includes('طفله') || nameNorm.includes('طفلات') || nameNorm.includes('بنوته') || nameNorm.includes('baby girl') || nameNorm.includes('girl toddler')) {
    return 'طفلة';
  }
  if (nameNorm.includes('بناتي') || nameNorm.includes('بناتيه') || nameNorm.includes('بنات') || nameNorm.includes('بنت') || nameNorm.includes('بنوتات') || nameNorm.includes('girls') || nameNorm.includes('girl')) {
    return 'بناتي';
  }
  if (nameNorm.includes('ولادي') || nameNorm.includes('ولاديه') || nameNorm.includes('اولاد') || nameNorm.includes('ولد') || nameNorm.includes('صبيان') || nameNorm.includes('صبياني') || nameNorm.includes('boys') || nameNorm.includes('boy')) {
    return 'ولادي';
  }
  // Note: Match 'طفل' and 'اطفال' only - NEVER generic 'رياض' which matches 'رياضة'!
  if (nameNorm.includes('طفل') || nameNorm.includes('اطفال') || nameNorm.includes('اطفالي') || nameNorm.includes('روضه') || nameNorm.includes('روضات') || nameNorm.includes('toddler') || nameNorm.includes('baby boy')) {
    return 'طفل';
  }
  if (nameNorm.includes('شبابي') || nameNorm.includes('شبابيه') || nameNorm.includes('شباب') || nameNorm.includes('فتيان') || nameNorm.includes('مراهقين') || nameNorm.includes('youth') || nameNorm.includes('teen')) {
    return 'شبابي';
  }
  if (nameNorm.includes('نسائي') || nameNorm.includes('نسائيه') || nameNorm.includes('نساء') || nameNorm.includes('ستاتي') || nameNorm.includes('ستات') || nameNorm.includes('مدام') || nameNorm.includes('سيدات') || nameNorm.includes('حريمي') || nameNorm.includes('women') || nameNorm.includes('woman') || nameNorm.includes('ladies') || nameNorm.includes('lady')) {
    return 'نسائي';
  }
  if (nameNorm.includes('رجالي') || nameNorm.includes('رجاليه') || nameNorm.includes('رجال') || nameNorm.includes('رجل') || nameNorm.includes('men') || nameNorm.includes('man') || nameNorm.includes('gents')) {
    return 'رجالي';
  }

  // 4. Main Category Name Matching
  if (catNorm.includes('رجالي') || catNorm.includes('رجال')) return 'رجالي';
  if (catNorm.includes('نسائي') || catNorm.includes('نساء') || catNorm.includes('ستاتي')) return 'نسائي';
  if (catNorm.includes('شبابي') || catNorm.includes('شباب')) return 'شبابي';
  if (catNorm.includes('ولادي') || catNorm.includes('اولاد')) return 'ولادي';
  if (catNorm.includes('بناتي') || catNorm.includes('بنات')) return 'بناتي';
  if (catNorm.includes('طفله')) return 'طفلة';
  if (catNorm.includes('طفل') || catNorm.includes('اطفال')) return 'طفل';
  if (catNorm.includes('بيبي')) return 'بيبي';
  if (catNorm.includes('مواليد')) return 'مواليد';

  // If already tagged with a known showcase category
  if (product.showcaseCategory && STORE_MAIN_SECTIONS.includes(product.showcaseCategory as any)) {
    return product.showcaseCategory as StoreMainSection;
  }

  return 'رجالي';
}

/**
 * Detects the specific subtype (احذية، رياضة، شحاطة، صندل، لاستيك)
 * using product name, code, modelNumber, categoryName, subcategoryName.
 */
export function detectShoeSubtype(
  productOrName: Partial<Product> | string,
  categories?: Category[] | string
): ShoeSubtype {
  let name = '';
  let code = '';
  let model = '';
  let categoryName = '';
  let subcategoryName = '';

  if (typeof productOrName === 'string') {
    name = productOrName;
  } else if (productOrName && typeof productOrName === 'object') {
    name = productOrName.name || '';
    code = productOrName.productCode || '';
    model = productOrName.modelNumber || '';
    if (typeof categories === 'string') {
      categoryName = categories;
    } else if (Array.isArray(categories)) {
      if (productOrName.categoryId) {
        const cat = categories.find(c => c.id === productOrName.categoryId);
        if (cat) categoryName = cat.name;
      }
      if (productOrName.subcategoryId) {
        const sub = categories.find(c => c.id === productOrName.subcategoryId);
        if (sub) subcategoryName = sub.name;
      }
    }
  }

  const combined = [name, code, model, categoryName, subcategoryName].join(' ');
  const norm = normalizeArabic(combined);

  // 1. لابجين (Loafers / Lapjin - صنف لابجين للشبابي والرجالي والطفل والولادي)
  // Check for products explicitly named or classified as لابجين
  if (
    norm.includes('لابجين') ||
    norm.includes('لبجين') ||
    norm.includes('لوبجين') ||
    norm.includes('lapjin') ||
    norm.includes('loafer')
  ) {
    return 'لابجين';
  }

  // 2. لاستيك (Rubber / Silicone / Crocs / EVA) - Priority to prevent "سلبر لاستيك" or "صندل كروكس" from miscategorizing
  if (
    norm.includes('لاستيك') ||
    norm.includes('بلاستيك') ||
    norm.includes('مطاط') ||
    norm.includes('كروكس') ||
    norm.includes('سيليكون') ||
    norm.includes('جلي') ||
    norm.includes('ايفا') ||
    norm.includes('waterproof') ||
    norm.includes('rubber') ||
    norm.includes('crocs') ||
    norm.includes('clog') ||
    norm.includes('jelly')
  ) {
    return 'لاستيك';
  }

  // 2. صندل (Sandals) - Priority over sliders and sports
  if (
    norm.includes('صندل') ||
    norm.includes('صنادل') ||
    norm.includes('sandal') ||
    norm.includes('sandals')
  ) {
    return 'صندل';
  }

  // 3. شحاطة (Sliders / Slippers)
  if (
    norm.includes('شحاط') ||
    norm.includes('سليبر') ||
    norm.includes('سلبر') ||
    norm.includes('شبشب') ||
    norm.includes('نعال') ||
    norm.includes('سلايد') ||
    norm.includes('slipper') ||
    norm.includes('slide') ||
    norm.includes('flip flop')
  ) {
    return 'شحاطة';
  }

  // 4. رياضة (Sports / Sneakers / Skechers)
  if (
    norm.includes('رياض') ||
    norm.includes('سبورت') ||
    norm.includes('سكجر') ||
    norm.includes('سكيتشر') ||
    norm.includes('سنيكر') ||
    norm.includes('ركض') ||
    norm.includes('جيم') ||
    norm.includes('كول') ||
    norm.includes('بوتين') ||
    norm.includes('نايك') ||
    norm.includes('اديداس') ||
    norm.includes('نيوبلانس') ||
    norm.includes('اسكس') ||
    norm.includes('بوما') ||
    norm.includes('فلاي') ||
    norm.includes('sport') ||
    norm.includes('sneaker') ||
    norm.includes('running') ||
    norm.includes('skechers')
  ) {
    return 'رياضة';
  }

  // 6. احذية (Default Shoe category: حذاء، بوت، بسطال، كعب، فلات، رسمي، كلاسيك، قندرة...)
  return 'احذية';
}
