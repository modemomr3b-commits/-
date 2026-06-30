import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if it's already installed (standalone mode)
    const standaloneCheck = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);
    
    // iOS Safari detection
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

    if (isIOSDevice && isSafari && !standaloneCheck) {
      setIsIOS(true);
      if (!localStorage.getItem('hideInstallBanner')) {
        setShowInstallPrompt(true);
      }
    }

    if (standaloneCheck || localStorage.getItem('hideInstallBanner')) {
      setShowInstallPrompt(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show prompt if not already installed
      if (!standaloneCheck && !localStorage.getItem('hideInstallBanner')) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      setIsStandalone(true);
      alert('تم تثبيت التطبيق بنجاح');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    const handleHide = () => {
      setShowInstallPrompt(false);
      localStorage.setItem('hideInstallBanner', 'true');
    };
    window.addEventListener('hide-install-prompt', handleHide);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('hide-install-prompt', handleHide);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  return { deferredPrompt, isIOS, showInstallPrompt, setShowInstallPrompt, handleInstallClick, isStandalone };
}
