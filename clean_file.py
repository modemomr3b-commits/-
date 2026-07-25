import re
with open("src/components/admin/UserManager.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will find all instances of {editingUser && ( and the corresponding )}
def remove_blocks(text):
    pattern = r"\{editingUser && \(\s*<div.*?\)\]\}|</form>\s*</div>\s*</div>\s*\)\}"
    # actually it's easier to find the string 
    # it started with "{editingUser && (" and ended with ")}".
    pass

