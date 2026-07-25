sed -i '/const \[isSubmitting, setIsSubmitting\] = useState(false);/a \  const [editingUser, setEditingUser] = useState<User | null>(null);' src/components/admin/UserManager.tsx

sed -i '/const handleCreate = async/i \
  const handleUpdate = async (e: React.FormEvent) => {\
    e.preventDefault();\
    if (!editingUser || isSubmitting) return;\
    setIsSubmitting(true);\
    try {\
      await api.updateUser(editingUser.uid, {\
        fullName: editingUser.fullName,\
        phone: editingUser.phone || "",\
        role: editingUser.role,\
        allowedDevice: editingUser.allowedDevice\
      });\
      if (editingUser.password && editingUser.password.trim() !== "") {\
          await api.updateUser(editingUser.uid, { password: editingUser.password });\
      }\
      if (editingUser.userNumber) {\
          await api.updateUser(editingUser.uid, { userNumber: editingUser.userNumber });\
      }\
      await api.logAction({\
        userId: currentUser?.uid || "",\
        userName: currentUser?.username || "System",\
        action: "تعديل مستخدم",\
        entityType: "user",\
        entityId: editingUser.uid,\
        details: { role: editingUser.role, fullName: editingUser.fullName }\
      });\
      setEditingUser(null);\
      const updated = await api.getUsers();\
      setUsers(updated.map((u: any) => ({...u, uid: u.id})));\
    } catch(e) {\
      console.error(e);\
      alert("فشل تحديث المستخدم");\
    } finally {\
      setIsSubmitting(false);\
    }\
  };\
' src/components/admin/UserManager.tsx

# Find where to put the edit button in the row
sed -i '/<button onClick={() => handleDelete(user.uid, user.username, user.role)}/i \
                                       <button onClick={() => setEditingUser(user)} title="تعديل" className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded transition-colors"><Edit size={16} /></button>' src/components/admin/UserManager.tsx

