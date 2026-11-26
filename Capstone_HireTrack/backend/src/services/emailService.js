// Sends emails over SMTP with Nodemailer (replaces Spring JavaMailSender)
const nodemailer = require('nodemailer');
const { smtp, appUrl } = require('../config/env');
const logger = require('../config/logger');
const { escapeHtml: e } = require('../utils/helpers');

const STAGE_LABELS = {
  PROFILING: 'Profiling',
  SCREENING: 'Screening',
  L1_TECHNICAL: 'L1 Technical',
  L2_TECHNICAL: 'L2 Technical',
  HR_ROUND: 'HR Round',
};
const STATUS_LABELS = {
  PROFILING_COMPLETED: 'Profiling Completed',
  IN_PROGRESS: 'In Progress',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
};

const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.port === 465, // 465 = SSL from the start, 587 = STARTTLS
  auth: { user: smtp.user, pass: smtp.pass },
});

// True when .env still has the example values from .env.example
function isConfigured() {
  return Boolean(
    smtp.host &&
    smtp.user &&
    smtp.pass &&
    !smtp.user.startsWith('your-') &&
    !smtp.pass.startsWith('your-'),
  );
}

// Called when the server starts: tells you right away if email will work
async function verifyConnection() {
  if (!isConfigured()) {
    logger.warn('Email is NOT set up: fill in SMTP_HOST, SMTP_USER and SMTP_PASS in backend/.env');
    return false;
  }
  try {
    await transporter.verify();
    logger.info(`Email (SMTP) ready: ${smtp.host}:${smtp.port} as ${smtp.user}`);
    return true;
  } catch (err) {
    logger.error(`Email (SMTP) login failed: ${err.message}. Check the SMTP_* values in .env`);
    return false;
  }
}

