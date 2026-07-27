const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(
  'app.get("/api/secure/users"',
  'app.get(["/api/secure/users", "/api/secure/users_v2"])'
);
fs.writeFileSync('server.ts', server);

let api = fs.readFileSync('src/api.ts', 'utf-8');
api = api.replace(
  'fetch(\'/api/secure/users?_t=\' + Date.now()',
  'fetch(\'/api/secure/users_v2?_t=\' + Date.now()'
);
fs.writeFileSync('src/api.ts', api);
