// Use the specific classes directly from the package
const SibApiV3Sdk = require('@getbrevo/brevo');

// Create an API client instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Configure API key authentication
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY; // Your API key from .env/Render env vars

const sendEmail = async (options) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); // Create email object

  sendSmtpEmail.subject = options.subject;
  sendSmtpEmail.htmlContent = options.html;
  sendSmtpEmail.sender = { name: "PrintMyPage", email: process.env.EMAIL_USER }; // Must be a verified sender
  sendSmtpEmail.to = [{ email: options.email }]; // Recipient

  try {
    // Send the email using the configured apiInstance
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully via Brevo to ${options.email}`);
  } catch (error) {
    console.error(`Error sending Brevo email to ${options.email}:`, error.response?.text || error.message);
    throw error; // Re-throw
  }
};

module.exports = sendEmail;