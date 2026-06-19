import { api } from './src/api.js';

const CATEGORIES = [
  { name: 'جديد الوفاء', order: 1 },
  { name: 'جديد لاستيك & ايفا', order: 2 },
  { name: 'جديد تركي', order: 3 },
  { name: 'سكيجر راقي', order: 4 },
  { name: 'جديد الوفاء مدرسي & سفر', order: 5 },
  { name: 'صيفي', order: 6 },
  { name: 'تحطيم الأسعار', order: 7 },
];

async function seed() {
  for (const cat of CATEGORIES) {
    try {
      const res = await api.createCategory({ name: cat.name, order: cat.order, parentId: null });
      console.log('Seeded:', res);
    } catch (e) {
      console.error(e);
    }
  }
}
seed();
