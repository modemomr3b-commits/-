const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

// Insert header
code = code.replace(
  /<th className="p-4 font-medium">التعبئة<\/th>/,
  '<th className="p-4 font-medium">التعبئة</th>\n                    <th className="p-4 font-medium">التاريخ</th>'
);

// Insert column content
code = code.replace(
  /<td className="p-4 text-xs">\s*\{p\.packaging \|\| "-"\}\s*<\/td>/,
  `<td className="p-4 text-xs">
                          {p.packaging || "-"}
                        </td>
                        <td className="p-4 text-xs text-white/70">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-IQ') : "-"}
                          {p.updatedAt && p.updatedAt !== p.createdAt && (
                            <div className="text-[10px] text-white/40 mt-1">
                              تحديث: {new Date(p.updatedAt).toLocaleDateString('ar-IQ')}
                            </div>
                          )}
                        </td>`
);

fs.writeFileSync('src/components/admin/ProductManager.tsx', code);
