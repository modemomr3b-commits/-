const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

if (!content.includes('debugMsg')) {
  content = content.replace(
    'const [users, setUsers] = useState<User[]>([]);',
    'const [users, setUsers] = useState<User[]>([]);\n  const [debugMsg, setDebugMsg] = useState("");'
  );
  content = content.replace(
    'console.error("Error fetching users in UserManager:", e);',
    'console.error("Error fetching users in UserManager:", e); setDebugMsg(String(e));'
  );
  content = content.replace(
    'if (!Array.isArray(dbUsers)) {',
    'setDebugMsg("Fetched " + (dbUsers ? dbUsers.length : "null"));\n          if (!Array.isArray(dbUsers)) {'
  );
  content = content.replace(
    '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً.</p>',
    '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً. {debugMsg}</p>'
  );
  fs.writeFileSync(file, content);
}
