import { Category } from '../types';

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
 * Common keyword mappings for subcategories & categories
 */
const CATEGORY_KEYWORDS: Array<{
  keys: string[];
  targetTerms: string[];
  subTerms?: string[];
}> = [
  // 1. روضة / حضانة (Subcategory: روضة)
  {
    keys: ['روضه', 'روضة', 'الروضه', 'الروضة', 'روضات', 'رياض', 'حضانة', 'حضانه', 'حضانات', 'kindergarten', 'preschool', 'kg'],
    targetTerms: ['روض', 'رياض', 'حضان'],
    subTerms: ['روض', 'رياض', 'حضان']
  },
  // 2. مواليد
  {
    keys: ['مواليد', 'مولود', 'حديث الولاده', 'حديث الولادة', 'حديثي الولاده', 'newborn', 'infant'],
    targetTerms: ['مواليد', 'مولود'],
    subTerms: ['مواليد', 'مولود']
  },
  // 3. بيبي / رضع
  {
    keys: ['بيبي', 'رضع', 'رضيع', 'baby'],
    targetTerms: ['بيبي', 'رضع', 'مواليد'],
    subTerms: ['بيبي', 'رضع', 'مواليد']
  },
  // 4. طفلة
  {
    keys: ['طفله', 'طفلة', 'طفلات', 'baby girl'],
    targetTerms: ['طفل', 'بنات'],
    subTerms: ['طفل', 'طفله', 'طفلة', 'بنات']
  },
  // 5. طفل / أطفال
  {
    keys: ['طفل', 'اطفال', 'أطفال', 'اطفالي', 'toddler', 'kids', 'baby boy'],
    targetTerms: ['طفل', 'اطفال'],
    subTerms: ['طفل', 'اطفال']
  },
  // 6. بناتي
  {
    keys: ['بناتي', 'بناتيه', 'بناتية', 'بنات', 'بنت', 'بنوتات', 'بنوته', 'بنوتة', 'girl', 'girls'],
    targetTerms: ['بنات', 'بنت'],
    subTerms: ['بنات', 'بنت', 'بنوت']
  },
  // 7. ولادي
  {
    keys: ['ولادي', 'ولاديه', 'ولادية', 'اولاد', 'أولاد', 'ولد', 'صبيان', 'صبياني', 'boys', 'boy'],
    targetTerms: ['ولاد', 'ولد', 'اولاد'],
    subTerms: ['ولاد', 'ولد', 'اولاد', 'صبيان']
  },
  // 8. شبابي
  {
    keys: ['شبابي', 'شبابيه', 'شبابية', 'شباب', 'فتيان', 'فتيات', 'youth', 'teen', 'teens'],
    targetTerms: ['شباب', 'فتيان'],
    subTerms: ['شباب', 'فتيان']
  },
  // 9. نسائي
  {
    keys: ['نسائي', 'نسائيه', 'نسائية', 'نساء', 'ستاتي', 'سيدات', 'حريمي', 'women', 'woman', 'ladies'],
    targetTerms: ['نسائ', 'نساء', 'ستات'],
    subTerms: ['نسائ', 'نساء', 'ستات', 'سيدات']
  },
  // 10. رجالي
  {
    keys: ['رجالي', 'رجاليه', 'رجالية', 'رجال', 'men', 'man', 'gents'],
    targetTerms: ['رجال', 'رجالي'],
    subTerms: ['رجال', 'رجالي']
  },
  // 11. مدرسي / ابتدائي / اعدادي / متوسط / ثانوي
  {
    keys: ['مدرسي', 'مدرسه', 'مدرسة', 'مدارس', 'اعدادي', 'اعداديه', 'اعدادية', 'ابتدائي', 'ابتدائيه', 'ابتدائية', 'متوسط', 'متوسطه', 'متوسطة', 'ثانوي', 'ثانويه', 'ثانوية', 'school'],
    targetTerms: ['مدرس', 'مدارس', 'اعدادي', 'ابتدائي', 'متوسط', 'ثانوي'],
    subTerms: ['مدرس', 'مدارس', 'اعدادي', 'ابتدائي', 'متوسط', 'ثانوي']
  },
  // 12. سفر
  {
    keys: ['سفر', 'سياحه', 'سياحة', 'travel', 'luggage'],
    targetTerms: ['سفر', 'حقائب'],
    subTerms: ['سفر']
  },
  // 13. أنواع الحقائب (ظهر / كتف / يد / كروس / مكياج)
  {
    keys: ['ظهر', 'backpack'],
    targetTerms: ['ظهر'],
    subTerms: ['ظهر']
  },
  {
    keys: ['كتف', 'shoulder'],
    targetTerms: ['كتف'],
    subTerms: ['كتف']
  },
  {
    keys: ['كروس', 'cross'],
    targetTerms: ['كروس'],
    subTerms: ['كروس']
  },
  {
    keys: ['يد', 'يدوي', 'handbag'],
    targetTerms: ['يد'],
    subTerms: ['يد']
  },
  {
    keys: ['مكياج', 'تجميل'],
    targetTerms: ['مكياج'],
    subTerms: ['مكياج']
  }
];

/**
 * Finds the best matching subcategory given a categoryId and product name.
 * Priority:
 * 1. Subcategories belonging to the specified categoryId
 * 2. If no categoryId or not found, checks all subcategories across the system
 */
