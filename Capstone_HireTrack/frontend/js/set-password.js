// Opened from an email link: /set-password.html?token=...  (or ...&reset=1 for "Forgot password")
renderAuthAside();
const form = document.getElementById('passwordForm');
const params = new URLSearchParams(location.search);
const token = params.get('token');
const isReset = params.get('reset') === '1';

if (isReset) {
  document.title = 'Reset password | HireTrack';
  document.getElementById('pageTitle').textContent = 'Reset your password';
  document.getElementById('pageSubtitle').textContent =
    'Choose a new password for your account. This link works once and expires after 1 hour.';
}

if (!token) {
  document.getElementById('missingToken').hidden = false;
  form.querySelector('[type=submit]').disabled = true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const { password, confirm } = Object.fromEntries(new FormData(form));
  if (password !== confirm) {
    showError(
      { message: 'Passwords do not match', details: { confirm: ['Must match the password'] } },
      form,
    );
    return;
  }
  try {
    await withBusy(form.querySelector('[type=submit]'), () =>
      api('/auth/set-password', { method: 'POST', body: { token, password } }),
    );
    document.getElementById('doneIcon').innerHTML = icon('check', 'size-7');
    document.getElementById('formBox').hidden = true;
    document.getElementById('doneBox').hidden = false;
  } catch (err) {
    showError(err, form);
  }
});
