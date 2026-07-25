const users = [
  { id: '72', uid: '72', username: '72', fullName: 'مجمع الربيع', phone: '' }
];
const searchQuery = '';
const filteredUsers = users.filter(u => {
  const sq = searchQuery.toLowerCase();
  return (
    (u.username && String(u.username).toLowerCase().includes(sq)) ||
    (u.fullName && String(u.fullName).toLowerCase().includes(sq)) ||
    (u.phone && String(u.phone).toLowerCase().includes(sq)) ||
    (u.userNumber && String(u.userNumber).toLowerCase().includes(sq))
  );
});
console.log(filteredUsers);
