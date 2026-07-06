const fs = require('fs');

const datePattern = /new Date\(([^)]+)\)\.toLocaleDateString\('ar-IQ'\)/g;
const dateTimePattern = /new Date\(([^)]+)\)\.toLocaleString\('ar-IQ'\)/g;

function replaceInFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Replace date only
  content = content.replace(datePattern, 
    "(`${new Date($1).getFullYear()}/${new Date($1).getMonth() + 1}/${new Date($1).getDate()}`)"
  );
  
  // Replace date + time
  content = content.replace(dateTimePattern, 
    "(`${new Date($1).getFullYear()}/${new Date($1).getMonth() + 1}/${new Date($1).getDate()} ${new Date($1).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}`)"
  );

  // Fix the specific order manager line:
  // new Date(o.createdAt).toLocaleTimeString('ar-IQ', {hour: '2-digit', minute:'2-digit'});
  content = content.replace(/new Date\(([^)]+)\)\.toLocaleTimeString\('ar-IQ',\s*\{([^}]+)\}\)/g, 
    "new Date($1).toLocaleTimeString('en-US', {$2})"
  );

  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log(`Updated ${filepath}`);
  }
}

const files = [
  'src/components/admin/ProductManager.tsx',
  'src/components/admin/UserManager.tsx',
  'src/components/admin/NotificationManager.tsx',
  'src/components/admin/TrashManager.tsx',
  'src/components/admin/OrderManager.tsx',
  'src/components/admin/ReportManager.tsx',
  'src/components/member/ProductDetail.tsx',
  'src/components/member/Products.tsx',
  'src/components/member/Profile.tsx'
];

files.forEach(replaceInFile);
