sed -i '/  const filteredUsers = users.filter/i \    );\n  }\n' src/components/admin/UserManager.tsx
sed -i '129,139d' src/components/admin/UserManager.tsx
