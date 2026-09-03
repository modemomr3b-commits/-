import React, { useState } from 'react';
import { 
  X, Check, Copy, Share2, MessageCircle, ExternalLink, 
  Sparkles, Globe, ShieldCheck, Smartphone 
} from 'lucide-react';
import { 
  copyTextToClipboard, 
  getWhatsAppShareUrls, 
  openWhatsAppDirectly, 
  canShareNative, 
  shareNative 
} from '../../utils/whatsappShare';

export interface WhatsAppShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inviteData: {
    token?: string;
    agentName?: string;
    inviteUrl?: string;
    fullUrl?: string;
    message?: string;
  } | null;
}

export const WhatsAppShareDialog: React.FC<WhatsAppShareDialogProps> = ({
  isOpen,
  onClose,
  inviteData
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !inviteData) return null;

  const fullUrl = inviteData.fullUrl || (typeof window !== 'undefined' ? `${window.location.origin}${inviteData.inviteUrl || '/showcase'}` : '/showcase');
  const agentDisplayName = inviteData.agentName || 'الوكيل المعتمد';
  const shareMessage = inviteData.message || `✨ معرض شركة الوفاء المتميز BRQ ✨\nدعوة خاصة من: ${agentDisplayName}\nتفضل بالاطلاع على أحدث الموديلات والتشكيلات الحصرية عبر الرابط المباشر:\n${fullUrl}`;

  const { waApiUrl, waMeUrl } = getWhatsAppShareUrls(shareMessage);

  const handleCopyFullMessage = async () => {
    const ok = await copyTextToClipboard(shareMessage);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleCopyLinkOnly = async () => {
    const ok = await copyTextToClipboard(fullUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    await shareNative(
      `معرض شركة الوفاء - دعوة من ${agentDisplayName}`,
      shareMessage,
      fullUrl
    );
  };

  const handleDirectWhatsAppClick = () => {
    // Copy as a safety net when clicking the link
    copyTextToClipboard(shareMessage);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden text-right"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10 cursor-pointer"
          title="إغلاق"
        >
          <X size={18} />
        </button>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <MessageCircle size={26} className="fill-emerald-400/20" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>مشاركة المعرض عبر واتساب</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  جاهز للإرسال
                </span>
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                رابط حصري ومباشر يتيح لزبائنك تصفح الموديلات والطلب بسهولة
              </p>
            </div>
          </div>

          {/* Main WhatsApp Direct Action Button (Anchor tag so it can never be blocked) */}
          <div className="space-y-2">
            <a
              href={waApiUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDirectWhatsAppClick}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all active:scale-98 cursor-pointer border border-emerald-400/40"
            >
              <MessageCircle size={20} className="fill-white/30" />
              <span>فتح تطبيق واتساب الآن وإرسال الرابط</span>
              <ExternalLink size={16} className="text-emerald-100" />
            </a>

            {/* In case wa.me is preferred */}
            <div className="flex justify-center text-[11px] text-white/40">
              <span>أو يمكنك استعمال الرابط البديل: </span>
              <a 
                href={waMeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleDirectWhatsAppClick}
                className="mr-1 text-emerald-400 hover:underline font-mono"
              >
                wa.me (اضغط هنا)
              </a>
            </div>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyFullMessage}
              className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copiedText
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-white/20'
              }`}
            >
              {copiedText ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>تم نسخ الرسالة بالكامل!</span>
                </>
              ) : (
                <>
                  <Copy size={16} className="text-amber-400" />
                  <span>نسخ الرسالة مع الرابط</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyLinkOnly}
              className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white hover:border-white/20'
              }`}
            >
              {copiedLink ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>تم نسخ الرابط فقط!</span>
                </>
              ) : (
                <>
                  <Globe size={16} className="text-sky-400" />
                  <span>نسخ الرابط المباشر فقط</span>
                </>
              )}
            </button>
          </div>

          {/* Native Share for mobile devices */}
          {canShareNative() && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Share2 size={16} className="text-purple-400" />
              <span>مشاركة عبر تطبيقات أخرى (تيليجرام، ماسنجر، SMS...)</span>
            </button>
          )}

          {/* Preview Box */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-white/50 text-[11px] pb-1 border-b border-white/5">
              <span className="font-semibold text-emerald-400">معاينة الرسالة المجهزة:</span>
              <span>المرسل: {agentDisplayName}</span>
            </div>
            <p className="text-white/80 text-[11px] leading-relaxed whitespace-pre-line font-mono select-all bg-white/5 p-2 rounded-lg border border-white/5">
              {shareMessage}
            </p>
          </div>

          {/* Footer Features */}
          <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>صلاحية الرابط: 24 ساعة لجميع الزوار</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>دخول سريع ومستمر</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
