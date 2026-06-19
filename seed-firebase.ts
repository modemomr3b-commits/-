import { api } from './src/api.js';

// Define categories and subcategories
const CATEGORIES = [
  { name: 'جديد الوفاء', order: 1, subs: ['ولادي', 'بناتي', 'محير'] },
  { name: 'جديد لاستيك & ايفا', order: 2, subs: ['رجالي', 'نسائي'] },
  { name: 'جديد تركي', order: 3, subs: ['رجالي', 'نسائي', 'ولادي'] },
  { name: 'سكيجر راقي', order: 4, subs: ['رجالي', 'نسائي'] },
  { name: 'جديد الوفاء مدرسي & سفر', order: 5, subs: ['مدرسي', 'سفر'] },
  { name: 'صيفي', order: 6, subs: [] },
  { name: 'تحطيم الأسعار', order: 7, subs: [] },
];

async function seed() {
  for (const cat of CATEGORIES) {
    try {
      const parent = await api.createCategory({ name: cat.name, order: cat.order, parentId: null, isHidden: false });
      console.log('Seeded Parent:', parent.name);
      
      let subOrder = 1;
      for (const sub of cat.subs) {
        await api.createCategory({ name: sub, order: subOrder++, parentId: parent.id, isHidden: false });
      }
    } catch (e) {
      console.error(e);
    }
  }
}
seed();
