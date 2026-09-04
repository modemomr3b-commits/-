import { Product, Category } from '../types';
import { detectStoreMainSection } from './productFolderClassifier';
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
 * by analyzing its category, subcategory, name, product code, and attributes.
 */
export function detectShowcaseCategory(
  product: Partial<Product>,
  categories?: Category[] | string
): ShowcaseCategoryType {
  // If already assigned a valid showcase category, respect it
  if (product.showcaseCategory && VALID_SHOWCASE_CATEGORIES.includes(product.showcaseCategory as any)) {
    return product.showcaseCategory as ShowcaseCategoryType;
  }

  return detectStoreMainSection(product, categories) as ShowcaseCategoryType;
}
