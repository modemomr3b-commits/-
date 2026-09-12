import sys

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {path}")

# 1. Products.tsx
update_file('src/components/member/Products.tsx', [
    ('scheduleFetch(400)', 'scheduleFetch(50)'),
    ('scheduleFetch(1200)', 'scheduleFetch(150)'),
    ('scheduleFetch(600)', 'scheduleFetch(100)'),
])

# 2. SearchPage.tsx
update_file('src/components/member/SearchPage.tsx', [
    ('scheduleFetch(1200)', 'scheduleFetch(150)'),
    ('scheduleFetch(400)', 'scheduleFetch(50)'),
    ('scheduleFetch(600)', 'scheduleFetch(100)'),
])

# 3. Home.tsx
update_file('src/components/member/Home.tsx', [
    ('setTimeout(() => {', 'setTimeout(() => {'),
])

# 4. ProductManager.tsx
update_file('src/components/admin/ProductManager.tsx', [
    ('fetchTimeout = setTimeout(() => {', 'fetchTimeout = setTimeout(() => {'),
])

# Let's inspect ProductManager.tsx and CategoryManager.tsx timeouts specifically
with open('src/components/admin/ProductManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('}, 300);\n        },\n      )', '}, 100);\n        },\n      )')
content = content.replace('bc.onmessage = () => {\n          if (mounted) loadData();', 'bc.onmessage = () => {\n          if (mounted) loadData();')
with open('src/components/admin/ProductManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/admin/CategoryManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('}, 300);\n        },\n      )', '}, 100);\n        },\n      )')
with open('src/components/admin/CategoryManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/components/showcase/ShowcasePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('scheduleFetch(1200)', 'scheduleFetch(150)')
content = content.replace('scheduleFetch(600)', 'scheduleFetch(100)')
with open('src/components/showcase/ShowcasePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully optimized all sync delays for lightning-fast real-time updates")
