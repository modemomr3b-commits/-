with open("src/components/admin/UserManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

import re
text = re.sub(r"<\/table>\s*<\/div>\s*<\/>[\s\S]*", "</table></div></>)}</div></div></div>);}", text)
text = re.sub(r"<\/table>\s*<\/div>\s*\)\}[\s\S]*", "</table></div></>)}</div></div></div>);}", text)

with open("src/components/admin/UserManager.tsx", "w", encoding="utf-8") as f:
    f.write(text)
