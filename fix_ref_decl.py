import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    target = "  const [deleteConfirm, setDeleteConfirm] = useState<{ isBulk: boolean; ids?: string[]; name?: string; count?: number; } | null>(null);"
    replacement = "  const recentlyModifiedRef = useRef<Record<string, number>>({});\n  const [deleteConfirm, setDeleteConfirm] = useState<{ isBulk: boolean; ids?: string[]; name?: string; count?: number; } | null>(null);"

    if target in content and "recentlyModifiedRef = useRef" not in content:
        content = content.replace(target, replacement, 1)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully declared recentlyModifiedRef")
    else:
        print("Target not found or already declared")

main()
