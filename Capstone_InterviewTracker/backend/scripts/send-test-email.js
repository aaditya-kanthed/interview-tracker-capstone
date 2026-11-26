// Sends one test email using the SMTP settings in .env
// Usage:  npm run email:test -- you@example.com
/* eslint-disable no-console -- a command-line tool, so printing is fine here */
const emailService = require('../src/services/emailService');

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.log('Usage: npm run email:test -- you@example.com');
    process.exitCode = 1;
    return;
  }

  if (!(await emailService.verifyConnection())) {
    console.log('\n✖ Could not connect to the email server. See the message above.');
    console.log('  Common fixes: use a Gmail App Password (not your normal password),');
    console.log('  check SMTP_HOST / SMTP_PORT, and restart after editing .env.');
    process.exitCode = 1;
    return;
  }

  const sent = await emailService.sendTestEmail(to);
  console.log(
    sent
      ? `\n✔ Test email sent to ${to}. Check the inbox (and spam folder).`
      : '\n✖ Sending failed. See the error above.',
  );
  process.exitCode = sent ? 0 : 1;
}

main();
