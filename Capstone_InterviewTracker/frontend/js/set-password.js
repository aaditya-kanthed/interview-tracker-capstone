// Opened from the email link: /set-password.html?token=...
renderAuthAside();
const form = document.getElementById('passwordForm');
const token = new URLSearchParams(location.search).get('token');

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
