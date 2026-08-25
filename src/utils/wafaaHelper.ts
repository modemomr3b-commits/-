export const isWafaaUser = (user: any) => {
  if (!user) return false;
  const uName = (user.username || '').trim().toLowerCase();
  const fName = (user.fullName || '').trim().toLowerCase();
  const uId = (user.id || user.uid || '').trim().toLowerCase();
  return (
    uName === 'wafaa' || 
    uName === 'waffa' || 
    fName === 'wafaa' || 
    uId === 'wafaa' || 
    uName === 'نصيف عبد الرزاق' || 
    fName === 'نصيف عبد الرزاق' || 
    uId === 'نصيف عبد الرزاق' ||
    user.role === 'admin'
  );
};
