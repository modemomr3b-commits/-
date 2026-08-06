import sys

def patch():
    with open('src/utils/download.ts', 'r') as f:
        content = f.read()

    old_logic = """    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
        try {
            await navigator.share({
                files,
                title: 'حفظ الصور',
            });
            return true;
        } catch (shareError: any) {
            if (shareError.name === 'AbortError') return false; // user cancelled
            console.error("Share failed, falling back to a.download", shareError);
        }
    }
    
    // Fallback for Android/desktop when share fails or is not available
    for (const file of files) {"""

    new_logic = """    if (isIOS && navigator.canShare && navigator.canShare({ files })) {
        try {
            await navigator.share({
                files
            });
            return true;
        } catch (shareError: any) {
            if (shareError.name === 'AbortError') return false; // user cancelled
            console.error("Share failed", shareError);
            // On iOS, falling back to a.download loop causes the browser to open the image in a new view
            // which breaks the experience. If share fails on iOS, we shouldn't fallback to clicking links.
            throw shareError; 
        }
    }
    
    // Fallback for Android/desktop when share fails or is not available
    for (const file of files) {"""

    content = content.replace(old_logic, new_logic)

    with open('src/utils/download.ts', 'w') as f:
        f.write(content)

patch()
