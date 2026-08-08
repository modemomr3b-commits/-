import { Product, Category } from '../types';

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
 * Universal product search function:
 * - Supports searching by code (productCode, modelNumber, barcode).
 * - Supports searching by article number inside product name or description.
 * - Supports Arabic/English digits normalization.
 * - Supports searching by category and subcategory names.
 */
export function filterProductsBySearch(
  products: Product[],
  rawQuery: string,
  categories: Category[] = []
): Product[] {
  if (!rawQuery || !rawQuery.trim()) return products;

  const normalizedQuery = normalizeDigits(rawQuery).toLowerCase().trim();
  if (!normalizedQuery) return products;

  // Clean query for tokens
  const cleanQuery = normalizedQuery.replace(/[-_]/g, ' ');
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  // Map categories for quick lookup
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  const exactCodeMatches: Product[] = [];
  const partialCodeMatches: Product[] = [];
  const generalMatches: Product[] = [];

  for (const p of products) {
    const code = normalizeDigits(p.productCode || '').toLowerCase().trim();
    const model = normalizeDigits(p.modelNumber || '').toLowerCase().trim();
    const barcode = normalizeDigits(p.barcode || '').toLowerCase().trim();
    const name = normalizeDigits(p.name || '').toLowerCase().trim();
    const catName = p.categoryId ? (categoryMap.get(p.categoryId) || '').toLowerCase() : '';
    const subCatName = p.subcategoryId ? (categoryMap.get(p.subcategoryId) || '').toLowerCase() : '';

    // 1. Exact code / model / barcode match
    if (
      (code && code === normalizedQuery) ||
      (model && model === normalizedQuery) ||
      (barcode && barcode === normalizedQuery)
    ) {
      exactCodeMatches.push(p);
      continue;
    }

    // 2. Partial code / model / barcode match
    if (
      (code && code.includes(normalizedQuery)) ||
      (model && model.includes(normalizedQuery)) ||
      (barcode && barcode.includes(normalizedQuery))
    ) {
      partialCodeMatches.push(p);
      continue;
    }

    // 3. Match across full text (name, code, model, barcode, categories)
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

  // Combine results with priority: exact code matches -> partial code matches -> general matches
  return [...exactCodeMatches, ...partialCodeMatches, ...generalMatches];
}
