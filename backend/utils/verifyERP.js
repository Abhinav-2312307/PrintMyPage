const puppeteer = require('puppeteer');

async function verifyERPLogin(rollNumber, password) {
  let browser;
  let executablePath = ''; // Variable to store the path

  try {
    console.log('Launching ERP verification (using puppeteer.executablePath())...');

    // --- Try to find the browser Puppeteer knows about ---
    executablePath = puppeteer.executablePath();
    console.log(`Puppeteer executablePath reports: ${executablePath}`);
    // -----------------------------------------------------

    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath, // Use the path Puppeteer provides
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process' // May help in resource-constrained environments
      ]
    });

    console.log('Browser launched successfully.');
    const page = await browser.newPage();
    // Increase navigation timeout slightly
    await page.goto('https://erp.psit.ac.in/Student/', { timeout: 60000 });

    await page.type('#emailAddress', rollNumber);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    console.log('Login clicked, waiting for dashboard... (Waiting for logout link)');
    const logoutSelector = 'a[href="https://erp.psit.ac.in/Student/Logout"]';
    // Increase waitForSelector timeout slightly
    await page.waitForSelector(logoutSelector, { timeout: 20000 });

    console.log('ERP verification successful: Logout link found.');
    await browser.close();
    return true;

  } catch (error) {
    console.error('ERP verification error:', error.message);
    // Log the path that was attempted if the error involves executable path
    if (error.message.includes('executable') || error.message.includes('Browser was not found')) {
        console.error(`PUPPETEER FAILED - Path attempted: ${executablePath || 'Default path'}`);
    }
    if (browser) {
        try { await browser.close(); } catch (closeError) { /* ignore */ }
    }
    return false;
  }
}

module.exports = verifyERPLogin;