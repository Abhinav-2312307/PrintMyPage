const puppeteer = require('puppeteer');

async function verifyERPLogin(rollNumber, password) {
  let browser;
  // Define the expected path based on standard Puppeteer cache and Render's setup
  // Note: The exact revision might change slightly over time, but the structure is usually similar.
  // We determined the '141.0.7390.122' part from your previous logs.
  // If builds fail later, check the build logs again for the installed path.
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/render/.cache/puppeteer/chrome/linux-141.0.7390.122/chrome-linux64/chrome';

  try {
    console.log('Launching ERP verification...');
    console.log(`Attempting to use Chrome executable path: ${chromePath}`);

    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath, // Explicitly point to the installed Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Often needed in limited environments
        '--disable-accelerated-2d-canvas',
        '--disable-gpu' // Often needed in headless environments
      ]
    });

    console.log('Browser launched successfully.');
    const page = await browser.newPage();
    await page.goto('https://erp.psit.ac.in/Student/');

    await page.type('#emailAddress', rollNumber);
    await page.type('#password', password);
    await page.click('button[type="submit"]');

    console.log('Login clicked, waiting for dashboard... (Waiting for logout link)');
    const logoutSelector = 'a[href="https://erp.psit.ac.in/Student/Logout"]';
    await page.waitForSelector(logoutSelector, { timeout: 15000 });

    console.log('ERP verification successful: Logout link found.');
    await browser.close();
    return true;

  } catch (error) {
    console.error('ERP verification error:', error.message);
    // If the error message still mentions "Browser was not found", log the path again
    if (error.message.includes('Browser was not found')) {
        console.error(`PUPPETEER FAILED TO FIND BROWSER AT: ${chromePath}`);
    }
    if (browser) {
        try { await browser.close(); } catch (closeError) { console.error('Error closing browser after failure:', closeError); }
    }
    return false;
  }
}

module.exports = verifyERPLogin;