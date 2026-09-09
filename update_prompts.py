import sys

def main():
    # Update server.ts
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_server_prompt = 'const combinedPrompt = `Professional high-end commercial footwear advertisement studio photograph.'
    new_server_prompt = 'const combinedPrompt = `High-end luxury footwear commercial editorial catalog photoshoot, styled on a textured concrete studio floor with minimalist artistic decor, elegant prop styling like art books and soft warm accent lighting, ultra-realistic commercial advertisement style.'
    
    content = content.replace(old_server_prompt, new_server_prompt)
    
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    # Update ProductManager.tsx
    with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
        pm_content = f.read()

    pm_content = pm_content.replace(
        'Professional commercial footwear advertisement photograph.',
        'High-end luxury footwear commercial editorial catalog photoshoot, styled on a textured concrete studio floor with minimalist artistic decor, elegant prop styling like art books and soft warm accent lighting, ultra-realistic commercial advertisement style.'
    )

    with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
        f.write(pm_content)

    print("Prompts updated successfully")

main()
