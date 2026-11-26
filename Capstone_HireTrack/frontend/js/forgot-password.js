// "Forgot password?": asks the server to email a reset link.
// The page shows the same message whether or not the email is registered.
renderAuthAside();
const form = document.getElementById('forgotForm');

// Fill in the email if it was typed on the login page (login.html?email=...)
const typed = new URLSearchParams(location.search).get('email');
if (typed) form.email.value = typed;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const { email } = Object.fromEntries(new FormData(form));
  try {
    await withBusy(form.querySelector('[type=submit]'), () =>
      api('/auth/forgot-password', { method: 'POST', body: { email } }),
    );
    document.getElementById('sentTo').textContent = email;
    document.getElementById('doneIcon').innerHTML = icon('check', 'size-7');
    document.getElementById('formBox').hidden = true;
    document.getElementById('doneBox').hidden = false;
  } catch (err) {
    showError(err, form);
  }
});
