import { supabase } from './src/supabase';

async function run() {
  const { data: cat } = await supabase.from('categories').select('id').limit(1);
  const catId = cat?.[0]?.id || null;
  const payload = {
    name: "Test Product " + Date.now(),
    price: 108000,
    modelNumber: "123",
    productCode: "123",
    barcode: "123",
    categoryId: catId,
    imageUrl: "test",
    isArchived: false,
    views: 0,
    dozenPriceUsd: 72,
    packaging: "18",
    piecesCount: 18,
    piecePriceUsd: 4,
    piecePriceIqd: 6000
  };
  const { data, error } = await supabase.from('products').insert(payload).select().single();
  console.log('Inserted:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
run();
