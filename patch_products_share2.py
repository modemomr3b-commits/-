import sys

def patch():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    old_logic = "await navigator.share({ files: filesToShare, title: 'منتجات BRQ' });"
    new_logic = "await navigator.share({ files: filesToShare });"
    content = content.replace(old_logic, new_logic)

    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

patch()
