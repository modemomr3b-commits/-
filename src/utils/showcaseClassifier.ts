import { Product, Category } from '../types';
import menCategoryImg from '../assets/images/category_men_1787312072619.jpg';

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
  { id: 'نسائي', name: 'نسائي', icon: '👠', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=300' },
  { id: 'شبابي', name: 'شبابي', icon: '👟', image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=300' },
  { id: 'ولادي', name: 'ولادي', icon: '👦', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=300' },
  { id: 'بناتي', name: 'بناتي', icon: '👧', image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&q=80&w=300' },
  { id: 'طفل', name: 'طفل', icon: '🧒', image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&q=80&w=300' },
  { id: 'طفلة', name: 'طفلة', icon: '🎀', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=300' },
  { id: 'بيبي', name: 'بيبي', icon: '🍼', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=300' },
  { id: 'مواليد', name: 'مواليد', icon: '👶', image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?auto=format&fit=crop&q=80&w=300' },
  { id: 'الحقائب', name: 'الحقائب', icon: '👜', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&q=80&w=300' }
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
