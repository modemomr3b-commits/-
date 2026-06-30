import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if it's already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // iOS Safari detection
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

    if (isIOSDevice && isSafari && !isStandalone) {
      setIsIOS(true);
    }
    
    if (!isStandalone) {
      setShowInstallPrompt(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const handleHide = () => setShowInstallPrompt(false);
    window.addEventListener('hide-install-prompt', handleHide);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('hide-install-prompt', handleHide);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('لتثبيت التطبيق:\n1. اضغط على خيارات المتصفح (الثلاث نقاط بالزاوية)\n2. اختر "الإضافة للشاشة الرئيسية" أو "تثبيت التطبيق"\n(Add to Home Screen / Install App)');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  return { deferredPrompt, isIOS, showInstallPrompt, setShowInstallPrompt, handleInstallClick };
}
