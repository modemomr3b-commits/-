async function run() {
  const res = await fetch('http://localhost:3000/api/notify-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'إشعار تجريبي',
      body: 'هذا إشعار تجريبي للتحقق من وصول الإشعارات عندما يكون التطبيق مغلقاً.'
    })
  });
  console.log(await res.json());
}
run();
