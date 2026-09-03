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
 * Valid Product Subtypes (strictly the 5 shoe types requested + bags + others):
 * - احذية (أو حذاء)
 * - رياضة
 * - شحاطة
 * - صندل
 * - لاستيك
 */
export const SHOE_SUBTYPES = [
  'احذية',
  'رياضة',
  'شحاطة',
  'صندل',
  'لاستيك'
] as const;

export type ShoeSubtype = typeof SHOE_SUBTYPES[number];

/**
 * Detects the Main Section (رجالي، نسائي، شبابي، ولادي، بناتي، طفل، طفلة، بيبي، مواليد، الحقائب)
 * based strictly on product name and attributes.
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

  const combined = [
    product.name || '',
    product.productCode || '',
    product.modelNumber || '',
    categoryName,
    subcategoryName,
    (product as any).description || '',
    (product as any).showcaseCategory || ''
  ].join(' ');

  const norm = normalizeArabic(combined);

  // 1. الحقائب (Bags)
  if (
    norm.includes('حقائب') ||
    norm.includes('حقيبه') ||
    norm.includes('جنط') ||
    norm.includes('جنطه') ||
    norm.includes('محفظه') ||
    norm.includes('مخلاه') ||
    norm.includes('bag') ||
    norm.includes('backpack')
  ) {
    return 'الحقائب';
  }

  // 2. مواليد
  if (
    norm.includes('مواليد') ||
    norm.includes('مولود') ||
    norm.includes('حديث الولاده') ||
    norm.includes('حديثي الولاده') ||
    norm.includes('newborn') ||
    norm.includes('infant')
  ) {
    return 'مواليد';
  }

  // 3. بيبي
  if (
    norm.includes('بيبي') ||
    norm.includes('رضع') ||
    norm.includes('رضيع') ||
    norm.includes('baby')
  ) {
    return 'بيبي';
  }

  // 4. طفلة (بنوته / طفلة)
  if (
    norm.includes('طفله') ||
    norm.includes('طفلات') ||
    norm.includes('بنوته') ||
    norm.includes('baby girl') ||
    norm.includes('girl toddler')
  ) {
    return 'طفلة';
  }

  // 5. طفل (طفل / أطفال / روضة / رياض)
  if (
    norm.includes('طفل') ||
    norm.includes('اطفال') ||
    norm.includes('اطفالي') ||
    norm.includes('روضه') ||
    norm.includes('روضات') ||
    norm.includes('رياض') ||
    norm.includes('kindergarten') ||
    norm.includes('toddler') ||
    norm.includes('baby boy')
  ) {
    return 'طفل';
  }

  // 6. بناتي
  if (
    norm.includes('بناتي') ||
    norm.includes('بناتيه') ||
    norm.includes('بنات') ||
    norm.includes('بنت') ||
    norm.includes('بنوتات') ||
    norm.includes('girls') ||
    norm.includes('girl')
  ) {
    return 'بناتي';
  }

  // 7. ولادي
  if (
    norm.includes('ولادي') ||
    norm.includes('ولاديه') ||
    norm.includes('اولاد') ||
    norm.includes('ولد') ||
    norm.includes('صبيان') ||
    norm.includes('صبياني') ||
    norm.includes('boys') ||
    norm.includes('boy')
  ) {
    return 'ولادي';
  }

  // 8. شبابي
  if (
    norm.includes('شبابي') ||
    norm.includes('شبابيه') ||
    norm.includes('شباب') ||
    norm.includes('فتيان') ||
    norm.includes('مراهقين') ||
    norm.includes('youth') ||
    norm.includes('teen')
  ) {
    return 'شبابي';
  }

  // 9. نسائي
  if (
    norm.includes('نسائي') ||
    norm.includes('نسائيه') ||
    norm.includes('نساء') ||
    norm.includes('ستاتي') ||
    norm.includes('ستات') ||
    norm.includes('مدام') ||
    norm.includes('سيدات') ||
    norm.includes('حريمي') ||
    norm.includes('women') ||
    norm.includes('woman') ||
    norm.includes('ladies') ||
    norm.includes('lady')
  ) {
    return 'نسائي';
  }

  // 10. رجالي
  if (
    norm.includes('رجالي') ||
    norm.includes('رجاليه') ||
    norm.includes('رجال') ||
    norm.includes('رجل') ||
    norm.includes('men') ||
    norm.includes('man') ||
    norm.includes('gents')
  ) {
    return 'رجالي';
  }

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

  // 1. لاستيك (Rubber / Silicone / Crocs / EVA) - Priority 1 to prevent "سلبر لاستيك" or "صندل كروكس" from miscategorizing
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

  // 2. شحاطة (Sliders / Slippers)
  if (
    norm.includes('شحاط') ||
    norm.includes('سليبر') ||
    norm.includes('سلبر') ||
    norm.includes('شبشب') ||
    norm.includes('نعال') ||
    norm.includes('سلايد') ||
    norm.includes('slipper') ||
    norm.includes('slide')
  ) {
    return 'شحاطة';
  }

  // 3. صندل (Sandals)
  if (
    norm.includes('صندل') ||
    norm.includes('صنادل') ||
    norm.includes('sandal') ||
    norm.includes('sandals')
  ) {
    return 'صندل';
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
    norm.includes('sport') ||
    norm.includes('sneaker') ||
    norm.includes('running') ||
    norm.includes('skechers')
  ) {
    return 'رياضة';
  }

  // 5. احذية (Default Shoe category: حذاء، بوت، بسطال، كعب، فلات، رسمي، كلاسيك، قندرة، لابجين...)
  return 'احذية';
}
