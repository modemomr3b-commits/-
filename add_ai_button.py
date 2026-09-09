import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    target = """                            <button
                              type="button"
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"
                              title="تعديل"
                            >
                              <Edit size={16} />
                            </button>"""

    addition = """                            <button
                              type="button"
                              onClick={() => setAiStudioProduct(p)}
                              className="p-1.5 hover:bg-purple-500/20 text-purple-400 rounded transition-colors"
                              title="توليد خلفية وديكور بالذكاء الاصطناعي (AI Studio)"
                            >
                              <Wand2 size={16} />
                            </button>"""

    if target in content:
        content = content.replace(target, target + "\n" + addition)
        with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully added AI Studio button")
    else:
        print("Target not found")

main()
