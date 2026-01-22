const nodemailer = require('nodemailer');

console.log('📧 Initializing Gmail email service...');
console.log('Using account:', process.env.MAIL_USERNAME);

// Create transporter with explicit Gmail settings (matches working test-gmail.js config)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Test connection
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ SMTP Error:', error.message);
  } else {
    console.log('✅ SMTP Ready. From:', process.env.MAIL_FROM_ADDRESS);
  }
});

const emailService = {
  async sendPasswordResetEmail(email, token, name) {
    try {
      console.log(`\n📧 === EMAIL SERVICE CALLED ===`);
      console.log(`To: ${email}`);
      console.log(`Name: ${name}`);
      console.log(`Token: ${token.substring(0, 15)}...`);
      console.log(`From: ${process.env.MAIL_FROM_ADDRESS}`);
      console.log(`From Name: ${process.env.MAIL_FROM_NAME}`);
      
      // Create reset link
      const resetLink = `${process.env.CLIENT_URL}/admin/reset-password/${token}`;
      console.log(`🔗 Reset Link: ${resetLink}`);
      
      // Email content
      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Password Reset Request - MOHAIS Admin',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">MOHAIS Admin Panel</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>You have requested to reset your password for the MOHAIS Admin Panel.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <div style="background: #eee; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all;">
                ${resetLink}
              </div>
              <p style="color: #e74c3c; font-weight: bold; margin-top: 20px;">
                ⚠️ This link expires in 1 hour.
              </p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                MOHAIS Day Manager<br>
                Automated message - Do not reply
              </p>
            </div>
          </div>
        `,
        text: `Password Reset Request - MOHAIS Admin\n\nHello ${name},\n\nClick to reset password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nMOHAIS Day Manager`
      };

      console.log('📤 Sending email...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅✅✅ EMAIL SENT SUCCESSFULLY!');
      console.log('📧 Message ID:', info.messageId);
      console.log('✅ Email sent at:', new Date().toLocaleTimeString());
      
      return info;
      
    } catch (error) {
      console.error('❌ EMAIL FAILED:');
      console.error('Error:', error.message);
      console.error('Error code:', error.code);
      throw error;
    }
  },

  async sendPasswordChangedEmail(email, name) {
    try {
      console.log(`\n📧 === SENDING PASSWORD CHANGED CONFIRMATION ===`);
      console.log(`To: ${email}`);
      console.log(`Name: ${name}`);

      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Password Changed Successfully - MOHAIS Admin',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">MOHAIS Admin Panel</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
              <h2 style="color: #333;">Password Changed Successfully</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your password for the MOHAIS Admin Panel has been successfully changed.</p>
              <p style="color: #e74c3c; font-weight: bold; margin-top: 20px;">
                ⚠️ If you did not make this change, please contact your administrator immediately.
              </p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">
                MOHAIS Day Manager<br>
                Automated message - Do not reply
              </p>
            </div>
          </div>
        `,
        text: `Password Changed Successfully - MOHAIS Admin\n\nHello ${name},\n\nYour password has been successfully changed.\n\nIf you did not make this change, please contact your administrator immediately.\n\nMOHAIS Day Manager`
      };

      console.log('📤 Sending confirmation email...');
      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Password changed confirmation email sent!');
      console.log('📧 Message ID:', info.messageId);

      return info;

    } catch (error) {
      console.error('❌ PASSWORD CHANGED EMAIL FAILED:');
      console.error('Error:', error.message);
      throw error;
    }
  }
};

module.exports = emailService;