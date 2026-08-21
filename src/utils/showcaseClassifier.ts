import { Product, Category } from '../types';
import menCategoryImg from '../assets/images/category_men_1787312072619.jpg';
import womenCategoryImg from '../assets/images/category_women_1787318893725.jpg';
import youthCategoryImg from '../assets/images/category_youth_1787319166882.jpg';
import boysCategoryImg from '../assets/images/category_boys_1787319748611.jpg';
import girlsCategoryImg from '../assets/images/category_girls_gen_1787320846860.jpg';
import tflaCategoryImg from '../assets/images/category_tfla_1787320971646.jpg';
import tflCategoryImg from '../assets/images/category_tfl_gen_1787321708245.jpg';
import babyCategoryImg from '../assets/images/category_baby_gen_1787321857235.jpg';
import mowaleedCategoryImg from '../assets/images/category_mowaleed_1787322085497.jpg';
import bagsCategoryImg from '../assets/images/category_bags_1787322379719.jpg';
import allCategoriesImg from '../assets/images/category_all_1787322398380.jpg';

export { allCategoriesImg, bagsCategoryImg };

export const VALID_SHOWCASE_CATEGORIES = [
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

export type ShowcaseCategoryType = typeof VALID_SHOWCASE_CATEGORIES[number];

export const SHOWCASE_CATEGORIES_METADATA = [
  { id: 'رجالي', name: 'رجالي', icon: '👞', image: menCategoryImg },
  { id: 'نسائي', name: 'نسائي', icon: '👠', image: womenCategoryImg },
  { id: 'شبابي', name: 'شبابي', icon: '👟', image: youthCategoryImg },
  { id: 'ولادي', name: 'ولادي', icon: '👦', image: boysCategoryImg },
  { id: 'بناتي', name: 'بناتي', icon: '👧', image: girlsCategoryImg },
  { id: 'طفل', name: 'طفل', icon: '🧒', image: tflCategoryImg },
  { id: 'طفلة', name: 'طفلة', icon: '🎀', image: tflaCategoryImg },
  { id: 'بيبي', name: 'بيبي', icon: '🍼', image: babyCategoryImg },
  { id: 'مواليد', name: 'مواليد', icon: '👶', image: mowaleedCategoryImg },
  { id: 'الحقائب', name: 'الحقائب', icon: '👜', image: bagsCategoryImg }
];

/**
 * Intelligently detects the appropriate showcase category for a product
 * by analyzing its name, product code, model, category name, and existing tags.
 */
export function detectShowcaseCategory(
  product: Partial<Product>,
  categories?: Category[] | string
): ShowcaseCategoryType {
  let categoryName = '';
  if (typeof categories === 'string') {
    categoryName = categories;
  } else if (Array.isArray(categories) && product.categoryId) {
    const found = categories.find(c => c.id === product.categoryId);
    if (found) categoryName = found.name;
  }

  const combinedText = [
    product.name || '',
    product.productCode || '',
    product.modelNumber || '',
    categoryName,
    (product as any).description || ''
  ]
    .join(' ')
    .toLowerCase();

  // Normalize Arabic letters for accurate matching
  const normalized = combinedText
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, ''); // strip tatweel / harakat

  // 1. الحقائب (Bags)
  if (
    normalized.includes('حقائب') ||
    normalized.includes('حقيبه') ||
    normalized.includes('جنط') ||
    normalized.includes('جنطه') ||
    normalized.includes('حقيبة') ||
    normalized.includes('حقيبة ظهر') ||
    normalized.includes('جنط نسائي') ||
    normalized.includes('bag') ||
    normalized.includes('bags') ||
    normalized.includes('محفظه') ||
    normalized.includes('مخلاه') ||
    normalized.includes('محفظة')
  ) {
    return 'الحقائب';
  }

  // 2. مواليد (Newborns)
  if (
    normalized.includes('مواليد') ||
    normalized.includes('مولود') ||
    normalized.includes('حديث الولاده') ||
    normalized.includes('حديثي الولاده') ||
    normalized.includes('newborn') ||
    normalized.includes('infant')
  ) {
    return 'مواليد';
  }

  // 2. بيبي (Baby)
  if (
    normalized.includes('بيبي') ||
    normalized.includes('رضع') ||
    normalized.includes('رضيع') ||
    normalized.includes('baby')
  ) {
    return 'بيبي';
  }

  // 3. طفلة (Girl toddler / young girl)
  if (
    normalized.includes('طفله') ||
    normalized.includes('بنوته') ||
    normalized.includes('طفلات') ||
    normalized.includes('baby girl') ||
    normalized.includes('girl toddler')
  ) {
    return 'طفلة';
  }

  // 4. طفل (Boy toddler / young kid)
  if (
    normalized.includes('طفل') ||
    normalized.includes('اطفال') ||
    normalized.includes('اطفالي') ||
    normalized.includes('toddler') ||
    normalized.includes('baby boy')
  ) {
    return 'طفل';
  }

  // 5. بناتي (Girls)
  if (
    normalized.includes('بناتي') ||
    normalized.includes('بنات') ||
    normalized.includes('بنت') ||
    normalized.includes('بنوتات') ||
    normalized.includes('girls') ||
    normalized.includes('girl')
  ) {
    return 'بناتي';
  }

  // 6. ولادي (Boys)
  if (
    normalized.includes('ولادي') ||
    normalized.includes('اولاد') ||
    normalized.includes('ولد') ||
    normalized.includes('صبيان') ||
    normalized.includes('صبياني') ||
    normalized.includes('boys') ||
    normalized.includes('boy')
  ) {
    return 'ولادي';
  }

  // 7. شبابي (Youth / Teens)
  if (
    normalized.includes('شبابي') ||
    normalized.includes('شباب') ||
    normalized.includes('فتيان') ||
    normalized.includes('مراهقين') ||
    normalized.includes('youth') ||
    normalized.includes('teen')
  ) {
    return 'شبابي';
  }

  // 8. نسائي (Women)
  if (
    normalized.includes('نسائي') ||
    normalized.includes('نساء') ||
    normalized.includes('ستاتي') ||
    normalized.includes('ستات') ||
    normalized.includes('مدام') ||
    normalized.includes('حريمي') ||
    normalized.includes('women') ||
    normalized.includes('woman') ||
    normalized.includes('ladies') ||
    normalized.includes('lady')
  ) {
    return 'نسائي';
  }

  // 9. رجالي (Men)
  if (
    normalized.includes('رجالي') ||
    normalized.includes('رجال') ||
    normalized.includes('رجل') ||
    normalized.includes('men') ||
    normalized.includes('man')
  ) {
    return 'رجالي';
  }

  // If already assigned a valid showcase category, keep it
  if (product.showcaseCategory && VALID_SHOWCASE_CATEGORIES.includes(product.showcaseCategory as any)) {
    return product.showcaseCategory as ShowcaseCategoryType;
  }

  // Default fallback
  return 'رجالي';
}
