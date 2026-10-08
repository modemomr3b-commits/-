
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uxlmpuqnkjfyzroqwwgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4bG1wdXFua2pmeXpyb3F3d2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU1MTIsImV4cCI6MjA5NzM4MTUxMn0.oDX_i_1DlWcUEJQnLQDoG5s5IipN7ympUd4SFvEaWqA';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normalizes Arabic text for flexible matching:
 */
function normalizeArabic(text) {
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

function autoDetectCategoryAndSubcategory(name, currentCategoryId, currentSubcategoryId, categories = []) {
  if (!name || categories.length === 0) return { categoryId: currentCategoryId || null, subcategoryId: currentSubcategoryId || null };
  const normName = normalizeArabic(name);
  const allSubcategories = categories.filter(c => Boolean(c.parentId));

  for (const sub of allSubcategories) {
    const normSub = normalizeArabic(sub.name);
    if (normSub && normName.includes(normSub)) {
      return { categoryId: sub.parentId || null, subcategoryId: sub.id };
    }
  }

  // Check main categories
  const mainCategories = categories.filter(c => !c.parentId);
  for (const mainCat of mainCategories) {
    const normMain = normalizeArabic(mainCat.name);
    if (normMain && normName.includes(normMain)) {
      return { categoryId: mainCat.id, subcategoryId: null };
    }
  }

  return { categoryId: currentCategoryId || null, subcategoryId: currentSubcategoryId || null };
}

async function run() {
  console.log('Starting restoration...');
  
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 'app_settings').single();
  const rate = settings?.data?.usdExchangeRate || 1590;
  console.log('Using exchange rate:', rate);

  const { data: categories } = await supabase.from('categories').select('*');
  console.log('Fetched categories:', categories.length);

  const archivedCatId = categories.find(c => {
    const n = normalizeArabic(c.name);
    return n.includes('نافذ') || n.includes('نفاذ');
  })?.id;
  
  const newArrivalsCatId = categories.find(c => !c.parentId && normalizeArabic(c.name) === normalizeArabic('جديد الوفاء'))?.id;

  // Process products in chunks
  let offset = 0;
  const limit = 1000;
  let totalProcessed = 0;

  while (true) {
    const { data: products, error } = await supabase.from('products').select('*').range(offset, offset + limit - 1);
    if (error || !products || products.length === 0) break;

    const updates = [];
    for (const p of products) {
      let finalCatId = p.categoryId;
      let finalSubCatId = p.subcategoryId;
      let changed = false;

      const isArchived = p.isArchived || (archivedCatId && p.categoryId === archivedCatId);

      if (isArchived && archivedCatId) {
        if (p.categoryId !== archivedCatId) {
          finalCatId = archivedCatId;
          finalSubCatId = null;
          changed = true;
        }
      } else if (!finalCatId || finalCatId === "" || finalCatId === "null") {
        const detected = autoDetectCategoryAndSubcategory(p.name, '', '', categories);
        if (detected.categoryId) {
          finalCatId = detected.categoryId;
          finalSubCatId = detected.subcategoryId;
          changed = true;
        } else {
          const showcaseCat = p.showcaseCategory || p.size?.showcaseCategory;
          if (showcaseCat) {
            const matchedCat = categories.find(c => !c.parentId && normalizeArabic(c.name).includes(normalizeArabic(showcaseCat)));
            if (matchedCat) {
              finalCatId = matchedCat.id;
              const subDetected = autoDetectCategoryAndSubcategory(p.name, matchedCat.id, '', categories);
              finalSubCatId = subDetected.subcategoryId;
              changed = true;
            }
          }
        }

        if (!finalCatId && newArrivalsCatId) {
          finalCatId = newArrivalsCatId;
          const subDetected = autoDetectCategoryAndSubcategory(p.name, newArrivalsCatId, '', categories);
          finalSubCatId = subDetected.subcategoryId;
          changed = true;
        }
      }

      // Also update prices if missing or zero
      if (p.dozenPriceUsd > 0 && (!p.price || p.price === 0)) {
        const iqdPrice = Math.round(p.dozenPriceUsd * rate);
        const piecePrice = Math.round(iqdPrice / (p.piecesCount || 12));
        p.price = iqdPrice;
        p.piecePriceIqd = piecePrice;
        changed = true;
      }

      if (changed) {
        updates.push({
          id: p.id,
          categoryId: finalCatId,
          subcategoryId: finalSubCatId,
          price: p.price,
          piecePriceIqd: p.piecePriceIqd,
          updatedAt: Date.now()
        });
      }
    }

    if (updates.length > 0) {
      console.log(`Updating ${updates.length} products in current batch...`);
      // Upsert to handle updates
      const { error: updateError } = await supabase.from('products').upsert(updates, { onConflict: 'id' });
      if (updateError) {
        console.error('Update error:', updateError);
      }
    }

    totalProcessed += products.length;
    console.log(`Processed ${totalProcessed} products so far...`);
    offset += limit;
    if (products.length < limit) break;
  }

  console.log('Restoration complete!');
}

run();
