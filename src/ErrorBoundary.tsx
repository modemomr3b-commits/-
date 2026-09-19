import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);

    const msg = error?.message || error?.toString() || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('loading chunk') ||
      msg.includes('importing module')
    ) {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
      }
      const key = 'brq_auto_reload_eb';
      const count = parseInt(sessionStorage.getItem(key) || '0', 10);
      if (count < 2) {
        sessionStorage.setItem(key, (count + 1).toString());
        setTimeout(() => {
          window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
        }, 300);
      }
    }
  }

  private handleReload = async () => {
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (e) {}
    }
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
  };

  private handleGoHome = () => {
    window.location.href = window.location.origin + '/?v=' + Date.now();
  };

  public render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || this.state.error?.toString() || '';
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('importing module') ||
        msg.includes('loading chunk');

      return (
        <div dir="rtl" className="min-h-screen bg-[#050a1a] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-lg shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400 text-3xl font-bold">
              ⚡
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">
                {isChunkError ? 'تحديث جديد متوفر بالنظام' : 'حدث خطأ أثناء تحميل الصفحة'}
              </h1>
              <p className="text-sm text-white/60 leading-relaxed">
                {isChunkError
                  ? 'تم تحديث نظام إدارة الطلبات بنسخة جديدة. يرجى الضغط على الزر أدناه لتحديث الصفحة ومتابعة العمل بأحدث إصدار.'
                  : 'حدث خطأ مفاجئ، يرجى إعادة تحميل الصفحة للمتابعة.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-[#d4af37] hover:bg-[#b89628] text-black font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#d4af37]/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                🔄 تحديث التطبيق ومسح التخزين المؤقت
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full bg-white/5 hover:bg-white/10 text-white/80 font-medium py-2.5 px-6 rounded-xl border border-white/10 transition-all text-sm cursor-pointer"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
