// Reads settings from the .env file (like application.properties in Spring Boot)
require('dotenv').config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// Empty if missing or still the example value from .env.example
function optional(name) {
  const value = (process.env[name] || '').trim();
  return value.startsWith('your-') ? '' : value;
}

module.exports = {
  port: Number(process.env.PORT) || 8080,
  googleClientId: optional('GOOGLE_CLIENT_ID'), // "Sign in with Google" is off when empty
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  appUrl: process.env.APP_URL || 'http://localhost:8080',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'HireTrack <no-reply@example.com>',
  },
};
