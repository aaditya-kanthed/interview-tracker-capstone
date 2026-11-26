// Shared UI pieces: icons, navbar, dark-mode switch, toasts, dialogs, badges.
// Load AFTER api.js.

// ---------- Icons (24x24 outline, stroke = currentColor) ----------
const ICON_PATHS = {
  logo: 'M9 12.75 11.25 15 15 9.75M21 12c0 1.27-.63 2.39-1.6 3.07.21 1.17-.14 2.42-1.04 3.32-.9.9-2.15 1.25-3.32 1.04A3.75 3.75 0 0 1 12 21c-1.27 0-2.39-.63-3.07-1.6-1.17.21-2.42-.14-3.32-1.04-.9-.9-1.25-2.15-1.04-3.32A3.75 3.75 0 0 1 3 12c0-1.27.63-2.39 1.6-3.07-.21-1.17.14-2.42 1.04-3.32.9-.9 2.15-1.25 3.32-1.04A3.75 3.75 0 0 1 12 3c1.27 0 2.39.63 3.07 1.6 1.17-.21 2.42.14 3.32 1.04.9.9 1.25 2.15 1.04 3.32A3.75 3.75 0 0 1 21 12Z',
  briefcase:
    'M20.25 14.15v4.25c0 1.09-.79 2.03-1.87 2.18-2.09.28-4.22.42-6.38.42s-4.29-.14-6.38-.42a2.18 2.18 0 0 1-1.87-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.66V9.1c0-1.07-.77-2-1.83-2.16a48.42 48.42 0 0 0-1.42-.19M20.25 14.15c-.19.16-.41.29-.67.37A48.38 48.38 0 0 1 12 15.75c-2.65 0-5.2-.21-7.69-.62a2.16 2.16 0 0 1-.56-.98M15 6.75V6a3 3 0 0 0-3-3h0a3 3 0 0 0-3 3v.75m6 0a48.67 48.67 0 0 0-6 0',
  users:
    'M15 19.13a9.38 9.38 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 0 1 8.62 21c-2.33 0-4.51-.64-6.37-1.77v-.1a6.38 6.38 0 0 1 11.96-3.08M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z',
  userPlus:
    'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.13a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0ZM3 19.24v-.12a6.38 6.38 0 0 1 12.75 0v.12A12.32 12.32 0 0 1 9.37 21c-2.33 0-4.51-.64-6.37-1.76Z',
  clipboard:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.11c0-1.13-.84-2.09-1.97-2.18a48.42 48.42 0 0 0-1.12-.08m-5.8 0a2.25 2.25 0 0 0-.1.66c0 .41.34.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.66m-5.8 0A2.25 2.25 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.6m-5.8 0c-.38.02-.75.05-1.12.08C9.1 4.02 8.25 4.98 8.25 6.11V8.25m0 0H4.88c-.62 0-1.13.5-1.13 1.13v11.25c0 .62.5 1.12 1.13 1.12h9.75c.62 0 1.12-.5 1.12-1.12V9.38c0-.62-.5-1.13-1.12-1.13H8.25Z',
  logout:
    'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
  video:
    'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
  send: 'M6 12 3.27 3.13A59.77 59.77 0 0 1 21.49 12 59.77 59.77 0 0 1 3.27 20.88L6 12Zm0 0h7.5',
  key: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.03 5.91c-.56-.1-1.16.03-1.57.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.6l6.07-6.06c.4-.4.52-1 .43-1.57a6 6 0 1 1 11.84-1.4Z',
  sun: 'M12 3v2.25m6.36.39-1.59 1.59M21 12h-2.25m-.39 6.36-1.59-1.59M12 18.75V21m-4.77-4.23-1.59 1.59M5.25 12H3m4.23-4.77L5.64 5.64M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
  moon: 'M21.75 15A9.72 9.72 0 0 1 18 15.75c-5.39 0-9.75-4.37-9.75-9.75 0-1.33.27-2.6.75-3.75A9.75 9.75 0 0 0 3 11.25C3 16.63 7.37 21 12.75 21a9.75 9.75 0 0 0 9-6Z',
  mapPin:
    'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM19.5 10.5c0 7.14-7.5 11.25-7.5 11.25S4.5 17.64 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  money:
    'M2.25 18.75a60.07 60.07 0 0 1 15.8 2.1c.73.2 1.45-.34 1.45-1.1v-.9M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.38c0-.62.5-1.12 1.13-1.12H20.25M2.25 6v9m18-10.5v.75c0 .41.34.75.75.75h.75m-1.5-1.5h.38c.62 0 1.12.5 1.12 1.13v9.75c0 .62-.5 1.12-1.12 1.12h-.38m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.38a1.13 1.13 0 0 1-1.12-1.12V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.01v.01H18v-.01Zm-12 0h.01v.01H6v-.01Z',
  check: 'm4.5 12.75 6 6 9-13.5',
  x: 'M6 18 18 6M6 6l12 12',
  search: 'm21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z',
  menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  document:
    'M19.5 14.25v-2.63a3.38 3.38 0 0 0-3.38-3.37h-1.5A1.13 1.13 0 0 1 13.5 7.13v-1.5a3.38 3.38 0 0 0-3.38-3.38H8.25m2.25 0H5.63c-.62 0-1.13.5-1.13 1.13v17.25c0 .62.5 1.12 1.13 1.12h12.75c.62 0 1.12-.5 1.12-1.12V11.25a9 9 0 0 0-9-9Z',
  upload:
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
  arrowRight: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
  plus: 'M12 4.5v15m7.5-7.5h-15',
  pencil:
    'm16.86 4.49 1.69-1.69a1.88 1.88 0 1 1 2.65 2.65L10.58 16.07a4.5 4.5 0 0 1-1.9 1.13L6 18l.8-2.68a4.5 4.5 0 0 1 1.13-1.9l8.93-8.93Zm0 0L19.5 7.13',
  chart:
    'M3 13.13C3 12.5 3.5 12 4.13 12h2.25c.62 0 1.12.5 1.12 1.13v6.75c0 .62-.5 1.12-1.12 1.12H4.13C3.5 21 3 20.5 3 19.88v-6.75ZM9.75 8.63c0-.63.5-1.13 1.13-1.13h2.25c.62 0 1.12.5 1.12 1.13v11.25c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V8.63ZM16.5 4.13c0-.63.5-1.13 1.13-1.13h2.25C20.5 3 21 3.5 21 4.13v15.75c0 .62-.5 1.12-1.12 1.12h-2.25c-.63 0-1.13-.5-1.13-1.12V4.13Z',
  star: 'M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.59 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35l2.13-5.11Z',
  info: 'm11.25 11.25.04-.02a.75.75 0 0 1 1.06.85l-.7 2.84a.75.75 0 0 0 1.06.85l.04-.02M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.01v.01H12V8.25Z',
  warning:
    'M12 9v3.75m-9.3 3.38c-.87 1.5.22 3.37 1.95 3.37h14.71c1.73 0 2.81-1.87 1.95-3.37L13.95 3.38c-.87-1.5-3.03-1.5-3.9 0L2.7 16.13ZM12 15.75h.01v.01H12v-.01Z',
  inbox:
    'M2.25 13.5h3.86a2.25 2.25 0 0 1 2.01 1.24l.27.53a2.25 2.25 0 0 0 2.01 1.24h3.2a2.25 2.25 0 0 0 2.01-1.24l.27-.53a2.25 2.25 0 0 1 2.01-1.24h3.86m-19.5.34V18A2.25 2.25 0 0 0 4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-4.16a2.25 2.25 0 0 0-.1-.66L19.24 5.4a2.25 2.25 0 0 0-2.15-1.59H6.91a2.25 2.25 0 0 0-2.15 1.59L2.35 13.18a2.25 2.25 0 0 0-.1.66Z',
};