export function autoSelectSubcategory(
  name: string,
  categoryId?: string,
  currentSubcategoryId?: string,
  categories: Category[] = []
): string {
  if (!name || categories.length === 0) return currentSubcategoryId || '';

  const normName = normalizeArabic(name);
  if (!normName) return currentSubcategoryId || '';

  // 1. Subcategories under the specified parent category
  const subsForCategory = categoryId ? categories.filter(c => c.parentId === categoryId) : [];
  
  // 2. All subcategories in system
  const allSubcategories = categories.filter(c => Boolean(c.parentId));

  const matchInList = (list: Category[]): string | null => {
    if (list.length === 0) return null;

    // A. Direct subcategory name match: e.g. subcategory is named "روضة" or "حقائب روضة"
    for (const sub of list) {
      const normSub = normalizeArabic(sub.name);
      if (normSub && (normName.includes(normSub) || normSub.includes(normName))) {
        return sub.id;
      }
    }

    // B. Keyword mapping matches
    for (const entry of CATEGORY_KEYWORDS) {
      const hasKey = entry.keys.some(k => normName.includes(normalizeArabic(k)));
      if (hasKey) {
        const searchTerms = entry.subTerms || entry.targetTerms;
        const foundSub = list.find(s => {
          const normSub = normalizeArabic(s.name);
          return searchTerms.some(term => normSub.includes(normalizeArabic(term)));
        });
        if (foundSub) {
          return foundSub.id;
        }
      }
    }

    return null;
  };

  // Check subcategories of the active category first
  if (subsForCategory.length > 0) {
    const matched = matchInList(subsForCategory);
    if (matched) return matched;
  }

  // If no categoryId was provided, search among all subcategories
  if (!categoryId) {
    const matchedInAll = matchInList(allSubcategories);
    if (matchedInAll) return matchedInAll;
  }

  return currentSubcategoryId || '';
}

/**
 * Intelligently detects Subcategory and (if not yet chosen) Main Category from the product name.
 * If the user already selected a categoryId, it keeps the categoryId and sets the matching Subcategory.
 */
export function autoDetectCategoryAndSubcategory(
  name: string,
  currentCategoryId?: string,
  currentSubcategoryId?: string,
  categories: Category[] = []
): { categoryId: string; subcategoryId: string } {
  if (!name || categories.length === 0) {
    return {
      categoryId: currentCategoryId || '',
      subcategoryId: currentSubcategoryId || ''
    };
  }
  const normName = normalizeArabic(name);
  const mainCategories = categories.filter(c => !c.parentId);
  const allSubcategories = categories.filter(c => Boolean(c.parentId));

  // 1. ALWAYS check if any subcategory directly matches the name globally (e.g. 'روضة', 'رجالي', 'نسائي')
  for (const sub of allSubcategories) {
    const normSub = normalizeArabic(sub.name);
    if (normSub && normName.includes(normSub)) {
      return {
        categoryId: sub.parentId || '',
        subcategoryId: sub.id
      };
    }
  }

  // 2. ALWAYS check keyword mappings globally against all subcategories
  for (const entry of CATEGORY_KEYWORDS) {
    const hasKey = entry.keys.some(k => normName.includes(normalizeArabic(k)));
    if (hasKey) {
      const searchTerms = entry.subTerms || entry.targetTerms;
      const foundSub = allSubcategories.find(s => {
        const normSub = normalizeArabic(s.name);
        return searchTerms.some(term => normSub.includes(normalizeArabic(term)));
      });
      if (foundSub) {
        return {
          categoryId: foundSub.parentId || '',
          subcategoryId: foundSub.id
        };
      }
    }
  }

  // 3. If user already chose a categoryId and no global keyword matched, fallback to detecting under currentCategoryId
  if (currentCategoryId) {
    const detectedSub = autoSelectSubcategory(name, currentCategoryId, currentSubcategoryId, categories);
    return {
      categoryId: currentCategoryId,
      subcategoryId: detectedSub
    };
  }

  // 4. Check direct match on main categories
  let detectedMainCatId = '';
  for (const mainCat of mainCategories) {
    const normMain = normalizeArabic(mainCat.name);
    if (normMain && normName.includes(normMain)) {
      detectedMainCatId = mainCat.id;
      break;
    }
  }
  if (detectedMainCatId) {
    const detectedSub = autoSelectSubcategory(name, detectedMainCatId, '', categories);
    return {
      categoryId: detectedMainCatId,
      subcategoryId: detectedSub
    };
  }

  return {
    categoryId: currentCategoryId || '',
    subcategoryId: currentSubcategoryId || ''
  };
}

/**
 * Smart detection of main category ID for existing product records
 */
export function smartDetectMainCategoryId(
  product: { name?: string; categoryId?: string; subcategoryId?: string },
  categories: Category[] = []
): string {
  const catObj = categories.find(c => c.id === product.categoryId);
  const subObj = categories.find(c => c.id === product.subcategoryId);
  const combined = `${product.name || ''} ${catObj ? catObj.name : ''} ${subObj ? subObj.name : ''}`;
  const mainCategories = categories.filter(c => !c.parentId);

  if (mainCategories.length === 0) return '';

  const { categoryId } = autoDetectCategoryAndSubcategory(combined, '', '', categories);
  if (categoryId) return categoryId;

  // Fallback to first category if none matched
  return mainCategories[0]?.id || '';
}
