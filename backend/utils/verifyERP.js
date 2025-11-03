// backend/utils/verifyERP.js (Version for local execution)
const puppeteer = require('puppeteer');

async function verifyERPLogin(rollNumber, password) {
  let browser;
  try {
    console.log('Launching ERP verification (Local Mode)...');
    // Use default launch options, assuming Chrome is installed locally
    browser = await puppeteer.launch({
      headless: true, // Keep true, or set false for local debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://erp.psit.ac.in/Student/');

    await page.type('#emailAddress', rollNumber);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    console.log('Login clicked, waiting for dashboard... (Waiting for logout link)');
    const logoutSelector = 'a[href="https://erp.psit.ac.in/Student/Logout"]';
    await page.waitForSelector(logoutSelector, { timeout: 15000 }); // Or adjust timeout as needed

    console.log('ERP verification successful: Logout link found.');
    await browser.close();
    return true;

  } catch (error) {
    console.error('ERP verification error (likely bad credentials locally):', error.message);
    if (browser) {
        try { await browser.close(); } catch (closeError) { /* ignore */ }
    }
    return false;
  }
}

module.exports = verifyERPLogin;