function icon(name, cls = 'size-5') {
  return `<svg class="${cls} shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.6" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${ICON_PATHS[name]}"/></svg>`;
}

// ---------- Dark mode slide switch ----------
function themeToggleHtml() {
  return `
    <button type="button" role="switch" aria-label="Dark mode" data-theme-toggle
      class="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full bg-stone-200 transition-colors duration-300
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-brand-600">
      <span class="pointer-events-none grid size-6 translate-x-0.5 place-items-center rounded-full bg-white shadow-md ring-1 ring-black/5
                   transition-transform duration-300 ease-out dark:translate-x-[1.875rem] dark:bg-night-800">
        <span class="text-amber-500 dark:hidden">${icon('sun', 'size-4')}</span>
        <span class="hidden text-brand-200 dark:block">${icon('moon', 'size-4')}</span>
      </span>
    </button>`;
}

function setTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {
    // ignore: storage may be blocked
  }
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-checked', String(dark));
  });
}

// One listener for every switch on the page (header + mobile menu)
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-theme-toggle]')) {
    setTheme(!document.documentElement.classList.contains('dark'));
  }
});

function syncThemeSwitches() {
  const dark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-checked', String(dark));
  });
}

// ---------- Navigation bar ----------
const NAV_FOR_ROLE = {
  HR: [
    ['hr-dashboard.html', 'Dashboard', 'chart'],
    ['apply.html', 'Add candidate', 'userPlus'],
    ['hr-jobs.html', 'Jobs', 'briefcase'],
    ['hr-panels.html', 'Panels', 'users'],
  ],
  PANEL: [['panel-dashboard.html', 'My interviews', 'clipboard']],
  CANDIDATE: [
    ['my-status.html', 'My application', 'clipboard'],
    ['index.html', 'Open jobs', 'briefcase'],
  ],
  PUBLIC: [['index.html', 'Open jobs', 'briefcase']],
};

