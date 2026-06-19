async function check() {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/categories');
    console.log(await res.json());
  } catch(e) { console.error(e) }
}
check();
