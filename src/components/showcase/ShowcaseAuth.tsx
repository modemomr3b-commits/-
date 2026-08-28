import React, { useState, useEffect } from 'react';
import { User, Phone, ArrowRight, Sparkles, CheckCircle2, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import Animated3DLogo from '../ui/Animated3DLogo';
import { verifyShowcaseInvite, loginShowcase, getSavedShowcaseVisitor, saveShowcaseVisitor } from '../../services/showcaseService';

interface ShowcaseAuthProps {
  onSuccess: (agentInfo: { id: string, fullName: string }, visitorName: string, visitorPhone?: string) => void;
}

export default function ShowcaseAuth({ onSuccess }: ShowcaseAuthProps) {
  const [visitorName, setVisitorName] = useState(() => {
    const saved = getSavedShowcaseVisitor();
    return saved?.visitorName || '';
  });
  const [visitorPhone, setVisitorPhone] = useState(() => {
    const saved = getSavedShowcaseVisitor();
    return saved?.visitorPhone || '';
  });
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  // Invite & Agent detection
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [agentParam, setAgentParam] = useState<string | null>(null);
  const [agentNameParam, setAgentNameParam] = useState<string | null>(null);
  const [agentInfo, setAgentInfo] = useState<{ id: string; fullName: string } | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token') || '';
      const agent = urlParams.get('agent') || urlParams.get('agentId') || '';
      const name = urlParams.get('agentName') || urlParams.get('name') || '';
      
      if (token) setInviteToken(token);
      if (agent) setAgentParam(agent);
      if (name) setAgentNameParam(name);

      if (agent) {
        setAgentInfo({
          id: agent,
          fullName: name || 'الوكيل المعتمد'
        });
      }

      if (token || agent) {
        verifyShowcaseInvite(token, agent, name).then((res) => {
          if (res.expired) {
            setIsExpired(true);
            setError(res.error || 'انتهت صلاحية هذا الرابط (صلاحية كل رابط 24 ساعة). يرجى طلب رابط جديد من الوكيل.');
          } else if (res && res.agent && res.agent.id) {
            setAgentInfo(res.agent);
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isExpired) {
      setError('انتهت صلاحية هذا الرابط (صلاحية كل رابط 24 ساعة). يرجى طلب رابط جديد ومحدث من الوكيل.');
      return;
    }

    if (!visitorName.trim()) {
      setError('يرجى إدخال اسمك الكريم');
      return;
    }

    if (!visitorPhone.trim()) {
      setError('يرجى إدخال رقم هاتفك للتواصل');
      return;
    }

    const resolvedAgentId = agentInfo?.id || agentParam || undefined;
    const resolvedAgentName = agentInfo?.fullName || agentNameParam || undefined;

    setLoading(true);
    try {
      const res = await loginShowcase({
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        inviteToken: inviteToken || undefined,
        agentId: resolvedAgentId,
        agentName: resolvedAgentName
      });

      const finalAgent = (res && res.agent && res.agent.id) ? res.agent : {
        id: resolvedAgentId || 'agent_1',
        fullName: resolvedAgentName || 'الوكيل المعتمد'
      };

      const finalName = res.visitorName || visitorName.trim();
      const finalPhone = res.visitorPhone || visitorPhone.trim();

      saveShowcaseVisitor(finalName, finalPhone, finalAgent);
      onSuccess(finalAgent, finalName, finalPhone);
    } catch (err: any) {
      if (err.message && err.message.includes('انتهت صلاحية')) {
        setIsExpired(true);
      }
      setError(err.message || 'حدث خطأ أثناء الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 selection:bg-brq-gold selection:text-black" dir="rtl">
      <div className="w-full max-w-md bg-[#111] border border-brq-gold/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brq-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-6 relative">
          <div className="w-20 h-20 mb-3">
            <Animated3DLogo />
          </div>
          <h1 className="text-2xl font-black text-white text-center">معرض شركة الوفاء المتميز</h1>
          
          {agentInfo && agentInfo.fullName && (
            <div className="mt-3 px-3.5 py-1.5 bg-brq-gold/15 border border-brq-gold/40 rounded-full flex items-center gap-2 text-xs text-brq-gold font-bold animate-in fade-in">
              <Sparkles size={14} className="animate-pulse" />
              <span>مرحباً بك عبر رابط: {agentInfo.fullName}</span>
            </div>
          )}

          <p className="text-xs text-white/60 text-center mt-2.5 leading-relaxed">
            تفضل بإدخال اسمك ورقم هاتفك للاطلاع على التشكيلات الحصرية وأحدث الموديلات مباشرة
          </p>
        </div>

        {isExpired ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl mb-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
              <Clock size={24} />
            </div>
            <h3 className="font-bold text-sm text-red-300">انتهت صلاحية رابط المعرض</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              روابط المعرض صالحة لمدة 24 ساعة فقط للحفاظ على تحديثات الأسعار والموديلات. يرجى مراسلة الوكيل لإرسال رابط جديد ومحدث.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-2xl mb-4 text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/90 mb-1.5">
                  الاسم الكامل <span className="text-brq-gold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-white/40">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-2xl py-3.5 pr-11 pl-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-colors"
                    placeholder="أدخل اسمك الكريم..."
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/90 mb-1.5">
                  رقم الهاتف <span className="text-brq-gold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-white/40">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-2xl py-3.5 pr-11 pl-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brq-gold focus:ring-1 focus:ring-brq-gold transition-colors font-mono"
                    placeholder="مثلاً: 07801234567"
                    dir="ltr"
                  />
                </div>
                <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  لإرسال تفاصيل التشكيلات وتأكيد الطلبات عبر واتساب
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brq-gold hover:bg-yellow-400 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 shadow-[0_0_25px_rgba(251,191,36,0.3)] active:scale-[0.98] text-sm cursor-pointer"
              >
                {loading ? 'جاري الدخول للمعرض...' : 'دخول للمعرض الحصري'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-white/40">
          <ShoppingBag size={13} className="text-brq-gold" />
          <span>شركة الوفاء التجارية - جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}

