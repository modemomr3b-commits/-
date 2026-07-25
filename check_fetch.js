async function check() {
  const res = await fetch('http://localhost:3000/api/secure/users');
  const data = await res.json();
  console.log("Returned users count:", data.length);
  if (data.length > 0) {
     console.log("First user:", data[0]);
  }
}
check();
