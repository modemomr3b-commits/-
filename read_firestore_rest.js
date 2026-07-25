import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/users?key=${config.apiKey}`;

async function run() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
       console.error("Error:", data.error.message);
       return;
    }
    const docs = data.documents || [];
    console.log("Firestore users count:", docs.length);
    if (docs.length > 0) {
      fs.writeFileSync('firestore_users_backup.json', JSON.stringify(docs, null, 2));
      console.log("First user:", docs[0].name);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
