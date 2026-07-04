const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

// Replace handlePackagingChange and its call sites
code = code.replace(
  /const handlePackagingChange = \([\s\S]*?else setNewProduct\(updated as any\);\n  };/,
  `const handlePackagingChange = (
    packaging: string,
    isEditing: boolean = false
  ) => {
    if (isEditing) {
      setEditingProduct(prev => prev ? { ...prev, packaging } as any : prev);
    } else {
      setNewProduct(prev => prev ? { ...prev, packaging } as any : prev);
    }
  };

  const handleForceStandardCrushChange = (
    forceStandardCrush: boolean,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = forceStandardCrush ? 12 : (target.piecesCount || 12);
    const usdValue = target.dozenPriceUsd || 0;
    const iqdValue = target.price || 0;
    
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      forceStandardCrush,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };

  const handlePiecesCountChange = (
    piecesCount: number,
    isEditing: boolean = false
  ) => {
    const target = isEditing ? editingProduct : newProduct;
    if (!target) return;

    const calcPieces = (target.forceStandardCrush ?? true) ? 12 : piecesCount;
    const usdValue = target.dozenPriceUsd || 0;
    const iqdValue = target.price || 0;
    
    const pieceUsd = calcPieces > 0 ? usdValue / calcPieces : 0;
    const pieceIqd = calcPieces > 0 ? iqdValue / calcPieces : 0;

    const updated = {
      ...target,
      piecesCount,
      piecePriceUsd: Number(pieceUsd.toFixed(2)),
      piecePriceIqd: pieceIqd,
    };

    if (isEditing) setEditingProduct(updated as any);
    else setNewProduct(updated as any);
  };`
);

// New Product form replacements
code = code.replace(
  /onChange=\{\(e\) => \{\s*const val = e\.target\.value;\s*const num = parseInt\(val\) \|\| 12;\s*handlePackagingChange\(val, num, newProduct\.forceStandardCrush \?\? true, false, true\);\s*\}\}/,
  `onChange={(e) => handlePackagingChange(e.target.value, false)}`
);

code = code.replace(
  /onChange=\{\(e\) => \{\s*const forceCrush = e\.target\.value === "yes";\s*handlePackagingChange\(newProduct\.packaging \|\| "", newProduct\.piecesCount \|\| 12, forceCrush, false\);\s*\}\}/,
  `onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", false)}`
);

// Editing Product form replacements
code = code.replace(
  /onChange=\{\(e\) => \{\s*const val = e\.target\.value;\s*const num = parseInt\(val\) \|\| 12;\s*handlePackagingChange\(val, num, editingProduct\.forceStandardCrush \?\? true, true, true\);\s*\}\}/,
  `onChange={(e) => handlePackagingChange(e.target.value, true)}`
);

code = code.replace(
  /onChange=\{\(e\) => \{\s*const forceCrush = e\.target\.value === "yes";\s*handlePackagingChange\(editingProduct\.packaging \|\| "", editingProduct\.piecesCount \|\| 12, forceCrush, true\);\s*\}\}/,
  `onChange={(e) => handleForceStandardCrushChange(e.target.value === "yes", true)}`
);

// Inject piecesCount input for new product
code = code.replace(
  /<select\n                value=\{\(newProduct\.forceStandardCrush \?\? true\) \? "yes" : "no"\}[\s\S]*?<\/select>\n            <\/div>/,
  `$&
            {!(newProduct.forceStandardCrush ?? true) && (
              <div className="md:col-span-2">
                <label className="text-xs text-white/50 block mb-1">
                  عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                </label>
                <input
                  type="number"
                  value={newProduct.piecesCount || ""}
                  onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, false)}
                  className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                />
              </div>
            )}`
);

// Inject piecesCount input for editing product
code = code.replace(
  /<select\n                  value=\{\(editingProduct\.forceStandardCrush \?\? true\) \? "yes" : "no"\}[\s\S]*?<\/select>\n              <\/div>/,
  `$&
              {!(editingProduct.forceStandardCrush ?? true) && (
                <div className="md:col-span-2">
                  <label className="text-xs text-white/50 block mb-1">
                    عدد القطع للتقسيم (بما أن التكسير التلقائي مغلق)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.piecesCount || ""}
                    onChange={(e) => handlePiecesCountChange(parseInt(e.target.value) || 1, true)}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-500"
                  />
                </div>
              )}`
);


fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
