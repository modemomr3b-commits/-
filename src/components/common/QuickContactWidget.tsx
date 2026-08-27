import React, { useState } from 'react';
import { Phone, MessageCircle, Send, X, ExternalLink, Headset, Sparkles, ChevronDown } from 'lucide-react';

export interface ContactSettings {
  phone?: string;
  phone2?: string;
  telegram1?: string;
  telegram2?: string;
  companyName?: string;
}

interface QuickContactWidgetProps {
  settings?: ContactSettings | null;
  customMessage?: string;
  variant?: 'floating' | 'inline' | 'compact' | 'marquee';
  className?: string;
}

export function formatWhatsAppUrl(phone?: string, text?: string): string {
  if (!phone) return '#';
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  if (digits.startsWith('07') && digits.length === 11) {
    digits = '964' + digits.substring(1);
  }
  const defaultText = text || 'السلام عليكم شركة الوفاء المتميز، أود الاستفسار عن المنتجات والطلبات.';
  return `https://wa.me/${digits}?text=${encodeURIComponent(defaultText)}`;
}

export function formatTelegramUrl(tg?: string, fallbackPhone?: string): string {
  const target = (tg && tg.trim()) ? tg.trim() : (fallbackPhone && fallbackPhone.trim() ? fallbackPhone.trim() : '');
  if (!target) return '#';
  
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target;
  }
  if (target.startsWith('@')) {
    return `https://t.me/${target.substring(1)}`;
  }
  
  // If it's phone digits
  let digits = target.replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    if (digits.startsWith('00')) {
      digits = digits.substring(2);
    }
    if (digits.startsWith('07') && digits.length === 11) {
      digits = '964' + digits.substring(1);
    }
    return `https://t.me/+${digits}`;
  }
  
  return `https://t.me/${target}`;
}

export function formatTelUrl(phone?: string): string {
  if (!phone) return '#';
  return `tel:${phone.replace(/\s+/g, '')}`;
}

