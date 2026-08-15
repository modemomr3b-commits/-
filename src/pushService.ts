export async function subscribeToPushNotifications(): Promise<{ success: boolean; message?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { success: false, message: 'متصفحك لا يدعم الإشعارات المباشرة.' };
  }

  try {
    if (Notification.permission === 'denied') {
      return { 
        success: false, 
        message: 'الإشعارات محظورة في متصفحك. يرجى تفعيل السماح بالإشعارات من إعدادات المتصفح أو إعدادات الموقع.' 
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        message: 'خلي الإشعارات تتفعل علمود يوصلك كل الجديد الي ننشرة.' 
      };
    }

    const swReg = await navigator.serviceWorker.getRegistration();
    if (!swReg) {
      return { success: false, message: 'جارٍ تهيئة نظام الإشعارات، يرجى المحاولة بعد لحظات.' };
    }

    let registration;
    try {
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('انتهى وقت الاتصال بالخدمة')), 5000))
      ]) as ServiceWorkerRegistration;
    } catch (swErr: any) {
      return { success: false, message: 'خطأ في تهيئة الإشعارات: ' + swErr.message };
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

    return { success: true, message: 'تم تفعيل الإشعارات بنجاح!' };
  } catch (error: any) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, message: 'حدث خطأ أثناء تفعيل الإشعارات: ' + (error.message || 'خطأ غير معروف') };
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
    ]) as ServiceWorkerRegistration;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
      }).catch(console.error);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  base64String = base64String.trim();
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
