import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findProducts() {
  const productsCol = collection(db, 'products');
  // Assuming 'المواد النافذة' might be a category name, I will look for it
  // Wait, the prompt says it was in 'المواد النافذة' and now it is in others.
  // I need to know the ID of 'المواد النافذة'.
  // Since I don't see it in the list, maybe it's not a category?
  // Let me re-read the list of categories.
  
  // Maybe I should search for products first and see what categories they have.
  const snapshot = await getDocs(productsCol);
  console.log("Total products:", snapshot.size);
  
  // Print some to check structure
  let count = 0;
  snapshot.forEach((doc) => {
    if (count < 5) {
      console.log(doc.id, doc.data());
      count++;
    }
  });
}

findProducts().catch(console.error);
