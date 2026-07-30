const JSZip = require('jszip');
const fs = require('fs');

async function test() {
  const zip = new JSZip();
  // Method 1: Just file with path
  zip.file("folder1/test.txt", "hello");
  
  // Method 2: Create folder explicitly
  const f2 = zip.folder("folder2");
  f2.file("test.txt", "hello");
  
  // Method 3: Nested folders
  const f3 = zip.folder("folder3").folder("subfolder");
  f3.file("test.txt", "hello");

  const blob = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync("test.zip", blob);
}
test().catch(console.error);
