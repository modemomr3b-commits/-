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
 * - Supports searching by article number / numbers in name or description.
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

  // Extract digits-only query if present (e.g. "551" from "art 551" or "ارت 551")
  const digitsInQuery = normalizedQuery.replace(/\D/g, '');

  // Map categories for quick lookup
  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  const exactMatches: Product[] = [];
  const partialMatches: Product[] = [];
  const generalMatches: Product[] = [];

  for (const p of products) {
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

