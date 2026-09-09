import sys

def main():
    with open('src/components/ui/Animated3DLogo.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # The useFrame hook gives us time directly in the second parameter
    content = content.replace(
        "const t = state.timer ? state.timer.getElapsed() : state.clock.getElapsedTime();",
        "// We accumulate delta to avoid using the deprecated clock\n    if (!crystalRef.current.userData.time) crystalRef.current.userData.time = 0;\n    crystalRef.current.userData.time += delta;\n    const t = crystalRef.current.userData.time;"
    )

    with open('src/components/ui/Animated3DLogo.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Success")

main()
