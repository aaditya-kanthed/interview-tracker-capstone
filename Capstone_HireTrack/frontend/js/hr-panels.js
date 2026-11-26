// HR: create panel members and send them their login details
// (login email + a temporary password by email; they choose their own password on first login)
requireRole('HR');
renderNavbar();
renderFooter();
const form = document.getElementById('panelForm');

document.getElementById('header').innerHTML = pageHeader(
  'Interview panel',
  'People who conduct L1 and L2 technical interviews.',
);

function panelRow(p) {
  let status;
  if (!p.isActive) {
    status = `<button class="btn btn-primary btn-sm" data-id="${p.id}" data-name="${esc(p.fullName)}" data-resend="0">${icon('send', 'size-4')} Activate &amp; email login</button>`;
  } else {
    const badge = p.mustChangePassword
      ? '<span class="badge badge-amber" title="Has not logged in and changed the temporary password yet">Login pending</span>'
      : `<span class="badge badge-green">${icon('check', 'size-3.5')} Active</span>`;
    status = `<div class="flex flex-wrap items-center gap-2">${badge}
      <button class="btn btn-secondary btn-sm" data-id="${p.id}" data-name="${esc(p.fullName)}" data-resend="1">Resend login</button></div>`;
  }
  return `<li class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
      ${avatar(p.fullName)}
      <div class="min-w-0 flex-1">
        <p class="font-semibold text-stone-900 dark:text-white">${esc(p.fullName)}</p>
        <p class="muted">${esc(p.designation)} &middot; ${esc(p.organization)}</p>
        <p class="truncate text-xs text-stone-500 dark:text-stone-400">${esc(p.email)} &middot; ${esc(p.mobileCode)} ${esc(p.mobile)}</p>
      </div>
      <div>${status}</div>
    </li>`;
}

async function loadPanels() {
  const panels = await api('/panels');
  document.getElementById('count').textContent =
    `${panels.filter((p) => p.isActive).length} active of ${panels.length}`;
  document.getElementById('panels').innerHTML = panels.length
    ? panels.map(panelRow).join('')
    : `<li class="p-6">${emptyState('users', 'No panel members yet', 'Add the first interviewer using the form.')}</li>`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  try {
    await withBusy(form.querySelector('[type=submit]'), () =>
      api('/panels', { method: 'POST', body: Object.fromEntries(new FormData(form)) }),
    );
    clearFieldErrors(form);
    form.reset();
    toast('Panel member added. Click "Activate & email login" to send their login details.');
    loadPanels();
  } catch (err) {
    showError(err, form);
  }
});

document.getElementById('panels').addEventListener('click', async (e) => {
  const button = e.target.closest('[data-id]');
  if (!button) return;
  const { id, name, resend } = button.dataset;

  if (resend === '1') {
    const ok = await openDialog({
      title: `Send new login details to ${esc(name)}?`,
      message:
        'A new temporary password will be emailed to them. Their current password will stop working.',
      confirmText: 'Send new login',
    });
    if (!ok) return;
  }

  try {
    const result = await withBusy(button, () => api(`/panels/${id}/activate`, { method: 'POST' }));
    if (result.emailSent) {
      toast(`Login details emailed to ${name}.`);
    } else {
      toast(
        `${name} is active, but the email could not be sent. Check the email settings, then click "Resend login".`,
        'error',
      );
    }
    loadPanels();
  } catch (err) {
    showError(err);
  }
});

document.getElementById('panels').innerHTML = `<li class="p-6">${skeleton(3)}</li>`;
loadPanels().catch(showError);
