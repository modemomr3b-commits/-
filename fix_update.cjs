const fs = require('fs');

let code = fs.readFileSync('src/api.ts', 'utf8');

const updateProductRegex = /updateProduct: async \(id: string, data: any\) => \{[\s\S]*?if \(wasHidden\) \{[\s\S]*?\}[\s\S]*?const safeData = \{ \.\.\.data, updatedAt: Date\.now\(\) \};\s*if \(safeData\.imageUrl/m;

code = code.replace(updateProductRegex, `updateProduct: async (id: string, data: any) => {
    // Fetch the existing size first to avoid overwriting it
    const { data: op } = await supabase.from('products').select('size').match({ id }).single();
    const existingSize = op?.size || {};

    const wasHidden = data.isHidden === false && existingSize.isHidden === true;
    let oldProduct = wasHidden ? op : null;

    const safeData = { ...data, updatedAt: Date.now() };

    if (safeData.imageUrl`);

// Also fix the safeData.size assignment
const sizeAssignmentRegex = /safeData\.size = \{ \.\.\.\(safeData\.size \|\| \{\}\) \};\s*if \(safeData\.isHidden/m;

code = code.replace(sizeAssignmentRegex, `safeData.size = { ...existingSize, ...(safeData.size || {}) };
    if (safeData.isHidden`);

fs.writeFileSync('src/api.ts', code);
