const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Set local storage for login
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('brq-storage', JSON.stringify({state: { user: { uid: 'admin1', role: 'admin' }, loading: false }}));
  });
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 6000));
  
  const content = await page.content();
  if (content.includes('Something went wrong')) {
      console.log('Error boundary triggered for admin');
      
      const errorText = await page.evaluate(() => {
          const pre = document.querySelector('pre');
          const p = document.querySelector('div[style*="color: red"] p');
          return (p ? p.innerText : '') + '\n' + (pre ? pre.innerText : '');
      });
      console.log('REACT ERROR:\n', errorText);
  } else {
      console.log('No error boundary triggered for admin.');
      const rootContent = await page.evaluate(() => document.getElementById('root').innerHTML);
      console.log("Root Content:", rootContent.substring(0, 500));
  }
  
  await browser.close();
})();
