// Candidate sign-up with a simple password strength meter
renderAuthAside();
const form = document.getElementById('registerForm');
const password = document.getElementById('password');

password.addEventListener('input', () => {
  const value = password.value;
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];
  document.querySelectorAll('#strengthBars span').forEach((bar, i) => {
    bar.className = `h-1 rounded ${i < score ? colors[score - 1] : 'bg-stone-200 dark:bg-night-700'}`;
  });
  document.getElementById('strengthText').textContent = value
    ? ['Weak', 'Fair', 'Good', 'Strong'][Math.max(score - 1, 0)] + ' password'
    : 'At least 8 characters.';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  try {
    // The new account is logged in straight away (no verification email)
    const result = await withBusy(form.querySelector('[type=submit]'), () =>
      api('/auth/register', { method: 'POST', body: data }),
    );
    goHome(result);
  } catch (err) {
    showError(err, form);
  }
});

function goHome(result) {
  saveLogin(result);
  window.location.href = HOME_FOR_ROLE[result.user.role];
}

// Google sign-up works the same way
renderGoogleButton(goHome);
