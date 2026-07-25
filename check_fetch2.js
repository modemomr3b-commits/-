async function check() {
  const res = await fetch('http://localhost:3000/api/secure/users');
  const data = await res.json();
  const valid = data.filter(u => u.username !== 'Ali2');
  console.log("Returned valid users count:", valid.length);
  if (valid.length > 0) {
     console.log("First valid user:", valid[0]);
  }
}
check();
