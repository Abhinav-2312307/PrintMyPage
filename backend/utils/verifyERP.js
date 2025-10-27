const puppeteer = require('puppeteer');
const path = require('path'); // Keep path for potential future screenshotting

async function verifyERPLogin(rollNumber, password) {
  let browser;
  try {
    console.log('Launching ERP verification (Relying on default Puppeteer browser)...');

    // --- ✨ REMOVED executablePath OPTION ✨ ---
    // const chromePath = '/opt/render/.cache/puppeteer/...'; // No longer needed
    // console.log(`Using Chrome executable path: ${chromePath}`);

    browser = await puppeteer.launch({
        headless: true,
        // executablePath: chromePath, // REMOVED THIS LINE
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    // ------------------------------------

    const page = await browser.newPage();
    await page.goto('https://erp.psit.ac.in/Student/');

    await page.type('#emailAddress', rollNumber);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    // Wait for the logout link to appear, indicating successful login
    console.log('Login clicked, waiting for dashboard... (Waiting for logout link)');
    const logoutSelector = 'a[href="https://erp.psit.ac.in/Student/Logout"]';
    await page.waitForSelector(logoutSelector, { timeout: 15000 }); // Increased timeout slightly just in case

    console.log('ERP verification successful: Logout link found.');
    await browser.close();
    return true;

  } catch (error) {
    // Timeout usually means login failed (logout link never appeared)
    console.error('ERP verification error (likely bad credentials or page structure change):', error.message);
    // Attempt to close browser if it exists, even on error
    if (browser) {
        try { await browser.close(); } catch (closeError) { console.error('Error closing browser after failure:', closeError); }
    }
    return false;
  }
}

module.exports = verifyERPLogin;