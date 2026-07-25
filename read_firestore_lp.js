import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, initializeFirestore } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

async function run() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    console.log("Firestore users count:", users.length);
    if (users.length > 0) {
      fs.writeFileSync('firestore_users_backup.json', JSON.stringify(users, null, 2));
      console.log("First user:", users[0]);
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
