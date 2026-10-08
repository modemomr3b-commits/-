import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function fixProducts() {
  const productsCol = collection(db, 'products');
  const snapshot = await getDocs(productsCol);
  
  // Looking for products that were in 'المواد النافذة'
  // and need to be restored.
  // The user says "what they were in the expired materials"
  // I need to look for a way to identify these.
  
  // Maybe I can look for a category that fits 'المواد النافذة'.
  // The search utility has patterns: ['نافذ', 'نفاذ', 'نافد', 'sold out', 'archived', 'stock out']
  
  // Let's find the category ID for 'المواد النافذة'.
  const catsCol = collection(db, 'categories');
  const catsSnapshot = await getDocs(catsCol);
  let archivedCatId = '';
  catsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && (data.name.includes('نافذ') || data.name.includes('نفاذ') || data.name.includes('أرشيف'))) {
          console.log("Found archived category:", doc.id, data.name);
          archivedCatId = doc.id;
      }
  });

  if (!archivedCatId) {
      console.log("Archived category not found.");
      return;
  }

  // Now find products that were in this category.
  let count = 0;
  snapshot.forEach(async (productDoc) => {
      const data = productDoc.data();
      if (data.categoryId === archivedCatId) {
          console.log("Product to restore:", productDoc.id, data.name);
          // Restore: Set archived to false?
          // Based on ProductManager.tsx (lines 925+)
          // const updates: any = { categoryId: archivedCatId, isArchived: false, isHidden: false, isLocked: false, isShowcase: false };
          // The code in handleToggleArchive moves it INTO the archived category.
          // To restore, I should probably move it OUT of the archived category.
          // But I don't know which category it came from.
          
          // Maybe I can look for products that ARE in the archived category but should not be.
          count++;
      }
  });
  console.log("Total products in archived category:", count);
}

fixProducts().catch(console.error);
