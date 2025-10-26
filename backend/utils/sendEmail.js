const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create a transporter object using Gmail
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Use Gmail service
    auth: {
      user: process.env.EMAIL_USER, // Your email from .env
      pass: process.env.EMAIL_PASS  // Your App Password from .env
    }
  });

  // 2. Define the email options (who to send to, subject, content)
  const mailOptions = {
    from: `PrintMyPage <${process.env.EMAIL_USER}>`, // Sender address
    to: options.email,        // Recipient address (passed in)
    subject: options.subject, // Subject line (passed in)
    html: options.html        // HTML body content (passed in)
  };

  // 3. Actually send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error(`Error sending email to ${options.email}:`, error);
    // Re-throw the error so the calling function knows it failed
    throw error; 
  }
};

module.exports = sendEmail;