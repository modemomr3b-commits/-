import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    target = "  Unlock,"
    replacement = "  Unlock,\n  FileText,"

    if target in content and "FileText" not in content[:100]:
        content = content.replace(target, replacement, 1)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully added FileText import")
    else:
        print("Target not found or already present")

main()
