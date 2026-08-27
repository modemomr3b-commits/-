import React from 'react';
import { Sparkles, Phone, MessageCircle, Send, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatWhatsAppUrl, formatTelegramUrl, formatTelUrl, ContactSettings } from '../common/QuickContactWidget';

interface ShowcasePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: ContactSettings | null;
  categoryName?: string;
}

export default function ShowcasePromptModal({
  isOpen,
  onClose,
  settings,
  categoryName
}: ShowcasePromptModalProps) {
  if (!isOpen) return null;

  const phone1 = settings?.phone || '07801359735';
  const phone2 = settings?.phone2 || '07817982888';
  const tg1 = settings?.telegram1 || phone1;
  const tg2 = settings?.telegram2 || phone2;

  const waUrl1 = formatWhatsAppUrl(phone1, `السلام عليكم شركة الوفاء المتميز، أود رؤية المزيد من الموديلات والكتالوجات الحصرية ${categoryName ? `لقسم ${categoryName}` : ''}.`);
  const waUrl2 = phone2 ? formatWhatsAppUrl(phone2, `السلام عليكم شركة الوفاء المتميز، أود رؤية المزيد من الموديلات والكتالوجات الحصرية ${categoryName ? `لقسم ${categoryName}` : ''}.`) : '';
  const telUrl1 = formatTelUrl(phone1);
  const telUrl2 = phone2 ? formatTelUrl(phone2) : '';
  const tgUrl1 = formatTelegramUrl(tg1, phone1);
  const tgUrl2 = phone2 ? formatTelegramUrl(tg2, phone2) : '';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#111111] border-2 border-yellow-500/50 rounded-3xl p-6 sm:p-7 max-w-lg w-full relative shadow-[0_0_60px_rgba(234,179,8,0.25)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          title="إغلاق ومتابعة التصفح"
        >
          <X size={18} />
        </button>

        {/* Top Header Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500/30 to-amber-500/10 border border-yellow-500/40 flex items-center justify-center text-yellow-300 shadow-md shrink-0">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-yellow-400/90 tracking-wide uppercase">
              كتالوجات وتشكيلات خاصة
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              لرؤية المزيد من المنتجات الحصرية
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-6 font-medium bg-white/5 p-3.5 rounded-2xl border border-white/10">
          تتوفر لدينا موديلات ونماذج إضافية متجددة يومياً، يمكنك مراسلتنا أو الاتصال بنا مباشرة عبر الأرقام التالية لتزويدكم بكامل التفاصيل:
        </p>

        {/* Contact Numbers Cards */}
        <div className="space-y-3.5 mb-6">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-yellow-500/10 to-black/60 border border-yellow-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>الرقم الرئيسي (1)</span>
              </span>
              <span className="font-mono text-white text-sm font-bold tracking-wider" dir="ltr">
                {phone1}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={waUrl1}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <MessageCircle size={15} />
                <span>واتساب</span>
              </a>
              <a
                href={tgUrl1}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Send size={15} />
                <span>تيليجرام</span>
              </a>
              <a
                href={telUrl1}
                className="py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Phone size={15} />
                <span>مكالمة</span>
              </a>
            </div>
          </div>

          {/* Card 2 */}
          {phone2 && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 to-black/60 border border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                  <span>الرقم الإضافي (2)</span>
                </span>
                <span className="font-mono text-white text-sm font-bold tracking-wider" dir="ltr">
                  {phone2}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={waUrl2}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <MessageCircle size={15} />
                  <span>واتساب</span>
                </a>
                <a
                  href={tgUrl2}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Send size={15} />
                  <span>تيليجرام</span>
                </a>
                <a
                  href={telUrl2}
                  className="py-2.5 px-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Phone size={15} />
                  <span>مكالمة</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>متابعة تصفح المعرض</span>
            <ArrowRight size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
