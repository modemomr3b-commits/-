import sys

def revert_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Reverted {path}")

revert_file('src/components/member/Products.tsx', [
    ('scheduleFetch(50)', 'scheduleFetch(400)'),
    ('scheduleFetch(150)', 'scheduleFetch(1200)'),
    ('scheduleFetch(100)', 'scheduleFetch(600)'),
])

revert_file('src/components/member/SearchPage.tsx', [
    ('scheduleFetch(150)', 'scheduleFetch(1200)'),
    ('scheduleFetch(50)', 'scheduleFetch(400)'),
    ('scheduleFetch(100)', 'scheduleFetch(600)'),
])

revert_file('src/components/showcase/ShowcasePage.tsx', [
    ('scheduleFetch(150)', 'scheduleFetch(1200)'),
    ('scheduleFetch(100)', 'scheduleFetch(600)'),
])

with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('}, 100);\n        },\n      )', '}, 300);\n        },\n      )')
with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/admin/CategoryManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('}, 100);\n        },\n      )', '}, 300);\n        },\n      )')
with open('src/components/admin/CategoryManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully reverted all sync delay changes back to original")
