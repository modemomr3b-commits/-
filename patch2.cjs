const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

code = code.replace(/const handlePackagingChange = \(\n    packaging: string,\n    customPieces: number,\n    forceStandardCrush: boolean,\n    isEditing: boolean = false\n  \) => {/g, 
`const handlePackagingChange = (
    packaging: string,
    customPieces: number,
    forceStandardCrush: boolean,
    isEditing: boolean = false,
    isFromPackagingInput: boolean = false
  ) => {`);

code = code.replace(/let autoForceCrush = forceStandardCrush;\n    if \(customPieces !== 12 && customPieces > 0 && packaging.trim\(\) !== "12" && packaging.trim\(\) !== ""\) {\n      autoForceCrush = false;\n    }/, 
`let autoForceCrush = forceStandardCrush;
    if (isFromPackagingInput && customPieces !== 12 && customPieces > 0 && packaging.trim() !== "12" && packaging.trim() !== "") {
      autoForceCrush = false;
    } else if (isFromPackagingInput && (customPieces === 12 || packaging.trim() === "12" || packaging.trim() === "")) {
      autoForceCrush = true;
    }`);

code = code.replace(/handlePackagingChange\(val, num, newProduct.forceStandardCrush \|\| false, false\);/g, 
`handlePackagingChange(val, num, newProduct.forceStandardCrush || false, false, true);`);

code = code.replace(/handlePackagingChange\(val, num, editingProduct.forceStandardCrush \|\| false, true\);/g, 
`handlePackagingChange(val, num, editingProduct.forceStandardCrush || false, true, true);`);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
