const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  'console.log("Fetched users:", dbUsers); setUsers(dbUsers.map((u: any) => ({...u, uid: u.id})));',
  'console.log("Fetched users:", dbUsers);\n          if (!Array.isArray(dbUsers)) { setFetchError("API did not return an array: " + JSON.stringify(dbUsers).slice(0, 50)); setUsers([]); } else { setUsers(dbUsers.map((u: any) => ({...u, uid: u.id}))); setFetchError("Success, array length: " + dbUsers.length); }'
);
fs.writeFileSync(file, content);
