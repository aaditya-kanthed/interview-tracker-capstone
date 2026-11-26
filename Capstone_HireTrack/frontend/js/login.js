// Login page: sends email + password, saves the token, goes to the right dashboard
renderAuthAside();
const params = new URLSearchParams(location.search);
const form = document.getElementById('loginForm');
document.getElementById('verifiedNote').hidden = params.get('verified') !== '1';

// Only go back to a page on THIS site (stops "open redirect" tricks)
function safeNext() {
  const next = params.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

document.getElementById('showPassword').addEventListener('click', (e) => {
  const input = document.getElementById('password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  e.target.textContent = show ? 'Hide' : 'Show';
});

function goToDashboard(result) {
  saveLogin(result);
  // Temporary password from HR's email: choose a new one first
  if (result.user.mustChangePassword) {
    window.location.href = 'change-password.html';
    return;
  }
  window.location.href = safeNext() || HOME_FOR_ROLE[result.user.role];
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('[type=submit]');
  try {
    goToDashboard(
      await withBusy(button, () =>
        api('/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(form)) }),
      ),
    );
  } catch (err) {
    showError(err, form);
  }
});

renderGoogleButton(goToDashboard);
