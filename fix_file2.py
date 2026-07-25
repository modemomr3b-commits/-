import re

with open("src/components/admin/UserManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# I want to find all blocks of the broken form.
# The broken form starts with:
#                      <X size={20} />
#                   </button>
#                </div>
#                <form onSubmit={handleUpdate}
# and ends with:
#       )}

pattern = r"\s*<X size=\{20\} \/>\s*<\/button>\s*<\/div>\s*<form onSubmit=\{handleUpdate\}[\s\S]*?<\/form>\s*<\/div>\s*<\/div>\s*\)\}"
text = re.sub(pattern, "", text)

# Now write back
with open("src/components/admin/UserManager.tsx", "w", encoding="utf-8") as f:
    f.write(text)

