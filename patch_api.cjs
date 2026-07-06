const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

// modify createProduct
code = code.replace(
  /const safeData = \{ \.\.\.data \};/,
  `const safeData = { ...data, createdAt: data.createdAt || Date.now(), updatedAt: data.updatedAt || Date.now() };`
);

// modify updateProduct
code = code.replace(
  /updateProduct: async \(id: string, data: any\) => \{ \n    const safeData = \{ \.\.\.data \};/,
  `updateProduct: async (id: string, data: any) => { \n    const safeData = { ...data, updatedAt: Date.now() };`
);

fs.writeFileSync('src/api.ts', code);