// Same look for every email: greeting, title, text, optional button, sign-off, footer
function layout({ name, title, body, buttonText, buttonUrl }) {
  const greeting = `<p style="margin:0 0 16px;font-size:15px">Dear ${name ? e(name) : 'there'},</p>`;
  const button = buttonUrl
    ? `<p style="margin:28px 0"><a href="${buttonUrl}" style="background:#c2561d;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${buttonText}</a></p>
       <p style="font-size:12px;color:#78716c">If the button does not work, copy this link:<br><a href="${buttonUrl}" style="color:#c2561d;word-break:break-all">${buttonUrl}</a></p>`
    : '';
  const signOff = `<p style="margin:24px 0 0;font-size:15px;line-height:1.6">Warm regards,<br><b>HR Team</b><br><span style="color:#78716c">HireTrack</span></p>`;
  return `<!doctype html><html><body style="margin:0;background:#fbf7f1;font-family:Segoe UI,Arial,sans-serif;color:#292524">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #ece3d6">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #ece3d6;font-weight:700;font-size:16px;color:#c2561d">HireTrack</td></tr>
      <tr><td style="padding:28px">
        ${greeting}
        <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917">${title}</h1>
        <div style="font-size:15px;line-height:1.6">${body}</div>
        ${button}
        ${signOff}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #ece3d6;font-size:12px;color:#a8a29e">
        You received this email from HireTrack, the interview process tracking system.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// Plain-text copy of the email (mail apps and spam filters like having one)
function toText(html) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '$2: $1')
    .replace(/<br\s*\/?>|<\/(p|tr|h1|div)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

// A failed email is logged but never breaks the main action (e.g. saving a candidate)
async function sendMail(to, subject, content) {
  const html = layout(content);
  try {
    await transporter.sendMail({ from: smtp.from, to, subject, html, text: toText(html) });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    return false;
  }
}

const when = (date) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });

const detailsBox = (rows) =>
  `<table cellpadding="0" cellspacing="0" style="background:#fbf7f1;border:1px solid #ece3d6;border-radius:8px;padding:14px 18px;margin:8px 0">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#78716c;vertical-align:top">${label}</td><td style="font-weight:600">${value}</td></tr>`,
    )
    .join('')}</table>`;

// "Meeting link" row for the details box (nothing when there is no link)
const meetingRow = (link) =>
  link
    ? [
        [
          'Google Meet',
          `<a href="${e(link)}" style="color:#c2561d;word-break:break-all">${e(link)}</a>`,
        ],
      ]
    : [];

module.exports = {
  isConfigured,
  verifyConnection,

  sendTestEmail: (to) =>
    sendMail(to, 'Test email from HireTrack', {
      title: 'Email is working 🎉',
      body: `<p>If you can read this, the SMTP settings in your <b>.env</b> file are correct.</p>`,
    }),

  // ---------- Candidates ----------
  sendVerification: (to, fullName, token) =>
    sendMail(to, 'Verify your email - HireTrack', {
      name: fullName,
      title: 'Welcome! Please confirm your email',
      body: `<p>Thank you for creating an account with us. We're glad you're interested in joining our team.</p>
             <p>Please confirm your email address to activate your account. The link is valid for 24 hours.</p>`,
      buttonText: 'Verify email',
      buttonUrl: `${appUrl}/api/auth/verify-email?token=${token}`,
    }),

  sendSetPassword: (to, fullName, token) =>
    sendMail(to, 'Your candidate account is ready - HireTrack', {
      name: fullName,
      title: 'Your candidate account is ready',
      body: `<p>Thank you for your interest in joining us. Our HR team has created a candidate profile for you.</p>
             <p>Please choose a password to log in and follow your application. The link is valid for 24 hours.</p>`,
      buttonText: 'Set my password',
      buttonUrl: `${appUrl}/set-password.html?token=${token}`,
    }),

  sendInterviewScheduled: (to, { candidateName, round, scheduledAt, panelNames, meetingLink }) =>
    sendMail(to, `Your ${round} interview is scheduled`, {
      name: candidateName,
      title: `Your ${round} Technical interview is scheduled`,
      body: `<p>Congratulations on reaching the next stage! We look forward to speaking with you.</p>
             ${detailsBox([
               ['Round', `${round} Technical`],
               ['Date &amp; time', `${when(scheduledAt)} (IST)`],
               ['Interview panel', panelNames.map(e).join(', ')],
               ...meetingRow(meetingLink),
             ])}
             <p>${
               meetingLink
                 ? 'Please join the Google Meet a few minutes early, with a working camera and microphone.'
                 : 'Please be ready a few minutes early.'
             } Best of luck!</p>`,
      buttonText: meetingLink ? 'Join Google Meet' : 'View my application',
      buttonUrl: meetingLink ? e(meetingLink) : `${appUrl}/my-status.html`,
    }),

  sendStatusUpdate: (to, { candidateName, stage, status }) => {
    const messages = {
      SELECTED:
        '<p>🎉 <b>Congratulations!</b> We are delighted to let you know that you have been selected. Our HR team will contact you shortly with the next steps.</p>',
      REJECTED:
        '<p>Thank you for the time and effort you put into the interview process. After careful consideration, we will not be moving forward with your application at this time. We wish you every success in your career.</p>',
    };
    return sendMail(to, 'Update on your application', {
      name: candidateName,
      title: 'There is an update on your application',
      body: `${messages[status] || '<p>Good news! Your application has moved forward.</p>'}
             ${detailsBox([
               ['Current stage', STAGE_LABELS[stage] || e(stage)],
               ['Status', STATUS_LABELS[status] || e(status)],
             ])}`,
      buttonText: 'View my application',
      buttonUrl: `${appUrl}/my-status.html`,
    });
  },

  // ---------- Panel members ----------
  // HR activated a panel member: their login email + a temporary password
  sendPanelLogin: (to, fullName, tempPassword) =>
    sendMail(to, 'Welcome to the interview panel - your login details', {
      name: fullName,
      title: 'Welcome to the interview panel',
      body: `<p>Thank you for agreeing to be part of our interview panel. We truly appreciate your time and expertise.</p>
             <p>Use these details to log in and see the candidates assigned to you:</p>
             ${detailsBox([
               ['Login email', e(to)],
               [
                 'Temporary password',
                 `<span style="font-family:Consolas,monospace;font-size:16px;letter-spacing:1px">${e(tempPassword)}</span>`,
               ],
             ])}
             <p>For your security, you will be asked to choose your own password the first time you log in.
             Please do not share this email.</p>`,
      buttonText: 'Log in',
      buttonUrl: `${appUrl}/login.html`,
    }),

  sendPanelAssigned: (to, { panelName, candidateName, round, scheduledAt, meetingLink }) =>
    sendMail(to, `New ${round} interview assigned: ${candidateName}`, {
      name: panelName,
      title: `You have a new ${round} interview`,
      body: `<p>Thank you for helping us find great talent. A new interview has been assigned to you:</p>
             ${detailsBox([
               ['Candidate', e(candidateName)],
               ['Round', `${round} Technical`],
               ['Date &amp; time', `${when(scheduledAt)} (IST)`],
               ...meetingRow(meetingLink),
             ])}
             <p>Please log in to see the candidate's profile, resume, the job description and the focus areas:
             <a href="${appUrl}/panel-dashboard.html" style="color:#c2561d">open my interviews</a>.
             Remember to submit your feedback after the interview.</p>`,
      buttonText: meetingLink ? 'Join Google Meet' : 'Open my interviews',
      buttonUrl: meetingLink ? e(meetingLink) : `${appUrl}/panel-dashboard.html`,
    }),
};
