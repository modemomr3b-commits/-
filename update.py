import sys

def main():
    with open('src/components/admin/SettingsManager.tsx', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_index = -1
    for i, line in enumerate(lines):
        if "سعر صرف الدولار (لكل 1 دولار)" in line and "label" in lines[i-1]:
            start_index = i - 2
            break

    if start_index == -1:
        print("Not found")
        return

    replacement = """             {isUsdRateLocked ? (
               <div>
                 <label className="text-xs text-white/70 mb-1.5 block font-bold">
                   سعر صرف الدولار (التكسيرة) - محمي برمز سري
                 </label>
                 <div className="flex gap-2">
                   <input
                     type="password"
                     placeholder="أدخل الرمز السري لفك القفل"
                     className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono placeholder:text-gray-400"
                     onChange={(e) => {
                        if (e.target.value === 'Mode') {
                          setIsUsdRateLocked(false);
                          e.target.value = '';
                        }
                     }}
                   />
                 </div>
               </div>
             ) : (
               <div>
                 <label className="text-xs text-white/70 mb-1.5 flex justify-between font-bold">
                   <span>سعر صرف الدولار (لكل 1 دولار)</span>
                   <button 
                     onClick={() => setIsUsdRateLocked(true)} 
                     className="text-brq-gold hover:underline"
                     type="button"
                   >
                     قفل
                   </button>
                 </label>
                 <input
                     type="number"
                     value={settings.usdExchangeRate || ''}
                     placeholder="مثال: 1500 أو 1530"
                    onChange={e => setSettings({...settings, usdExchangeRate: Number(e.target.value)})}
                    className="w-full bg-white border border-black rounded-lg px-3 py-2 text-sm focus:border-brq-gold/50 outline-none text-black font-mono font-bold placeholder:text-gray-400"
                  />
               </div>
             )}
"""
    
    end_index = start_index + 12
    lines[start_index:end_index] = [replacement]

    with open('src/components/admin/SettingsManager.tsx', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Success")

main()
