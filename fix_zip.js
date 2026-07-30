const JSZip = require('jszip');
const fs = require('fs');

async function test() {
  const zip = new JSZip();
  zip.file("رياضة/test.txt", "hello");
  const blob = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync("test1.zip", blob);

  const zip2 = new JSZip();
  zip2.folder("رياضة").file("test.txt", "hello");
  const blob2 = await zip2.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync("test2.zip", blob2);
}
test();
