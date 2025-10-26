const puppeteer = require('puppeteer');

async function verifyERPLogin(rollNumber, password) {
  let browser;
  try {
    console.log('Launching ERP verification...');
    browser = await puppeteer.launch({
      headless: true, // Run in the background (no visible window)
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://erp.psit.ac.in/Student/');

    await page.type('#emailAddress', rollNumber);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    // --- THIS IS THE FIX ---
    // We will wait for the specific <a> tag with that exact href to appear.
    console.log('Login clicked, waiting for dashboard... (Waiting for logout link)');
    
    // This is a CSS attribute selector
    const logoutSelector = 'a[href="https://erp.psit.ac.in/Student/Logout"]';
    
    await page.waitForSelector(logoutSelector, { timeout: 15000 });
    // -----------------------

    // If the selector was found, it means we are logged in.
    console.log('ERP verification successful: Logout link found.');
    await browser.close();
    return true;

  } catch (error) {
    // If it times out after 15 seconds, the logout link never appeared,
    // which means the login credentials were truly invalid.
    console.error('ERP verification error (likely bad credentials):', error.message);
    if (browser) await browser.close();
    return false;
  }
}

module.exports = verifyERPLogin;