import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Since we might not have a service account key, we can try using the application default credentials.
try {
  initializeApp();
  const db = getFirestore();
  async function run() {
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.get();
      console.log('Firestore users count:', snapshot.size);
      if (snapshot.size > 0) {
        snapshot.forEach(doc => {
          console.log(doc.id, '=>', doc.data());
        });
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  }
  run();
} catch (e) {
  console.error('Failed to initialize:', e);
}
