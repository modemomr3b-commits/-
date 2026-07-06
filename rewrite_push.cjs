const fs = require('fs');

const code = `export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('متصفحك لا يدعم الإشعارات');
    return false;
  }

  try {
    if (!('Notification' in window)) {
      alert('متصفحك لا يدعم الإشعارات (Notification API غير متوفر).');
      return false;
    }

    if (Notification.permission === 'denied') {
      alert('الإشعارات محظورة. يرجى السماح بها من إعدادات المتصفح.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('الرجاء السماح بالإشعارات من إعدادات المتصفح.');
      return false;
    }

    const swReg = await navigator.serviceWorker.getRegistration();
    if (!swReg) {
      alert('لم يتم تحميل Service Worker بعد، يرجى تحديث الصفحة والمحاولة مرة أخرى.');
      return false;
    }

    let registration;
    try {
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('انتهى وقت الاتصال بالخدمة (Timeout)')), 5000))
      ]);
    } catch (swErr) {
      alert('خطأ في تهيئة الإشعارات: ' + swErr.message);
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = 'BLyNGvqb8WAkMzf7JPOzKihbeHnZR_fcVPCC3Hv1382Y1EoNhw3uDIBL4l6eF6lezioeP1XGmqr4Al2WPy--Qpk';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    await fetch('/api/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    alert('تم تفعيل الإشعارات بنجاح!');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    alert('حدث خطأ أثناء تفعيل الإشعارات: ' + (error.message || 'خطأ غير معروف'));
    return false;
  }
}

export async function isSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  
  try {
    const swReg = await navigator.serviceWorker.getRegistration();
    if (!swReg) return false;
    
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  base64String = base64String.trim();
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
`;

fs.writeFileSync('src/pushService.ts', code);
