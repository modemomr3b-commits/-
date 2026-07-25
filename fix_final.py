with open("src/components/admin/UserManager.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Let's fix the truncated editingUser modal:
start_modal = text.find('{editingUser && (')
end_modal = text.find('<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">')

new_modal = """      {editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden">
               <div className="flex justify-between items-center p-4 border-b border-white/10">
                  <h3 className="font-bold text-lg">تعديل المستخدم: {editingUser.username}</h3>
                  <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                     <X size={20} />
                  </button>
               </div>
               <form onSubmit={handleUpdate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-white/50 block mb-1">الاسم الكامل *</label>
                     <input required type="text" value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white" />
                  </div>
                  <div>
                     <label className="text-xs text-white/50 block mb-1">رقم المستخدم</label>
                     <input type="text" value={editingUser.userNumber || ""} onChange={e => setEditingUser({...editingUser, userNumber: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
                  </div>
                  <div>
                     <label className="text-xs text-white/50 block mb-1">كلمة المرور (اتركها فارغة لعدم التغيير)</label>
                     <input type="text" value={editingUser.password || ""} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" placeholder="********" />
                  </div>
                  <div>
                     <label className="text-xs text-white/50 block mb-1">رقم الهاتف</label>
                     <input type="text" value={editingUser.phone || ""} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white font-mono" />
                  </div>
                  <div>
                     <label className="text-xs text-white/50 block mb-1">صلاحية المستخدم</label>
                     <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                        <option value="normal">عميل عادي</option>
                        <option value="vip">عميل VIP</option>
                        <option value="sales">موظف مبيعات</option>
                        <option value="admin">مدير عام</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs text-white/50 block mb-1">أجهزة الدخول المسموحة</label>
                     <select value={editingUser.allowedDevice} onChange={e => setEditingUser({...editingUser, allowedDevice: e.target.value as DeviceAccess})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-white">
                        <option value="all">جميع الأجهزة (حاسوب + هواتف)</option>
                        <option value="mobile">الموبايل فقط (واجهة مبسطة)</option>
                        <option value="desktop">الحاسوب فقط</option>
                     </select>
                  </div>
                  <div className="md:col-span-2 pt-4 flex justify-end gap-2">
                     <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm transition-colors">إلغاء</button>
                     <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-brq-gold text-black rounded-lg text-sm font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        حفظ التعديلات
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
"""
text = text[:start_modal] + new_modal + text[end_modal:]

with open("src/components/admin/UserManager.tsx", "w", encoding="utf-8") as f:
    f.write(text)
