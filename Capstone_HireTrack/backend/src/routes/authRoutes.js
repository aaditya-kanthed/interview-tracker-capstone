const router = require('express').Router();
const validate = require('../middlewares/validate');
const s = require('../validators/schemas');
const authService = require('../services/authService');
const { googleClientId } = require('../config/env');
const { authenticate } = require('../middlewares/auth');

router.post('/register', validate(s.registerSchema), async (req, res) => {
  const user = await authService.registerCandidate(req.validated);
  res.status(201).json({ ...user, message: 'Check your email to verify your account' });
});

router.post('/login', validate(s.loginSchema), async (req, res) => {
  res.json(await authService.login(req.validated));
});

// "Sign in with Google": the browser sends the token Google gave it
router.post('/google', validate(s.googleLoginSchema), async (req, res) => {
  res.json(await authService.loginWithGoogle(req.validated.credential));
});

// Logged-in user: does my account have a password / must I change it?
router.get('/account', authenticate, async (req, res) => {
  res.json(await authService.getAccount(req.user.id));
});

// Logged-in user changes their password. Returns a fresh login token.
router.post(
  '/change-password',
  authenticate,
  validate(s.changePasswordSchema),
  async (req, res) => {
    res.json(await authService.changePassword(req.user.id, req.validated));
  },
);

// Public settings the login page needs (the Google Client ID is not a secret)
router.get('/config', (_req, res) => {
  res.json({ googleClientId: googleClientId || null });
});

// Opened from the email link
router.get('/verify-email', async (req, res) => {
  await authService.verifyEmail(String(req.query.token || ''));
  res.redirect('/login.html?verified=1');
});

router.post('/set-password', validate(s.setPasswordSchema), async (req, res) => {
  await authService.setPassword(req.validated.token, req.validated.password);
  res.json({ message: 'Password set. You can log in now.' });
});

// "Forgot password?": emails a reset link. Same answer whether or not the email is registered.
router.post('/forgot-password', validate(s.forgotPasswordSchema), async (req, res) => {
  await authService.requestPasswordReset(req.validated.email);
  res.json({
    message: 'If an account exists for this email, we have sent a link to reset the password.',
  });
});

// "Resend verification email" (shown on the login page when the email is not verified yet)
router.post('/resend-verification', validate(s.forgotPasswordSchema), async (req, res) => {
  await authService.resendVerification(req.validated.email);
  res.json({
    message: 'If this account still needs verifying, a new verification link has been sent.',
  });
});

module.exports = router;
