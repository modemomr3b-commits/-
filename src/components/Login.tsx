import { useState, useEffect } from 'react';
import bcryptjs from 'bcryptjs';
import { useStore } from '../store.ts';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Diamond, LogIn, Loader2, Download, Share, X } from 'lucide-react';
import { api } from '../api';
import { supabase } from '../supabase.ts';
import { usePWAInstall } from '../hooks/usePWAInstall';
import Animated3DLogo from './ui/Animated3DLogo';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogoHoveredDesktop, setIsLogoHoveredDesktop] = useState(false);
  const [isLogoHoveredMobile, setIsLogoHoveredMobile] = useState(false);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();
  const { deferredPrompt, isIOS, showInstallPrompt, handleInstallClick, isStandalone } = usePWAInstall();
  const [installReady, setInstallReady] = useState(false);

  useEffect(() => {
    if (deferredPrompt || isIOS) {
      setInstallReady(true);
    } else {
      const timer = setTimeout(() => setInstallReady(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isIOS]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, check basic hardcoded admin just to make sure we don't lock out from the app
      let finalUser: any = null;

      if (cleanUsername === '1' && password === '100') {
         finalUser = {
           uid: 'demo_user_1',
           username: '1',
           fullName: 'المستخدم 1',
           role: 'normal',
           isActive: true
         };
         try {
           const dbUser = await api.getUser('1');
           if (!dbUser) {
             await api.createUser({...finalUser, id: '1'});
           } else {
             if (dbUser.isActive === false) throw new Error('تم إيقاف هذا الحساب.');
             // Force role to normal for user 1
             if (dbUser.role !== 'normal') {
                 await api.updateUser('1', { role: 'normal' });
             }
             finalUser = {...finalUser, ...dbUser, role: 'normal'};
           }
         } catch(e: any) {
           if (e.message.includes('موقوف')) throw e;
         }
      } else if (cleanUsername === 'wafaa' && password === 'brq') {
         finalUser = {
           uid: 'admin_user_wafaa',
           username: 'wafaa',
           fullName: 'مدير النظام',
           role: 'admin',
           isActive: true
         };
         // Also attempt to get or create in DB
         try {
           const dbUser = await api.getUser('wafaa');
           if (!dbUser) {
             await api.createUser({...finalUser, id: 'wafaa'});
           } else {
             if (dbUser.isActive === false) throw new Error('تم إيقاف هذا الحساب.');
             finalUser = {...finalUser, ...dbUser};
           }
         } catch(e: any) {
           if (e.message.includes('موقوف')) throw e;
         }
      } else {
         // Check Supabase
         const { data: snapshot, error: fetchError } = await supabase.from('users').select('*').eq('username', cleanUsername);
         if (fetchError || !snapshot || snapshot.length === 0) {
            throw new Error('بيانات الدخول غير صحيحة');
         }

         const udoc = snapshot[0];
         
         // Verify password securely
         const isBcryptHash = udoc.password && udoc.password.startsWith('$2');
         let isPasswordCorrect = false;
         
         if (isBcryptHash) {
             isPasswordCorrect = bcryptjs.compareSync(password, udoc.password);
         } else {
             // Legacy plain text password
             isPasswordCorrect = (udoc.password === password);
         }

         if (!isPasswordCorrect) {
             throw new Error('بيانات الدخول غير صحيحة');
         }

         if (udoc.status === 'inactive' || udoc.isActive === false) {
            throw new Error('تم إيقاف هذا الحساب.');
         }

         const { password: _dbPassword, ...userWithoutPassword } = udoc;
         finalUser = { id: udoc.id, ...userWithoutPassword, uid: udoc.id };
      }

      setUser(finalUser);
      
      if (finalUser.role === 'admin' || finalUser.role === 'sales') {
        navigate('/admin');
      } else {
        navigate('/');
      }

    } catch(err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-brq-black via-[#050a1a] to-brq-navy">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brq-royal rounded-full mix-blend-screen filter blur-[100px] opacity-20 z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brq-gold rounded-full mix-blend-screen filter blur-[100px] opacity-10 z-0 pointer-events-none"></div>

      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row relative z-10 glass-panel md:rounded-3xl border border-white/10 overflow-hidden shadow-2xl h-screen md:h-[650px]">
        {/* Creative Image Side (Desktop) */}
        <div className="hidden md:flex flex-1 relative bg-brq-navy overflow-hidden p-12 flex-col justify-center items-center text-center">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <div className="absolute inset-0 bg-gradient-to-tr from-brq-navy to-brq-royal/40 mix-blend-overlay"></div>
           
           <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1 }}
             className="relative z-10"
           >
              <div 
                className="w-36 h-36 flex items-center justify-center mx-auto mb-8 relative transition-transform hover:scale-105 duration-500"
                onMouseEnter={() => setIsLogoHoveredDesktop(true)}
                onMouseLeave={() => setIsLogoHoveredDesktop(false)}
              >
                <div className="absolute inset-4 bg-brq-gold opacity-20 blur-xl rounded-full"></div>
                <div className="w-full h-full relative z-10">
                  <Animated3DLogo isHovered={isLogoHoveredDesktop} scale={0.8} />
                </div>
              </div>
              <h2 className="text-4xl font-black text-white tracking-widest mb-4 font-mono">BRQ SYSTEM</h2>
              <p className="text-brq-gold font-bold text-lg mb-8 uppercase tracking-widest">— Excellence in Operations —</p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto opacity-70">
                 <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                   <div className="text-brq-gold font-bold text-2xl mb-1">2024</div>
                   <div className="text-xs text-white/50">النظام الجوهري</div>
                 </div>
                 <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                   <div className="text-brq-gold font-bold text-2xl mb-1">V 2.0</div>
                   <div className="text-xs text-white/50">تحديث الإنتاجية</div>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Login Form Side */}
        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 h-full bg-black/40 backdrop-blur-xl relative">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-brq-gold to-transparent opacity-50 md:hidden"></div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-sm mx-auto"
          >
            <div className="flex flex-col items-center mb-10 md:hidden">
              <motion.div
                className="w-24 h-24 mb-4 flex items-center justify-center relative transition-transform hover:scale-105 duration-500"
                onMouseEnter={() => setIsLogoHoveredMobile(true)}
                onMouseLeave={() => setIsLogoHoveredMobile(false)}
              >
                <div className="absolute inset-2 bg-brq-gold opacity-20 blur-xl rounded-full"></div>
                <div className="w-full h-full relative z-10">
                  <Animated3DLogo isHovered={isLogoHoveredMobile} scale={0.6} />
                </div>
              </motion.div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brq-gold to-white mb-1 tracking-wider">BRQ SYSTEM</h1>
              <h2 className="text-sm text-brq-white opacity-80 font-semibold tracking-wide">شركة الوفاء المتميز</h2>
            </div>

            <div className="mb-10 hidden md:block">
               <h1 className="text-3xl font-bold text-white mb-2">مرحباً بك مجدداً 👋</h1>
               <p className="text-white/50">يرجى تسجيل الدخول للوصول إلى لوحة التحكم الخاصة بك.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">اسم المستخدم</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-brq-gold focus:bg-white/10 transition-all font-mono"
                  placeholder="أدخل اسم المستخدم"
                  dir="auto"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-xs font-bold text-white/50 uppercase tracking-widest">كلمة المرور</label>
                   <a href="#" className="text-xs text-brq-gold/70 hover:text-brq-gold transition-colors">هل نسيت الرمز؟</a>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-brq-gold focus:bg-white/10 transition-all font-mono"
                  placeholder="••••••••"
                  dir="ltr"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brq-gold to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:opacity-50 text-black rounded-xl py-3.5 font-bold tracking-wide shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>

            <AnimatePresence>
              {showInstallPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-8 relative overflow-hidden bg-white/5 border border-brq-gold/30 rounded-2xl p-5 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(212,175,55,0.05)]"
                >
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('hide-install-prompt');
                      window.dispatchEvent(event);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-brq-gold/5 to-transparent pointer-events-none"></div>
                  <div className="w-12 h-12 rounded-full border border-brq-gold/20 bg-brq-gold/10 flex items-center justify-center mb-3">
                    <Download className="text-brq-gold" size={24} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">تجربة أفضل للتطبيق</h3>
                  <p className="text-white/60 text-xs mb-4 max-w-[250px] leading-relaxed">
                    قم بتثبيت التطبيق على الشاشة الرئيسية للوصول السريع وبدون إطار المتصفح المزعج.
                  </p>
                  
                  {isIOS ? (
                    <div className="w-full flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/10 text-right">
                      <span className="text-xs text-white/90">
                        ١. اضغط على ايقونة المشاركة <Share size={14} className="inline text-brq-gold mx-1" /> بالأسفل
                      </span>
                      <span className="text-xs text-white/90">
                        ٢. اختر "الإضافة للشاشة الرئيسية" (Add to Home Screen)
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstallClick}
                      disabled={!installReady}
                      className="w-full py-2.5 rounded-xl border border-brq-gold bg-brq-gold/10 text-brq-gold hover:bg-brq-gold hover:text-black font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {!installReady ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          <span>جاري التجهيز...</span>
                        </div>
                      ) : (
                        'تنزيل للشاشة الرئيسية'
                      )}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
