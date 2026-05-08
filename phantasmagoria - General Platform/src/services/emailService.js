// src/services/emailService.js
// Handles all email sending for the platform
// Development mode: all emails are printed to the terminal (100% local, no external services)

require('dotenv').config();

// ─────────────────────────────────────────────
// REAL EMAIL SERVICE (Nodemailer)
// ─────────────────────────────────────────────
const nodemailer = require('nodemailer');

// Set up the transporter (uses Gmail by default, configure via .env)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or 'host: smtp.gmail.com'
  auth: {
    user: process.env.EMAIL_USER, // e.g., your.email@gmail.com
    pass: process.env.EMAIL_PASS  // e.g., 16-character App Password
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates in dev
  }
});

// Helper to actually send the email or fallback to console if not configured
async function dispatchEmail(to, subject, body) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n[WARNING] EMAIL_USER or EMAIL_PASS not set in .env! Falling back to terminal print.');
    console.log('='.repeat(60));
    console.log(`TO:      ${to}\nSUBJECT: ${subject}\n${'-'.repeat(60)}\n${body}\n${'='.repeat(60)}\n`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Phantasmagoria Alumni" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: body
    });
    console.log(`[EmailService] Email sent successfully to ${to} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
  }
}

// ─────────────────────────────────────────────
// SEND VERIFICATION EMAIL
// Called after alumni registers — they must click the link to verify
// ─────────────────────────────────────────────
async function sendVerificationEmail(toEmail, token, clientUrl = null) {
  const baseUrl = process.env.FRONTEND_URL;
  let verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  if (clientUrl && clientUrl !== baseUrl) {
    verifyUrl += `&redirect=${encodeURIComponent(clientUrl)}`;
  }

  await dispatchEmail(
    toEmail,
    'Verify your Phantasmagoria account',
    `Welcome to Phantasmagoria!\n\nClick the link below to verify your email address:\n${verifyUrl}\n\nThis link expires in 1 hour.\nIf you did not register, ignore this email.`
  );
}

// ─────────────────────────────────────────────
// SEND PASSWORD RESET EMAIL
// ─────────────────────────────────────────────
async function sendPasswordResetEmail(toEmail, token, clientUrl = null) {
  const baseUrl = process.env.FRONTEND_URL;
  let resetUrl = `${baseUrl}/api/auth/reset-password?token=${token}`;
  if (clientUrl && clientUrl !== baseUrl) {
    resetUrl += `&redirect=${encodeURIComponent(clientUrl)}`;
  }

  await dispatchEmail(
    toEmail,
    'Reset your Phantasmagoria password',
    `Password Reset Request\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once.\nIf you did not request this, ignore this email.`
  );
}

// ─────────────────────────────────────────────
// SEND WINNER NOTIFICATION
// ─────────────────────────────────────────────
async function sendWinnerNotification(toEmail, firstName, amount) {
  await dispatchEmail(
    toEmail,
    'You are Alumni of the Day!',
    `Congratulations, ${firstName}!

Your bid of £${amount} won today's featured slot.
Your profile is now displayed as Alumni of the Day on the platform.
Students across the university can now see your professional profile.`
  );
}

// ─────────────────────────────────────────────
// SEND LOSER NOTIFICATION
// ─────────────────────────────────────────────
async function sendLoserNotification(toEmail, firstName) {
  await dispatchEmail(
    toEmail,
    "Today's bidding result",
    `Hi ${firstName},\n\nUnfortunately your bid was not the highest today.\nTry again tomorrow — bids reset every day at Midnight.`
  );
}

// ─────────────────────────────────────────────
// SEND OUTBID NOTIFICATION
// Called when someone else takes the #1 spot
// ─────────────────────────────────────────────
async function sendOutbidNotification(toEmail, firstName, targetDate) {
  await dispatchEmail(
    toEmail,
    'Outbid Alert: Your Featured Slot Status',
    `Hi ${firstName},\n\nYour sponsorship bid for the exclusive featured slot on ${targetDate} is no longer the leading one. Someone stepped up with a stronger offer!\n\nDon't lose your chance to be the Alumni of the Day—consider increasing your sponsorship bid before the Midnight cutoff.\n\nGood luck!`
  );
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWinnerNotification,
  sendLoserNotification,
  sendOutbidNotification,
};