function brandHtml() {
  return `<a href="index.html" class="flex items-center gap-2 font-bold text-stone-900 dark:text-white">
      <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">${icon('logo', 'size-5')}</span>
      <span class="text-lg">Hire<span class="text-brand-600 dark:text-brand-400">Track</span></span>
    </a>`;
}

function renderNavbar() {
  const user = getUser();
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_FOR_ROLE[user?.role] || NAV_FOR_ROLE.PUBLIC;
  const linkHtml = links
    .map(
      ([href, label, ic]) =>
        `<a href="${href}" class="nav-link ${href === page ? 'active' : ''}">${icon(ic, 'size-4')}${label}</a>`,
    )
    .join('');

  const account = user
    ? `<div class="flex items-center gap-3">
         <span class="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">${esc(initials(user.fullName))}</span>
         <div class="hidden leading-tight lg:block">
           <div class="text-sm font-semibold">${esc(user.fullName)}</div>
           <div class="text-xs text-stone-500 dark:text-stone-400">${user.role === 'HR' ? 'HR' : user.role === 'PANEL' ? 'Panel member' : 'Candidate'}</div>
         </div>
         <a href="change-password.html" class="btn btn-ghost btn-sm" title="Change password">${icon('key', 'size-4')}<span class="sr-only">Change password</span></a>
         <button type="button" class="btn btn-ghost btn-sm" data-logout title="Log out">${icon('logout', 'size-4')}<span class="sm:hidden lg:inline">Logout</span></button>
       </div>`
    : `<div class="flex items-center gap-2">
         <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
         <a href="register.html" class="btn btn-primary btn-sm">Sign up</a>
       </div>`;

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<header class="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-md dark:border-night-600 dark:bg-night-900/80">
       <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
         <div class="flex items-center gap-6">
           ${brandHtml()}
           <nav class="hidden items-center gap-1 md:flex">${linkHtml}</nav>
         </div>
         <div class="hidden items-center gap-4 sm:flex">${themeToggleHtml()} ${account}</div>
         <button type="button" class="btn btn-ghost p-2 sm:hidden" data-menu-button aria-label="Open menu" aria-expanded="false">${icon('menu', 'size-6')}</button>
       </div>
       <div class="hidden border-t border-stone-200 px-4 pb-4 sm:hidden dark:border-night-600" data-mobile-menu>
         <nav class="flex flex-col gap-1 pt-3">${linkHtml}</nav>
         <div class="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 dark:border-night-600">
           <span class="flex items-center gap-3 text-sm font-medium">Dark mode ${themeToggleHtml()}</span>
           ${user ? `<span class="flex gap-1"><a href="change-password.html" class="btn btn-ghost btn-sm">${icon('key', 'size-4')} Password</a><button type="button" class="btn btn-ghost btn-sm" data-logout>${icon('logout', 'size-4')} Logout</button></span>` : '<a href="login.html" class="btn btn-primary btn-sm">Log in</a>'}
         </div>
       </div>
     </header>`,
  );

  document.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', logout));
  const menuButton = document.querySelector('[data-menu-button]');
  menuButton.addEventListener('click', () => {
    const menu = document.querySelector('[data-mobile-menu]');
    menu.classList.toggle('hidden');
    menuButton.setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
  });
  syncThemeSwitches();
}

// Big title at the top of a page
function pageHeader(title, subtitle = '', actionsHtml = '') {
  return `<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-white">${title}</h1>
        ${subtitle ? `<p class="mt-1 text-stone-500 dark:text-stone-400">${subtitle}</p>` : ''}
      </div>
      ${actionsHtml ? `<div class="flex gap-2">${actionsHtml}</div>` : ''}
    </div>`;
}

// ---------- Toast notifications ----------
function toast(message, type = 'success') {
  let box = document.getElementById('toasts');
  if (!box) {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="toasts" class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-live="polite"></div>',
    );
    box = document.getElementById('toasts');
  }
  const styles = {
    success: ['text-emerald-500', 'check'],
    error: ['text-rose-500', 'warning'],
    info: ['text-amber-500', 'info'],
  }[type];
  const el = document.createElement('div');
  el.className =
    'pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-sm shadow-lg dark:border-night-500 dark:bg-night-700';
  el.innerHTML = `<span class="${styles[0]}">${icon(styles[1])}</span><p class="flex-1 font-medium">${esc(message)}</p>`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// Shows a server error: the message as a toast, plus field errors under each input
function showError(err, form) {
  if (form) clearFieldErrors(form);
  const details = err.details || {};
  const unmatched = [];
  for (const [field, messages] of Object.entries(details)) {
    const input = form?.querySelector(`[name="${field}"]`);
    if (input) {
      input.classList.add('!border-rose-500');
      input.insertAdjacentHTML(
        'afterend',
        `<p class="field-error mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">${esc(messages.join(', '))}</p>`,
      );
    } else {
      unmatched.push(`${field}: ${messages.join(', ')}`);
    }
  }
  toast([err.message, ...unmatched].join(' · '), 'error');
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((e) => e.remove());
  form
    .querySelectorAll('.\\!border-rose-500')
    .forEach((e) => e.classList.remove('!border-rose-500'));
}

// Puts a spinner in a button while a request is running
async function withBusy(button, task) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"></span> Please wait`;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

// ---------- Dialog (replaces prompt / confirm) ----------
// Returns the form values as an object, or null if cancelled.
function openDialog({
  title,
  message = '',
  fieldsHtml = '',
  confirmText = 'Confirm',
  danger = false,
}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center';
    wrap.innerHTML = `
      <div class="absolute inset-0 animate-fade-in bg-stone-900/50 backdrop-blur-sm" data-close></div>
      <form class="card relative w-full max-w-md animate-toast-in" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
        <h2 id="dialogTitle" class="text-lg font-semibold text-stone-900 dark:text-white">${title}</h2>
        ${message ? `<p class="mt-2 text-sm text-stone-500 dark:text-stone-400">${message}</p>` : ''}
        <div class="mt-4 space-y-4">${fieldsHtml}</div>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${confirmText}</button>
        </div>
      </form>`;
    const close = (value) => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => e.key === 'Escape' && close(null);
    wrap.addEventListener('click', (e) => e.target.closest('[data-close]') && close(null));
    wrap.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      close(Object.fromEntries(new FormData(e.target)));
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    (wrap.querySelector('textarea, input, select') || wrap.querySelector('[type=submit]')).focus();
  });
}

