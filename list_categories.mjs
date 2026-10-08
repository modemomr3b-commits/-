import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findCategory() {
  const catsCol = collection(db, 'categories');
  const snapshot = await getDocs(catsCol);
  snapshot.forEach((doc) => {
    console.log(doc.id, doc.data());
  });
}

findCategory().catch(console.error);
