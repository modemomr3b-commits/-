import React, { useState, useEffect } from 'react';
import { Shield, User, KeyRound, ArrowRight, AlertTriangle, CheckCircle2, Lock, Sparkles, RefreshCw } from 'lucide-react';
import Animated3DLogo from '../ui/Animated3DLogo';
import { verifyShowcaseInvite, loginShowcase } from '../../services/showcaseService';

interface ShowcaseAuthProps {
  onSuccess: (agentInfo: { id: string, fullName: string }, visitorName: string) => void;
}

export default function ShowcaseAuth({ onSuccess }: ShowcaseAuthProps) {
  const [visitorName, setVisitorName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Invite Token state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [tokenChecking, setTokenChecking] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    reason?: string;
    agent?: { id: string; fullName: string };
    usedByVisitor?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token');
      if (token) {
        setInviteToken(token);
        verifyToken(token);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const verifyToken = async (token: string) => {
    setTokenChecking(true);
    setError('');
    try {
      const data = await verifyShowcaseInvite(token);
      setInviteInfo(data as any);
      if (!data.valid) {
        setError(data.error || 'هذا الرابط غير صالح أو تم استخدامه مسبقاً.');
      }
    } catch (err: any) {
      console.error("Token verification error:", err);
      setInviteInfo({ valid: false, error: 'تعذر التحقق من صلاحية الرابط' });
      setError('تعذر التحقق من صلاحية الرابط، يرجى المحاولة مرة أخرى.');
    } finally {
      setTokenChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!visitorName.trim()) {
      setError('يرجى إدخال اسمك الكريم');
      return;
    }

    // If using an invite token that is invalid/used, do not proceed
    if (inviteToken && inviteInfo && !inviteInfo.valid) {
      setError('لا يمكن الدخول باستخدام رابط منتهي الصلاحية أو مستخدم مسبقاً.');
      return;
    }

    // If not using invite token, require agent username and password
    if (!inviteToken && (!username.trim() || !password.trim())) {
      setError('يرجى إدخال بيانات الوكيل كاملة');
      return;
    }

    setLoading(true);
    try {
      const res = await loginShowcase({
        visitorName: visitorName.trim(),
        inviteToken: inviteToken || undefined,
        username: username.trim() || undefined,
        password: password.trim() || undefined
      });

      onSuccess(res.agent, res.visitorName);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-[#111] border border-brq-gold/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brq-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-6 relative">
          <div className="w-20 h-20 mb-3">
            <Animated3DLogo />
          </div>
          <h1 className="text-2xl font-black text-white text-center">معرض شركة الوفاء المتميز</h1>
          
          {inviteToken && inviteInfo?.valid && (
            <div className="mt-3 px-3.5 py-1.5 bg-brq-gold/15 border border-brq-gold/40 rounded-full flex items-center gap-2 text-xs text-brq-gold font-bold">
              <Sparkles size={14} className="animate-pulse" />
              <span>دعوة خاصة من الوكيل: {inviteInfo.agent?.fullName}</span>
            </div>
          )}

          {!inviteToken && (
            <p className="text-xs text-white/50 text-center mt-2">
              يرجى إدخال اسمك وبيانات الوكيل للدخول إلى المعرض الحصري
            </p>
          )}
        </div>

        {/* Loading Token Check */}
        {tokenChecking && (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-white/70">
            <RefreshCw className="animate-spin text-brq-gold" size={28} />
            <p className="text-sm">جاري التحقق من صلاحية رابط الدعوة...</p>
          </div>
        )}

        {/* Token is ALREADY USED or INVALID */}
        {!tokenChecking && inviteToken && inviteInfo && !inviteInfo.valid && (
          <div className="space-y-4">
            <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-5 rounded-2xl text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <Lock size={24} />
              </div>
              <h3 className="font-black text-base text-white">رابط الدعوة مستخدم مسبقاً وغير صالح</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                عذراً، هذا الرابط مخصص للاستخدام لمرة واحدة فقط وقد تم استخدامه مسبقاً للدخول إلى المعرض.
              </p>
              <div className="p-2.5 bg-black/40 rounded-xl text-[11px] text-amber-300/90 border border-amber-500/20 mt-2">
                📌 للحصول على صلاحية الدخول، يرجى التواصل مع الوكيل ليقوم بإنشاء وإرسال <b>رابط دعوة جديد</b> خاص بك.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // Clear token and switch to manual login if agent/admin wants to sign in directly
                setInviteToken(null);
                setInviteInfo(null);
                setError('');
                window.history.replaceState({}, '', window.location.pathname);
              }}
              className="w-full py-2.5 text-xs text-white/50 hover:text-white transition-colors text-center block"
            >
              تسجيل الدخول يدوياً عبر بيانات الوكيل
            </button>
          </div>
        )}

        {/* Normal Login OR Valid Invite Form */}
        {!tokenChecking && (!inviteToken || (inviteInfo && inviteInfo.valid)) && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  اسمك الكريم (زائر المعرض) <span className="text-brq-gold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-white/40">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-colors"
                    placeholder="أدخل اسمك الكريم..."
                    autoFocus
                  />
                </div>
                {inviteToken && (
                  <p className="text-[11px] text-emerald-400/80 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    الرابط صالح لمرة واحدة وسيتم تفعيله باسمك الآن.
                  </p>
                )}
              </div>

              {/* Only show agent username/password if NOT entering via an active invite token */}
              {!inviteToken && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5">
                      رمز الوكيل (معرف الحساب)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-white/40">
                        <Shield size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-colors"
                        placeholder="أدخل رمز الوكيل..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-1.5">
                      كلمة مرور الوكيل
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-white/40">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/15 rounded-xl py-3 pr-10 pl-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-colors"
                        placeholder="أدخل كلمة المرور..."
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brq-gold hover:bg-yellow-400 text-black font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-[0.98]"
              >
                {loading ? 'جاري التحقق والدخول...' : 'دخول للمعرض الحصري'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

