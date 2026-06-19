import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

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
  console.log('Fetching existing...');
  try {
     const existing = await getDocs(collection(db, "categories"));
     if (existing.docs.length > 0) {
       console.log('Categories already seeded, skipping.');
       process.exit(0);
     }
  } catch (e) { console.error('Error fetching:', e); }

  console.log('Inserting...');
  for (const cat of CATEGORIES) {
    try {
      const parentRef = await addDoc(collection(db, "categories"), { name: cat.name, order: cat.order, parentId: null, isHidden: false });
      console.log('Seeded:', cat.name);
      
      let subOrder = 1;
      for (const sub of cat.subs) {
        await addDoc(collection(db, "categories"), { name: sub, order: subOrder++, parentId: parentRef.id, isHidden: false });
        console.log('  Seeded sub:', sub);
      }
    } catch (e) {
      console.error('Error inserting:', e);
    }
  }
  process.exit(0);
}
seed();
