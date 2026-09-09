import sys

def main():
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove button in table row
    ai_btn_block = """                            <button
                              type="button"
                              onClick={() => setAiStudioProduct(p)}
                              className="p-1.5 hover:bg-purple-500/20 text-purple-400 rounded transition-colors"
                              title="توليد خلفية وديكور بالذكاء الاصطناعي (AI Studio)"
                            >
                              <Wand2 size={16} />
                            </button>"""
    content = content.replace(ai_btn_block, "")

    # 2. Remove states and functions between line 206 and 485
    # Let's locate the chunk from `const [aiStudioProduct` to `const handleSaveAiImage`
    start_idx = content.find("  const [aiStudioProduct, setAiStudioProduct]")
    end_idx = content.find("  const handleSaveAiImage = async () => {")
    if start_idx != -1 and end_idx != -1:
        # Find the end of handleSaveAiImage
        # Let's search for the closing of handleSaveAiImage
        save_end = content.find("  };", end_idx)
        if save_end != -1:
            content = content[:start_idx] + content[save_end + 4:]

    # 3. Remove the modal JSX at the bottom
    modal_start = content.find("{/* AI Shoe Decor Studio Modal */}")
    if modal_start != -1:
        # Find where this modal ends (next comment or modal block)
        modal_end = content.find("{isAutoShowcaseOpen && (", modal_start)
        if modal_end != -1:
            content = content[:modal_start] + content[modal_end:]

    with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("AI feature removed successfully from ProductManager.tsx")

main()
