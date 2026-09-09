import sys

def main():
    # 1. Update server.ts to focus prompt on background studio scene
    with open('server.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    target_server_prompt = 'const combinedPrompt = `High-end luxury footwear commercial editorial catalog photoshoot, styled on a textured concrete studio floor with minimalist artistic decor, elegant prop styling like art books and soft warm accent lighting, ultra-realistic commercial advertisement style.'
    replacement_server_prompt = 'const combinedPrompt = `Professional luxury commercial footwear studio background and setting, textured concrete floor, minimalist art books, decorative warm lighting, empty display stage, photorealistic 8k resolution, cinematic studio lighting, high-end catalog background, empty center space for product display.'

    if target_server_prompt in content:
        content = content.replace(target_server_prompt, replacement_server_prompt)
    else:
        # replace whatever combinedPrompt is
        import re
        content = re.sub(r'const combinedPrompt = `[^`]*`', 'const combinedPrompt = `Professional luxury commercial footwear studio background and setting, textured concrete floor, minimalist art books, decorative warm lighting, empty display stage, photorealistic 8k resolution, cinematic studio lighting, high-end catalog background, empty center space for product display.`', content)

    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print("server.ts updated successfully")

main()
