export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('متصفحك لا يدعم الإشعارات');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('الرجاء السماح بالإشعارات من إعدادات المتصفح.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
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

    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    alert('حدث خطأ أثناء تفعيل الإشعارات: ' + (error as Error).message);
    return false;
  }
}

export async function isSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

function urlBase64ToUint8Array(base64String: string) {
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
