const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  'app.get("/api/secure/users", async (req, res) => {',
  'app.get("/api/secure/users", async (req, res) => { console.log("GET /api/secure/users called");'
);
fs.writeFileSync(file, content);
