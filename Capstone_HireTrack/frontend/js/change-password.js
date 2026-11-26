// Change my password. Also the forced first step after logging in with a temporary password.
const user = requireRole('HR', 'PANEL', 'CANDIDATE');
const form = document.getElementById('passwordForm');
const firstLogin = Boolean(user.mustChangePassword);

renderNavbar();
renderFooter();
document.getElementById('firstLoginNote').hidden = !firstLogin;
if (firstLogin)
  document.getElementById('currentLabel').textContent = 'Temporary password (from your email)';

// Accounts created with Google may not have a password yet: no "current password" needed
api('/auth/account')
  .then(({ hasPassword }) => {
    if (!hasPassword) {
      document.getElementById('currentBox').hidden = true;
      form.currentPassword.required = false;
    }
  })
  .catch(showError);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const { currentPassword, newPassword, confirm } = Object.fromEntries(new FormData(form));
  if (newPassword !== confirm) {
    showError(
      { message: 'Passwords do not match', details: { confirm: ['Must match the new password'] } },
      form,
    );
    return;
  }
  try {
    const result = await withBusy(form.querySelector('[type=submit]'), () =>
      api('/auth/change-password', {
        method: 'POST',
        body: currentPassword ? { currentPassword, newPassword } : { newPassword },
      }),
    );
    saveLogin(result); // new token without the "must change password" mark
    toast('Password changed');
    setTimeout(() => {
      window.location.href = HOME_FOR_ROLE[result.user.role];
    }, 900);
  } catch (err) {
    showError(err, form);
  }
});
