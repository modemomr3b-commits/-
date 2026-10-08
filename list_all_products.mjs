import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findProducts() {
  const productsCol = collection(db, 'products');
  const snapshot = await getDocs(productsCol);
  
  // Looking for something that might be 'المواد النافذة'
  // I will check the products and see if they have any field that could indicate this
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    // Maybe check if any field has 'نافذة' or similar?
    // Based on the user request, it might be a specific state or category
    
    // I'll print all products to find what they have
    console.log(JSON.stringify({id: doc.id, ...data}));
  });
}

findProducts().catch(console.error);
