import React, { useState, useEffect } from 'react';
import { User, Phone, ArrowRight, Sparkles, ShoppingBag, Clock, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';
import Animated3DLogo from '../ui/Animated3DLogo';
import { verifyShowcaseInvite, loginShowcase, getSavedShowcaseVisitor, saveShowcaseVisitor } from '../../services/showcaseService';
import { api } from '../../api';

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

      // Check if visitor has already entered their info previously on this device
      const saved = getSavedShowcaseVisitor();

      if (token || agent) {
        verifyShowcaseInvite(token, agent, name).then((res) => {
          if (res.expired) {
            setIsExpired(true);
            setError(res.error || 'انتهت صلاحية هذا الرابط (صلاحية كل رابط 24 ساعة). يرجى طلب رابط جديد من الوكيل.');
          } else {
            const targetAgent = res.agent || {
              id: agent || 'agent_showcase',
              fullName: name || 'الوكيل المعتمد'
            };
            setAgentInfo(targetAgent);

            // AUTO-LOGIN: If visitor already saved on this device, log in immediately without asking again!
            if (saved && saved.visitorName && saved.visitorName.trim()) {
              const cleanPhone = saved.visitorPhone || '';
              saveShowcaseVisitor(saved.visitorName, cleanPhone, targetAgent, true);
              // Background log
              loginShowcase({
                visitorName: saved.visitorName,
                visitorPhone: cleanPhone,
                inviteToken: token || undefined,
                agentId: targetAgent.id,
                agentName: targetAgent.fullName
              }).catch(() => {});

              onSuccess(targetAgent, saved.visitorName, cleanPhone);
            }
          }
        }).catch(() => {
          if (saved && saved.visitorName && saved.visitorName.trim()) {
            const fallbackAgent = { id: agent || 'agent_showcase', fullName: name || 'الوكيل المعتمد' };
            saveShowcaseVisitor(saved.visitorName, saved.visitorPhone || '', fallbackAgent, true);
            onSuccess(fallbackAgent, saved.visitorName, saved.visitorPhone || '');
          }
        });
      } else if (saved && saved.visitorName && saved.visitorName.trim()) {
        // Direct entry without link params for existing visitor
        const defaultAgent = { id: 'agent_showcase', fullName: 'معرض شركة الوفاء' };
        saveShowcaseVisitor(saved.visitorName, saved.visitorPhone || '', defaultAgent, true);
        onSuccess(defaultAgent, saved.visitorName, saved.visitorPhone || '');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Strict phone normalization & validation
  const validateVisitorData = (name: string, phone: string): { valid: boolean; cleanPhone: string; error?: string } => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { valid: false, cleanPhone: '', error: 'يرجى كتابة اسمك الكريم' };
    }
    // Reject if name does not contain any letters (Arabic or Latin)
    const hasLetters = /[\p{L}]/u.test(trimmedName) || /[a-zA-Z\u0600-\u06FF]/.test(trimmedName);
    if (!hasLetters) {
      return { valid: false, cleanPhone: '', error: 'يرجى كتابة اسم حقيقي بالأحرف' };
    }

    // Convert Arabic-Indic numerals (٠-٩) to ASCII (0-9)
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let normalized = phone.trim();
    for (let i = 0; i < 10; i++) {
      normalized = normalized.replace(new RegExp(arabicNumbers[i], 'g'), i.toString());
    }
    const digitsOnly = normalized.replace(/\D/g, '');

    if (!digitsOnly || digitsOnly.length < 10) {
      return { valid: false, cleanPhone: '', error: 'رقم الهاتف غير مكتمل. يرجى إدخال رقم هاتف صحيح مكون من 11 رقماً (مثال: 07801234567)' };
    }

    // Reject all-identical numbers like 00000000000
    if (/^(\d)\1+$/.test(digitsOnly)) {
      return { valid: false, cleanPhone: '', error: 'رقم الهاتف غير صحيح (أرقام مكررة وهمية)' };
    }

    // Check Iraqi phone format
    let local11 = '';
    if (digitsOnly.startsWith('009647') && digitsOnly.length === 14) {
      local11 = '0' + digitsOnly.substring(5);
    } else if (digitsOnly.startsWith('9647') && digitsOnly.length === 12) {
      local11 = '0' + digitsOnly.substring(3);
    } else if (digitsOnly.startsWith('07') && digitsOnly.length === 11) {
      local11 = digitsOnly;
    } else if (digitsOnly.startsWith('7') && digitsOnly.length === 10) {
      local11 = '0' + digitsOnly;
    }

    if (local11) {
      const validPrefixes = ['078', '077', '075', '079', '076', '074'];
      const prefix = local11.substring(0, 3);
      if (!validPrefixes.includes(prefix)) {
        return { valid: false, cleanPhone: '', error: `مقدمة الرقم (${prefix}) غير معتمدة. يجب أن يبدأ الرقم بـ 078 أو 077 أو 075 أو 079` };
      }
      return { valid: true, cleanPhone: local11 };
    }

    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { valid: true, cleanPhone: '+' + digitsOnly };
    }

    return {
      valid: false,
      cleanPhone: '',
      error: 'رقم الهاتف غير مطابق. رقم الهاتف يجب أن يتكون من 11 رقماً ويبدأ بـ (078 أو 077 أو 075 أو 079)'
    };
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isExpired) {
      setError('انتهت صلاحية هذا الرابط (صلاحية كل رابط 24 ساعة). يرجى طلب رابط جديد ومحدث من الوكيل.');
      return;
    }

    const validation = validateVisitorData(visitorName, visitorPhone);
    if (!validation.valid) {
      setError(validation.error || 'يرجى إدخال رقم هاتف صحيح');
      return;
    }

    const cleanName = visitorName.trim();
    const cleanPhone = validation.cleanPhone;
    setVisitorPhone(cleanPhone);
    setLoading(true);

    try {
      const resolvedAgent = agentInfo || {
        id: agentParam || 'agent_showcase',
        fullName: agentNameParam || 'الوكيل المعتمد'
      };

      // 1. Immediately and permanently remember visitor on this device
      saveShowcaseVisitor(cleanName, cleanPhone, resolvedAgent, true);

      // 2. Register visitor visit in backend database
      try {
        await loginShowcase({
          visitorName: cleanName,
          visitorPhone: cleanPhone,
          inviteToken: inviteToken || undefined,
          agentId: resolvedAgent.id,
          agentName: resolvedAgent.fullName
        });
      } catch (loginErr: any) {
        if (loginErr.message && (loginErr.message.includes('تم إيقاف هذا الحساب') || loginErr.message.includes('موقوف'))) {
          throw loginErr;
        }
      }

      // 3. Enter showcase immediately! Single-step, seamless experience
      onSuccess(resolvedAgent, cleanName, cleanPhone);
    } catch (err: any) {
      if (err.message && err.message.includes('انتهت صلاحية')) {
        setIsExpired(true);
      }
      setError(err.message || 'حدث خطأ أثناء الدخول للمعرض');
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

          <p className="text-xs text-white/70 text-center mt-2.5 leading-relaxed">
            أدخل اسمك ورقم هاتفك مرة واحدة فقط للدخول السريع ومتابعة تشكيلات وموديلات المعرض مباشرة
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
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/50 text-right">
              💡 <strong className="text-white/80">ملاحظة:</strong> بمجرد أن يرسل لك الوكيل رابطاً جديداً، ستدخل مباشرة وتلقائياً دون الحاجة لكتابة بياناتك مرة أخرى.
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-2xl mb-4 text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  رقم الهاتف (للتواصل وتأكيد الطلبات) <span className="text-brq-gold">*</span>
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
                <div className="flex items-center justify-between text-[11px] text-white/50 mt-1">
                  <span>يجب أن يتكون من 11 رقماً (078 / 077 / 075 / 079)</span>
                  <span className="text-emerald-400/90 font-bold flex items-center gap-1">
                    <ShieldCheck size={12} />
                    <span>حفظ لمرة واحدة</span>
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 via-brq-gold to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-6 shadow-[0_0_30px_rgba(251,191,36,0.35)] active:scale-[0.98] text-sm cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>جاري فتح المعرض وتوثيق الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>الدخول إلى المعرض الآن</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/60 leading-relaxed text-center">
                ✨ <strong className="text-white/90">دخول دائم وتلقائي:</strong> لن يطلب منك هذا الجهاز كتابة بياناتك مرة أخرى عند فتح أي رابط جديد للمعرض.
              </div>
            </form>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-white/40">
          <ShoppingBag size={13} className="text-brq-gold" />
          <span>شركة الوفاء للتجارة العامة - جميع الحقوق محفوظة</span>
        </div>
      </div>
    </div>
  );
}
