import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, where } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-aee1eef5-5297-44e9-a762-6b62a840c28d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const catsSnap = await getDocs(collection(db, "categories"));
  const categories = catsSnap.docs.map(d => ({id: d.id, ...d.data()}));
  console.log("Categories:");
  categories.forEach(c => console.log(c.id, c.name, "parent:", c.parentId));

  const prodsSnap = await getDocs(query(collection(db, "products"), limit(10)));
  const products = prodsSnap.docs.map(d => ({id: d.id, ...d.data()}));
  console.log("\nSample Products:");
  products.forEach(p => console.log(p.productCode, p.categoryId, p.subcategoryId));
  
  process.exit(0);
}
check().catch(console.error);
