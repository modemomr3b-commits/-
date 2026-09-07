/**
 * Utility for matching image filenames with product Art Numbers (رقم الموديل / الآرت نمبر / كود المنتج)
 */

export interface ExtractedProductCode {
  raw: string;
  normalized: string;
  pureDigits: string;
  tokens: string[];
}

/**
 * Normalizes an art number or string by stripping symbols, whitespace and converting to uppercase
 */
export function normalizeCode(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9\u0600-\u06FF]/gi, '')
    .trim();
}

/**
 * Normalizes only alphanumeric Latin + Digits (ignoring Arabic words for strict code matching)
 */
export function normalizeAlphaNumeric(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/gi, '')
    .trim();
}

/**
 * Extracts potential Art Numbers / Model Codes from a product name and its fields
 * Examples:
 * - "رياضة رجالي XD-83649" -> ["XD-83649", "XD83649", "83649"]
 * - "حذاء كاجوال 5582" -> ["5582"]
 * - "سليبر طبي A-102" -> ["A-102", "A102", "102"]
 * - "بوط نسائي كود: K-9901 أسود" -> ["K-9901", "K9901", "9901"]
 */
export function extractProductCodes(product: {
  name?: string;
  productCode?: string;
  modelNumber?: string;
  barcode?: string;
}): ExtractedProductCode {
  const codes: string[] = [];
  const name = product.name || '';

  // 1. Direct fields if present (highest priority)
  if (product.productCode) codes.push(product.productCode.trim());
  if (product.modelNumber) codes.push(product.modelNumber.trim());
  if (product.barcode) codes.push(product.barcode.trim());

  if (name) {
    const trimmed = name.trim();

    // Check for explicit art/code keywords (e.g. "آرت 83649", "كود XD-83649", "رقم 1205")
    const explicitRegex = /(?:آرت|كود|رقم|ارت|art|code|no|#)[:\s]*([A-Za-z0-9-_/]+)/gi;
    let explicitMatch;
    while ((explicitMatch = explicitRegex.exec(trimmed)) !== null) {
      if (explicitMatch[1] && explicitMatch[1].length >= 2) {
        codes.push(explicitMatch[1]);
      }
    }

    // Split words
    const words = trimmed.split(/\s+/);

    // Common pattern: The last word in name is often the Art Number (e.g. "رياضة رجالي XD-83649")
    if (words.length > 0) {
      const lastWord = words[words.length - 1];
      if (/[0-9a-zA-Z]/.test(lastWord)) {
        // Exclude shoe sizes (36 to 46)
        const isShoeSize = /^(3[6-9]|4[0-6])$/.test(lastWord);
        if (!isShoeSize) {
          codes.push(lastWord);
        }
      }
    }

    // Extract any token with letters+digits or digits
    const codeRegex = /[A-Za-z0-9]+(?:[-_/.][A-Za-z0-9]+)*/g;
    let match;
    while ((match = codeRegex.exec(trimmed)) !== null) {
      const token = match[0];
      const isPureDigits = /^\d+$/.test(token);
      const isShoeSize = isPureDigits && /^(3[6-9]|4[0-6])$/.test(token);

      if (!isShoeSize) {
        if (isPureDigits && token.length >= 3) {
          codes.push(token);
        } else if (!isPureDigits && token.length >= 2) {
          codes.push(token);
        }
      }
    }
  }

  // Deduplicate and filter
  const uniqueTokens = Array.from(new Set(codes.map(c => c.trim()).filter(Boolean)));
  
  const raw = uniqueTokens.join(' ');
  const normalized = normalizeAlphaNumeric(raw);
  const pureDigits = raw.replace(/\D/g, '');

  return {
    raw,
    normalized,
    pureDigits,
    tokens: uniqueTokens
  };
}

/**
 * Extracts potential Art Numbers / Model Codes from an image filename with high precision
 */
export function extractImageCodes(filename: string): ExtractedProductCode {
  // Remove file extension
  const baseName = filename.replace(/\.[^/.]+$/, '').trim();

  // Strip common camera prefixes and copy suffixes
  const cleaned = baseName
    .replace(/^(IMG|DSC|PHOTO|IMAGE|PIC)[-_]/gi, '')
    .replace(/\(\d+\)/g, ' ')
    .replace(/[_-]\d+$/g, '')
    .trim();

  const codes: string[] = [baseName, cleaned];

  // Extract alphanumeric tokens
  const codeRegex = /[A-Za-z0-9]+(?:[-_/.][A-Za-z0-9]+)*/g;
  let match;
  while ((match = codeRegex.exec(cleaned)) !== null) {
    const token = match[0];
    if (token.length >= 2) {
      codes.push(token);
    }
  }

  // Extract standalone digits (at least 3 digits)
  const digitMatches = cleaned.match(/\b\d{3,}\b/g);
  if (digitMatches) {
    codes.push(...digitMatches);
  }

  const uniqueTokens = Array.from(new Set(codes.map(c => c.trim()).filter(Boolean)));
  const raw = uniqueTokens.join(' ');
  const normalized = normalizeAlphaNumeric(raw);
  const pureDigits = raw.replace(/\D/g, '');

  return {
    raw: baseName,
    normalized,
    pureDigits,
    tokens: uniqueTokens
  };
}

/**
 * Checks whether an image matches a product by its Art Number / Code with high precision
 */
export function calculateMatchScore(
  productCodeInfo: ExtractedProductCode,
  imageCodeInfo: ExtractedProductCode,
  productName: string = ''
): { isMatch: boolean; score: number; matchedBy: string } {
  if (productCodeInfo.tokens.length === 0 || imageCodeInfo.tokens.length === 0) {
    return { isMatch: false, score: 0, matchedBy: '' };
  }

  const pTokens = productCodeInfo.tokens;
  const iTokens = imageCodeInfo.tokens;

  // 1. Exact raw token match
  for (const pt of pTokens) {
    for (const it of iTokens) {
      if (pt.toUpperCase() === it.toUpperCase() && pt.length >= 2) {
        return { isMatch: true, score: 100, matchedBy: `تطابق تام ومباشر للآرت نمبر: ${pt}` };
      }
    }
  }

  // 2. Exact normalized alphanumeric match (e.g. "XD-83649" === "XD83649")
  for (const pt of pTokens) {
    const normP = normalizeAlphaNumeric(pt);
    if (!normP || normP.length < 2) continue;

    for (const it of iTokens) {
      const normI = normalizeAlphaNumeric(it);
      if (!normI || normI.length < 2) continue;

      if (normP === normI) {
        return { isMatch: true, score: 98, matchedBy: `تطابق تام للآرت نمبر بدون فواصل: ${pt}` };
      }
    }
  }

  // 3. Image with angle suffix (e.g. "XD-83649_1")
  for (const pt of pTokens) {
    const normP = normalizeAlphaNumeric(pt);
    if (!normP || normP.length < 3) continue;

    for (const it of iTokens) {
      const normI = normalizeAlphaNumeric(it);
      if (!normI || normI.length < 3) continue;

      if (normI.startsWith(normP) && (normI.length === normP.length + 1 || normI.length === normP.length + 2)) {
        return { isMatch: true, score: 92, matchedBy: `تطابق للآرت نمبر مع زاوية/تكرار: ${pt}` };
      }
    }
  }

  return { isMatch: false, score: 0, matchedBy: '' };
}

/**
 * Reads and optimizes an image file into a compressed Base64 data URL
 */
export async function processImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل تحميل محتوى الصورة'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 850;
        const MAX_HEIGHT = 850;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        } else {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
