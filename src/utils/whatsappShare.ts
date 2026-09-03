/**
 * Universal WhatsApp and Showcase link sharing utilities.
 * Designed to work reliably across mobile devices, desktop browsers,
 * WebViews, and iframe sandbox environments without getting blocked.
 */

export function copyTextToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 1. Try modern clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => resolve(true))
        .catch(() => {
          // Fall back to execCommand
          resolve(fallbackCopy(text));
        });
      return;
    }

    // 2. Fallback
    resolve(fallbackCopy(text));
  });
}

function fallbackCopy(text: string): boolean {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Prevent scrolling to bottom of page in MS Edge
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Fallback copy failed:', err);
    return false;
  }
}

export function getWhatsAppShareUrls(text: string) {
  const encoded = encodeURIComponent(text);
  return {
    waApiUrl: `https://api.whatsapp.com/send?text=${encoded}`,
    waMeUrl: `https://wa.me/?text=${encoded}`,
    waScheme: `whatsapp://send?text=${encoded}`,
  };
}

/**
 * Opens WhatsApp directly using multiple safe strategies that bypass iframe
 * and popup blocker restrictions.
 */
export function openWhatsAppDirectly(text: string): boolean {
  const { waApiUrl, waMeUrl, waScheme } = getWhatsAppShareUrls(text);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  let launched = false;

  // Strategy 1: Dynamic anchor element with target="_blank" (best for bypass in iframes and desktop)
  try {
    const link = document.createElement('a');
    link.href = isMobile ? waApiUrl : waApiUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1000);
    launched = true;
  } catch (e) {
    console.warn('Anchor trigger failed:', e);
  }

  // Strategy 2: Direct window.open popup
  try {
    const win = window.open(waApiUrl, '_blank', 'noopener,noreferrer');
    if (win) {
      launched = true;
    }
  } catch (e) {
    console.warn('window.open failed:', e);
  }

  // Strategy 3: On mobile standalone devices, try triggering native WhatsApp protocol
  if (isMobile && !isIframe) {
    try {
      // Trying native app scheme on mobile browser directly opens WhatsApp app
      window.location.href = waScheme;
      launched = true;
    } catch {
      // ignore
    }
  }

  return launched;
}

export function canShareNative(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareNative(title: string, text: string, url?: string): Promise<boolean> {
  if (!canShareNative()) return false;
  try {
    await navigator.share({
      title,
      text,
      url: url || undefined,
    });
    return true;
  } catch (err) {
    console.warn('Native share cancelled or failed:', err);
    return false;
  }
}