export default function QuickContactWidget({
  settings,
  customMessage,
  variant = 'floating',
  className = ''
}: QuickContactWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const phone1 = settings?.phone || '07801359735';
  const phone2 = settings?.phone2 || '07817982888';
  const tg1 = settings?.telegram1 || phone1;
  const tg2 = settings?.telegram2 || phone2;

  const waUrl1 = formatWhatsAppUrl(phone1, customMessage);
  const waUrl2 = phone2 ? formatWhatsAppUrl(phone2, customMessage) : '';
  const telUrl1 = formatTelUrl(phone1);
  const telUrl2 = phone2 ? formatTelUrl(phone2) : '';
  const tgUrl1 = formatTelegramUrl(tg1, phone1);
  const tgUrl2 = phone2 ? formatTelegramUrl(tg2, phone2) : '';

  if (variant === 'marquee') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/15 via-[#0c1021] to-yellow-500/15 border border-yellow-500/40 shadow-[0_0_25px_rgba(212,175,55,0.15)] backdrop-blur-xl ${className}`} dir="rtl">
        {/* Animated ambient background pulse */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 rounded-2xl blur-lg opacity-70 animate-pulse pointer-events-none"></div>

        {/* Shimmer sweep line animation */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none -translate-x-full animate-[shimmer_4s_infinite]"
          style={{
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          }}
        />

        <div className="relative p-3.5 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3.5 sm:gap-4 z-10">
          {/* Header text with luxury animated badge */}
          <div className="flex items-center gap-3.5 text-right w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] shrink-0">
                <Sparkles size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base text-yellow-300 drop-shadow-sm">
                    لرؤية المزيد من المنتجات والطلبات المباشرة
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    خدمة سريعة
                  </span>
                </div>
                <p className="text-xs text-white/75 mt-0.5 font-medium">
                  تواصل معنا مباشرة لطلب أي موديل بالاتصال أو عبر الواتساب والتيليجرام:
                </p>
              </div>
            </div>
          </div>

          {/* Action Cards for Both Numbers with Direct Click Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full lg:w-auto">
            {/* Phone 1 Badge & Actions */}
            <div className="flex items-center gap-2.5 bg-black/80 hover:bg-black/90 border border-yellow-500/50 hover:border-yellow-400 rounded-2xl p-1.5 sm:p-2 shadow-lg transition-all duration-300">
              <div className="text-right px-1">
                <span className="block text-[10px] text-yellow-400 font-bold">الرئيسي</span>
                <span className="font-mono text-yellow-300 text-xs sm:text-sm font-black tracking-wide" dir="ltr">{phone1}</span>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={waUrl1}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-1 text-xs font-bold hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  title="مراسلة واتساب"
                >
                  <MessageCircle size={14} className="text-white" />
                  <span>واتساب</span>
                </a>
                <a
                  href={tgUrl1}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-[0_0_10px_rgba(2,132,199,0.3)] active:scale-95 flex items-center gap-1 text-xs font-bold hover:shadow-[0_0_15px_rgba(2,132,199,0.5)]"
                  title="مراسلة تيليجرام"
                >
                  <Send size={14} className="text-white" />
                  <span>تيليجرام</span>
                </a>
                <a
                  href={telUrl1}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black transition-all shadow-[0_0_10px_rgba(212,175,55,0.4)] active:scale-95 flex items-center gap-1 text-xs font-black"
                  title="اتصال مباشر"
                >
                  <Phone size={14} />
                  <span>اتصال</span>
                </a>
              </div>
            </div>

            {/* Phone 2 Badge & Actions */}
            {phone2 && (
              <div className="flex items-center gap-2.5 bg-black/80 hover:bg-black/90 border border-blue-500/50 hover:border-blue-400 rounded-2xl p-1.5 sm:p-2 shadow-lg transition-all duration-300">
                <div className="text-right px-1">
                  <span className="block text-[10px] text-blue-400 font-bold">الإضافي</span>
                  <span className="font-mono text-blue-300 text-xs sm:text-sm font-black tracking-wide" dir="ltr">{phone2}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={waUrl2}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] active:scale-95 flex items-center gap-1 text-xs font-bold hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    title="مراسلة واتساب"
                  >
                    <MessageCircle size={14} className="text-white" />
                    <span>واتساب</span>
                  </a>
                  <a
                    href={tgUrl2}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-[0_0_10px_rgba(2,132,199,0.3)] active:scale-95 flex items-center gap-1 text-xs font-bold hover:shadow-[0_0_15px_rgba(2,132,199,0.5)]"
                    title="مراسلة تيليجرام"
                  >
                    <Send size={14} className="text-white" />
                    <span>تيليجرام</span>
                  </a>
                  <a
                    href={telUrl2}
                    className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.4)] active:scale-95 flex items-center gap-1 text-xs font-bold"
                    title="اتصال مباشر"
                  >
                    <Phone size={14} />
                    <span>اتصال</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`} dir="rtl">
        {/* Contact 1 */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-yellow-500/10 to-black/60 border border-yellow-500/30 text-right shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs font-bold">
              الرقم الرئيسي (1)
            </span>
            <span className="font-mono text-white text-sm font-bold" dir="ltr">{phone1}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={waUrl1}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <MessageCircle size={15} />
              <span>واتساب</span>
            </a>
            <a
              href={tgUrl1}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Send size={15} />
              <span>تيليجرام</span>
            </a>
            <a
              href={telUrl1}
              className="py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Phone size={15} />
              <span>اتصال</span>
            </a>
          </div>
        </div>

        {/* Contact 2 */}
        {phone2 && (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 to-black/60 border border-blue-500/30 text-right shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30 text-xs font-bold">
                الرقم الثاني (2)
              </span>
              <span className="font-mono text-white text-sm font-bold" dir="ltr">{phone2}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={waUrl2}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <MessageCircle size={15} />
                <span>واتساب</span>
              </a>
              <a
                href={tgUrl2}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Send size={15} />
                <span>تيليجرام</span>
              </a>
              <a
                href={telUrl2}
                className="py-2 px-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Phone size={15} />
                <span>اتصال</span>
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating Widget Variant
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" dir="rtl">
      {/* Contact Cards Popover */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-[#111111] border-2 border-yellow-500/40 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(234,179,8,0.2)] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-yellow-300">
                <Headset size={18} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">تواصل مباشر وطلبات</h4>
                <p className="text-[10px] text-white/50">واتساب • تيليجرام • اتصال هاتفي</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Number 1 */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-yellow-500/25">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                  <span>الرقم الرئيسي</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </span>
                <span className="font-mono text-white text-xs font-bold" dir="ltr">{phone1}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <a
                  href={waUrl1}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                >
                  <MessageCircle size={13} />
                  <span>واتساب</span>
                </a>
                <a
                  href={tgUrl1}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                >
                  <Send size={13} />
                  <span>تيليجرام</span>
                </a>
                <a
                  href={telUrl1}
                  className="py-2 px-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                >
                  <Phone size={13} />
                  <span>اتصال</span>
                </a>
              </div>
            </div>

            {/* Number 2 */}
            {phone2 && (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-blue-500/25">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-blue-300 flex items-center gap-1">
                    <span>الرقم الإضافي</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  </span>
                  <span className="font-mono text-white text-xs font-bold" dir="ltr">{phone2}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <a
                    href={waUrl2}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                  >
                    <MessageCircle size={13} />
                    <span>واتساب</span>
                  </a>
                  <a
                    href={tgUrl2}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                  >
                    <Send size={13} />
                    <span>تيليجرام</span>
                  </a>
                  <a
                    href={telUrl2}
                    className="py-2 px-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all active:scale-95 shadow"
                  >
                    <Phone size={13} />
                    <span>اتصال</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 py-3 px-4 sm:px-5 rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black font-extrabold text-xs sm:text-sm shadow-[0_4px_25px_rgba(234,179,8,0.5)] hover:shadow-[0_6px_35px_rgba(234,179,8,0.7)] transition-all active:scale-95 border-2 border-yellow-300 cursor-pointer"
        title="تواصل معنا عبر واتساب، تيليجرام أو اتصال مباشر"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
        </span>
        <div className="flex items-center gap-1.5">
          <MessageCircle size={18} className="text-black" />
          <Send size={16} className="text-black" />
          <Phone size={16} className="text-black" />
        </div>
        <span className="font-bold">تواصل وطلب</span>
      </button>
    </div>
  );
}
