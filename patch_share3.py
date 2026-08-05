import sys

def patch():
    with open('src/components/member/Products.tsx', 'r') as f:
        content = f.read()

    # Replace 30 with 15 for chunking
    content = content.replace("readyFilesToShare.length > 30", "readyFilesToShare.length > 15")
    content = content.replace("readyFilesToShare.length <= 30", "readyFilesToShare.length <= 15")
    content = content.replace("Math.ceil(readyFilesToShare.length / 30)", "Math.ceil(readyFilesToShare.length / 15)")
    content = content.replace("idx * 30, (idx + 1) * 30", "idx * 15, (idx + 1) * 15")
    content = content.replace("كل دفعة 30 صورة كحد أقصى", "كل دفعة 15 صورة كحد أقصى")

    # Change 30 to 10 in logic
    content = content.replace("readyFilesToShare.length > 15", "readyFilesToShare.length > 10")
    content = content.replace("readyFilesToShare.length <= 15", "readyFilesToShare.length <= 10")
    content = content.replace("Math.ceil(readyFilesToShare.length / 15)", "Math.ceil(readyFilesToShare.length / 10)")
    content = content.replace("idx * 15, (idx + 1) * 15", "idx * 10, (idx + 1) * 10")
    content = content.replace("كل دفعة 15 صورة كحد أقصى", "كل دفعة 10 صور كحد أقصى")
    
    with open('src/components/member/Products.tsx', 'w') as f:
        f.write(content)

patch()
