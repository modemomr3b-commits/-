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
 * Normalizes Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and Extended Arabic-Indic digits (۰۱۲۳۴۵۶۷۸۹)
 * to standard ASCII digits (0123456789).
 */
export function normalizeDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString())
    .replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString());
}

/**
 * Checks if a category name is one of the restricted categories:
 * 1. قسم المواد المقفلة من قبل الادمن (Locked products by admin)
 * 2. قسم الموديلات متابعة (Follow-up models)
 */
export function isRestrictedCategoryName(categoryName: string): boolean {
  if (!categoryName) return false;
  const norm = normalizeArabic(categoryName);
  
  // 1. المواد المقفلة من قبل الادمن
  if (
    (norm.includes('مقفل') && (norm.includes('ادمن') || norm.includes('اداره') || norm.includes('مواد') || norm.includes('مدير'))) ||
    norm.includes('المواد المقفله') ||
    norm.includes('مواد مقفله') ||
    norm.includes('مقفل من قبل') ||
    norm.includes('مقفله من قبل')
  ) {
    return true;
  }

  // 2. قسم الموديلات متابعة
  if (
    (norm.includes('موديل') && norm.includes('متابع')) ||
    norm.includes('الموديلات متابعه') ||
    norm.includes('موديلات متابعه') ||
    norm.includes('متابعه الموديلات') ||
    norm.includes('موديلات للمتابعه') ||
    norm.includes('قسم المتابعه') ||
    norm.includes('قسم متابعه') ||
    norm === 'متابعه' ||
    norm === 'المتابعه' ||
    norm === 'موديلات متابعه' ||
    norm === 'الموديلات متابعه'
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a product belongs to a restricted or hidden category
 */
export function isProductRestrictedFromSearch(
  product: Product,
  categories: Category[] = []
): boolean {
  if (!product) return false;

  // If product itself is marked locked
  if (product.isLocked) {
    return true;
  }

  const categoryMap = new Map<string, Category>();
  categories.forEach(c => categoryMap.set(c.id, c));

  // Check categoryId
  if (product.categoryId) {
    const cat = categoryMap.get(product.categoryId);
    if (cat) {
      if (cat.isHidden || isRestrictedCategoryName(cat.name)) {
        return true;
      }
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent && (parent.isHidden || isRestrictedCategoryName(parent.name))) {
          return true;
        }
      }
    }
  }

  // Check subcategoryId
  if (product.subcategoryId) {
    const subcat = categoryMap.get(product.subcategoryId);
    if (subcat) {
      if (subcat.isHidden || isRestrictedCategoryName(subcat.name)) {
        return true;
      }
      if (subcat.parentId) {
        const parent = categoryMap.get(subcat.parentId);
        if (parent && (parent.isHidden || isRestrictedCategoryName(parent.name))) {
          return true;
        }
      }
    }
  }

  // Check showcase category or metadata
  if (product.showcaseCategory && isRestrictedCategoryName(product.showcaseCategory)) {
    return true;
  }

  return false;
}

export interface SearchOptions {
  includeRestricted?: boolean;
}

/**
 * Universal product search function:
 * - Automatically excludes products in restricted categories ("المواد المقفلة من قبل الادمن", "الموديلات متابعة", hidden categories)
 * - Supports searching by code (productCode, modelNumber, barcode).
 * - Supports searching by article number / numbers in name or description.
 * - Supports Arabic/English digits normalization.
 * - Supports searching by category and subcategory names.
 */
export function filterProductsBySearch(
  products: Product[],
  rawQuery: string,
  categories: Category[] = [],
  options: SearchOptions = {}
): Product[] {
  if (!products || products.length === 0) return [];

  // Filter out restricted products unless explicitly requested (e.g. for admin management)
  const candidateProducts = options.includeRestricted
    ? products
    : products.filter(p => !isProductRestrictedFromSearch(p, categories));

  if (!rawQuery || !rawQuery.trim()) return candidateProducts;

  const normalizedQuery = normalizeDigits(rawQuery).toLowerCase().trim();
  if (!normalizedQuery) return candidateProducts;

  // Clean query for tokens
  const cleanQuery = normalizedQuery.replace(/[-_]/g, ' ');
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  // Extract digits-only query if present (e.g. "551" from "art 551" or "ارت 551")
  const digitsInQuery = normalizedQuery.replace(/\D/g, '');

  // Map categories for quick lookup
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  const exactMatches: Product[] = [];
  const partialMatches: Product[] = [];
  const generalMatches: Product[] = [];

  for (const p of candidateProducts) {
    const code = normalizeDigits(p.productCode || '').toLowerCase().trim();
    const model = normalizeDigits(p.modelNumber || '').toLowerCase().trim();
    const barcode = normalizeDigits(p.barcode || '').toLowerCase().trim();
    const rawName = p.name || '';
    const name = normalizeDigits(rawName).toLowerCase().trim();
    const catName = p.categoryId ? (categoryMap.get(p.categoryId) || '').toLowerCase() : '';
    const subCatName = p.subcategoryId ? (categoryMap.get(p.subcategoryId) || '').toLowerCase() : '';

    // 1. Exact code / model / barcode match
    if (
      (code && code === normalizedQuery) ||
      (model && model === normalizedQuery) ||
      (barcode && barcode === normalizedQuery)
    ) {
      exactMatches.push(p);
      continue;
    }

    // 2. Partial code / model / barcode / name match
    if (
      (code && code.includes(normalizedQuery)) ||
      (model && model.includes(normalizedQuery)) ||
      (barcode && barcode.includes(normalizedQuery))
    ) {
      partialMatches.push(p);
      continue;
    }

    // 3. If query has specific numbers (e.g. "551" or "ارت 551"), check if product name or code contains that number sequence
    if (digitsInQuery && digitsInQuery.length >= 2) {
      const nameDigits = name.replace(/\D/g, '');
      const codeDigits = code.replace(/\D/g, '');
      const modelDigits = model.replace(/\D/g, '');
      const barcodeDigits = barcode.replace(/\D/g, '');

      if (
        name.includes(digitsInQuery) ||
        code.includes(digitsInQuery) ||
        model.includes(digitsInQuery) ||
        barcode.includes(digitsInQuery) ||
        nameDigits.includes(digitsInQuery) ||
        codeDigits.includes(digitsInQuery) ||
        modelDigits.includes(digitsInQuery) ||
        barcodeDigits.includes(digitsInQuery)
      ) {
        const nonDigitTokens = queryTokens.filter(t => !/^\d+$/.test(t) && t !== 'ارت' && t !== 'art');
        const fullText = [name, code, model, barcode, catName, subCatName].join(' ');
        const matchesNonDigits = nonDigitTokens.every(t => fullText.includes(t));

        if (matchesNonDigits) {
          partialMatches.push(p);
          continue;
        }
      }
    }

    // 4. Token-based general matching across all text fields
    const fullText = [
      name,
      code,
      model,
      barcode,
      catName,
      subCatName
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/[-_]/g, ' ');

    const matchesAllTokens = queryTokens.every(token => fullText.includes(token));
    if (matchesAllTokens) {
      generalMatches.push(p);
    }
  }

  // Deduplicate results
  const resultMap = new Map<string, Product>();
  [...exactMatches, ...partialMatches, ...generalMatches].forEach(p => {
    if (p.id && !resultMap.has(p.id)) {
      resultMap.set(p.id, p);
    }
  });

  return Array.from(resultMap.values());
}

