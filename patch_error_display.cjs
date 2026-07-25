const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(
  'const [users, setUsers] = useState<User[]>([]);',
  'const [users, setUsers] = useState<User[]>([]);\n  const [fetchError, setFetchError] = useState<string | null>(null);'
);
content = content.replace(
  'console.error("Error fetching users in UserManager:", e);',
  'console.error("Error fetching users in UserManager:", e); setFetchError(e.message || String(e));'
);
content = content.replace(
  '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً.</p>',
  '<p className="text-white/50 mb-4">لا يوجد مستخدمون حالياً.</p>\n                  {fetchError && <p className="text-red-400 mt-2">Error: {fetchError}</p>}'
);
fs.writeFileSync(file, content);
