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

export function isArchivedCategoryName(categoryName: string): boolean {
  if (!categoryName) return false;
  const norm = normalizeArabic(categoryName);
  return norm.includes('نافذ') || norm.includes('نفاذ') || norm.includes('نافد');
}

/**
 * Checks if a product belongs to a restricted or hidden category
 */
export function isProductRestrictedFromSearch(
  product: Product,
  categories: Category[] = []
): boolean {
  if (!product || product.isDeleted) return true;
  // Previously we restricted hidden/locked products here, but the new requirement
  // is to show all active published products to everyone.
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
const searchCache = new WeakMap<Product, { code: string; model: string; barcode: string; name: string; nameDigits: string; codeDigits: string; modelDigits: string; barcodeDigits: string; fullText: string }>();

function getProductSearchMeta(p: Product, categoryMap: Map<string, string>) {
  let meta = searchCache.get(p);
  if (!meta) {
    const code = normalizeDigits(p.productCode || '').toLowerCase().trim();
    const model = normalizeDigits(p.modelNumber || '').toLowerCase().trim();
    const barcode = normalizeDigits(p.barcode || '').toLowerCase().trim();
    const rawName = p.name || '';
    const name = normalizeDigits(rawName).toLowerCase().trim();
    const catName = p.categoryId ? (categoryMap.get(p.categoryId) || '').toLowerCase() : '';
    const subCatName = p.subcategoryId ? (categoryMap.get(p.subcategoryId) || '').toLowerCase() : '';
    
    meta = {
      code,
      model,
      barcode,
      name,
      nameDigits: name.replace(/\D/g, ''),
      codeDigits: code.replace(/\D/g, ''),
      modelDigits: model.replace(/\D/g, ''),
      barcodeDigits: barcode.replace(/\D/g, ''),
      fullText: [name, code, model, barcode, catName, subCatName].filter(Boolean).join(' ').replace(/[-_]/g, ' ')
    };
    searchCache.set(p, meta);
  }
  return meta;
}

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

  // Extract digits-only query if present (e.g. "551" or "10088")
  const digitsInQuery = normalizedQuery.replace(/\D/g, '');

  // Map categories for quick lookup
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  const exactCodeMatches: Product[] = [];
  const exactModelMatches: Product[] = [];
  const exactBarcodeMatches: Product[] = [];
  const partialCodeMatches: Product[] = [];
  const nameAndDigitsMatches: Product[] = [];
  const generalMatches: Product[] = [];

  for (const p of candidateProducts) {
    const meta = getProductSearchMeta(p, categoryMap);
    const { code, model, barcode, name, nameDigits, codeDigits, modelDigits, barcodeDigits, fullText } = meta;

    // 1. Exact code match
    if (code && code === normalizedQuery) {
      exactCodeMatches.push(p);
      continue;
    }

    // 2. Exact model match
    if (model && model === normalizedQuery) {
      exactModelMatches.push(p);
      continue;
    }

    // 3. Exact barcode match
    if (barcode && barcode === normalizedQuery) {
      exactBarcodeMatches.push(p);
      continue;
    }

    // 4. Partial code match
    if (code && code.includes(normalizedQuery)) {
      partialCodeMatches.push(p);
      continue;
    }

    // 5. Partial model or barcode match
    if (
      (model && model.includes(normalizedQuery)) ||
      (barcode && barcode.includes(normalizedQuery))
    ) {
      partialCodeMatches.push(p);
      continue;
    }

    // 6. If query has numbers or specific strings (e.g. "10088", "AB10088", "BLACK")
    if (
      name.includes(normalizedQuery) ||
      (digitsInQuery && digitsInQuery.length >= 2 && (
        name.includes(digitsInQuery) ||
        nameDigits.includes(digitsInQuery) ||
        codeDigits.includes(digitsInQuery) ||
        modelDigits.includes(digitsInQuery) ||
        barcodeDigits.includes(digitsInQuery)
      ))
    ) {
      const nonDigitTokens = queryTokens.filter(t => !/^\d+$/.test(t) && t !== 'ارت' && t !== 'art');
      const matchesNonDigits = nonDigitTokens.length === 0 || nonDigitTokens.every(t => fullText.includes(t));
      if (matchesNonDigits) {
        nameAndDigitsMatches.push(p);
        continue;
      }
    }

    // 7. Token-based general matching across all text fields
    const matchesAllTokens = queryTokens.every(token => fullText.includes(token));
    if (matchesAllTokens) {
      generalMatches.push(p);
    }
  }

  // Deduplicate results preserving priority order
  const resultMap = new Map<string, Product>();
  [
    ...exactCodeMatches,
    ...exactModelMatches,
    ...exactBarcodeMatches,
    ...partialCodeMatches,
    ...nameAndDigitsMatches,
    ...generalMatches
  ].forEach(p => {
    if (p.id && !resultMap.has(p.id)) {
      resultMap.set(p.id, p);
    }
  });

  return Array.from(resultMap.values());
}