// ---------- Small building blocks ----------
function statusBadge(status) {
  const color = {
    PROFILING_COMPLETED: 'badge-gray',
    IN_PROGRESS: 'badge-blue',
    SELECTED: 'badge-green',
    REJECTED: 'badge-red',
  }[status];
  return `<span class="badge ${color}">${STATUS_LABELS[status] || status}</span>`;
}

function stageBadge(stage) {
  return `<span class="badge badge-brand">${STAGE_LABELS[stage]}</span>`;
}

function resultBadge(result) {
  return result === 'SELECTED'
    ? `<span class="badge badge-green">${icon('check', 'size-3.5')} Selected</span>`
    : `<span class="badge badge-red">${icon('x', 'size-3.5')} Rejected</span>`;
}

// "Join Google Meet" button. Only https links are shown (the server also checks this).
function meetButton(link, extraClass = '') {
  if (!link || !/^https:\/\//i.test(link)) return '';
  return `<a href="${esc(link)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm ${extraClass}">${icon('video', 'size-4')} Join Google Meet</a>`;
}

function avatar(name, size = 'size-10 text-sm') {
  return `<span class="grid ${size} shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">${esc(initials(name))}</span>`;
}

function stars(rating) {
  return `<span class="inline-flex text-amber-400" title="${rating} out of 5">${[1, 2, 3, 4, 5]
    .map((n) =>
      icon('star', `size-4 ${n <= rating ? 'fill-current' : 'text-stone-300 dark:text-stone-600'}`),
    )
    .join('')}</span>`;
}

function emptyState(iconName, title, text = '', actionHtml = '') {
  return `<div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 px-6 py-14 text-center dark:border-night-600">
      <span class="grid size-12 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-night-700">${icon(iconName, 'size-6')}</span>
      <h3 class="mt-4 font-semibold text-stone-900 dark:text-white">${title}</h3>
      ${text ? `<p class="muted mt-1 max-w-sm">${text}</p>` : ''}
      ${actionHtml ? `<div class="mt-5">${actionHtml}</div>` : ''}
    </div>`;
}

function skeleton(lines = 3) {
  return `<div class="card animate-pulse space-y-3">${Array.from(
    { length: lines },
    (_, i) =>
      `<div class="h-4 rounded bg-stone-200 dark:bg-night-700" style="width:${90 - i * 15}%"></div>`,
  ).join('')}</div>`;
}

// Horizontal progress through the interview stages
// Interview pipeline: one track behind the circles, filled up to the current stage.
// 5 equal columns, so circle centres sit at 10%, 30%, 50%, 70% and 90% of the width.
function stageStepper(stage, status) {
  const current = STAGES.indexOf(stage);
  const last = STAGES.length - 1;
  const finished = status === 'SELECTED';
  const rejected = status === 'REJECTED';
  const filledSteps = finished ? last : current;
  const fillPercent = (filledSteps / last) * 80; // track runs from 10% to 90%
  const fillColor = rejected ? 'bg-rose-400' : 'bg-emerald-500';

  const steps = STAGES.map((s, i) => {
    const done = i < current || (finished && i === current);
    const rejectedHere = rejected && i === current;
    const active = i === current && !done && !rejectedHere;
    const base =
      'relative z-10 grid size-9 place-items-center rounded-full text-sm font-bold transition';
    const dot = rejectedHere
      ? `<span class="${base} bg-rose-600 text-white ring-4 ring-rose-500/20">${icon('x', 'size-4')}</span>`
      : done
        ? `<span class="${base} bg-emerald-500 text-white">${icon('check', 'size-4')}</span>`
        : active
          ? `<span class="${base} bg-brand-600 text-white ring-4 ring-brand-500/25 shadow-md shadow-brand-500/30">${i + 1}</span>`
          : `<span class="${base} border-2 border-stone-200 bg-white text-stone-400 dark:border-night-500 dark:bg-night-800">${i + 1}</span>`;
    const labelColor =
      active || rejectedHere
        ? 'font-semibold text-stone-900 dark:text-white'
        : done
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-stone-400 dark:text-stone-500';
    const note = active ? 'Current' : rejectedHere ? 'Stopped here' : done ? 'Done' : '';
    return `<li class="flex flex-col items-center gap-2 px-1 text-center">${dot}
        <span class="text-[11px] leading-tight sm:text-xs ${labelColor}">${STAGE_LABELS[s]}</span>
        <span class="h-3 text-[10px] uppercase tracking-wide text-stone-400 dark:text-stone-500">${note}</span></li>`;
  }).join('');

  return `<div class="relative" role="group" aria-label="Interview pipeline: ${STAGE_LABELS[stage]}, ${STATUS_LABELS[status] || ''}">
      <div class="absolute top-[1.0625rem] right-[10%] left-[10%] h-1 rounded-full bg-stone-200 dark:bg-night-700"></div>
      <div class="absolute top-[1.0625rem] left-[10%] h-1 rounded-full ${fillColor} transition-all duration-700" style="width:${fillPercent}%"></div>
      <ol class="relative grid grid-cols-5">${steps}</ol>
    </div>`;
}

// Left side of the login / register / set-password pages
function renderAuthAside() {
  const points = [
    ['clipboard', 'Track every round', 'See your stage and interview schedule at any time.'],
    ['calendar', 'Never miss an interview', 'Get an email as soon as an interview is booked.'],
    ['users', 'Built for teams', 'HR, interview panels and candidates work in one place.'],
  ];
  document.getElementById('authAside').innerHTML = `
    <div class="hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between dark:bg-brand-900">
      <a href="index.html" class="flex items-center gap-2 text-lg font-bold">
        <span class="grid size-9 place-items-center rounded-xl bg-white/15">${icon('logo')}</span> HireTrack
      </a>
      <div>
        <h2 class="text-3xl leading-tight font-bold">From application to offer, all in one place.</h2>
        <ul class="mt-8 space-y-5">${points
          .map(
            ([ic, title, text]) => `<li class="flex gap-4">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">${icon(ic)}</span>
              <div><p class="font-semibold">${title}</p><p class="text-sm text-brand-100">${text}</p></div></li>`,
          )
          .join('')}</ul>
      </div>
      <p class="text-sm text-brand-200">Interview Process Tracking System</p>
    </div>`;
  document.getElementById('authTop').innerHTML = `
    <div class="flex items-center justify-between">
      <span class="lg:invisible">${brandHtml()}</span>
      ${themeToggleHtml()}
    </div>`;
  syncThemeSwitches();
}

// ---------- "Continue with Google" button (login + register pages) ----------
// Shows nothing if GOOGLE_CLIENT_ID is not set on the server.
// onLogin(result) is called after our backend accepts the Google sign-in.
async function renderGoogleButton(onLogin) {
  const box = document.getElementById('googleBox');
  let clientId;
  try {
    ({ googleClientId: clientId } = await api('/auth/config'));
  } catch {
    return; // server unreachable: keep the normal form only
  }
  if (!clientId) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  }).catch(() => toast('Could not load Google sign-in. Check your internet connection.', 'error'));
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      try {
        onLogin(await api('/auth/google', { method: 'POST', body: { credential } }));
      } catch (err) {
        showError(err);
      }
    },
  });
  const target = document.getElementById('googleBtn');
  window.google.accounts.id.renderButton(target, {
    theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: Math.min(target.offsetWidth || 400, 400),
  });
  box.hidden = false;
}

// Footer shared by all pages
function renderFooter() {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<footer class="mt-16 border-t border-stone-200 py-6 text-center text-xs text-stone-500 dark:border-night-600 dark:text-stone-500">
       HireTrack &middot; Interview Process Tracking System
     </footer>`,
  );
}
