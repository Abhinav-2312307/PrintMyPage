const Brevo = require('@getbrevo/brevo');

// Configure the API client
const defaultClient = Brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY; // Your API key from .env

const apiInstance = new Brevo.TransactionalEmailsApi();

const sendEmail = async (options) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email

  sendSmtpEmail.subject = options.subject;
  sendSmtpEmail.htmlContent = options.html;
  sendSmtpEmail.sender = { name: "PrintMyPage", email: process.env.EMAIL_USER }; // Must be a verified sender
  sendSmtpEmail.to = [{ email: options.email }]; // Recipient

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully via Brevo to ${options.email}`);
  } catch (error) {
    console.error(`Error sending Brevo email to ${options.email}:`, error.response?.text || error.message); // Log Brevo's specific error if available
    throw error; // Re-throw
  }
};

module.exports = sendEmail;