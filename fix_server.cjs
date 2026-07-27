const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(
  'app.get(["/api/secure/users", "/api/secure/users_v2"]), async (req, res) => {',
  'app.get(["/api/secure/users", "/api/secure/users_v2"], async (req, res) => {'
);
fs.writeFileSync('server.ts', server);
