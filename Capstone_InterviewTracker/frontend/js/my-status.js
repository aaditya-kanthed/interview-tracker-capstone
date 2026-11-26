// Candidate view: current stage, status and L1/L2 schedule. Panel feedback is never shown.
const user = requireRole('CANDIDATE');
renderNavbar();
renderFooter();
const content = document.getElementById('content');

const STATUS_MESSAGE = {
  PROFILING_COMPLETED: ['info', 'Thanks for applying! Our HR team will review your profile soon.'],
  IN_PROGRESS: ['info', 'Your application is moving forward. Check your interview schedule below.'],
  SELECTED: [
    'success',
    'Congratulations! You have been selected. HR will contact you with next steps.',
  ],
  REJECTED: [
    'error',
    'Thank you for your time. We will not be moving forward with your application.',
  ],
};

function statusBanner(status) {
  const [type, text] = STATUS_MESSAGE[status];
  const style = {
    info: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    error:
      'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  }[type];
  const ic = { info: 'info', success: 'check', error: 'info' }[type];
  return `<div class="flex items-start gap-3 rounded-xl border p-4 text-sm font-medium ${style}">${icon(ic)}<p>${text}</p></div>`;
}

function interviewCard(i) {
  const upcoming = new Date(i.scheduledAt) > new Date();
  const panel = i.panels.map((p) => esc(p.panel.fullName)).join(', ');
  return `<div class="flex gap-4 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
      <div class="grid w-16 shrink-0 place-items-center rounded-lg bg-brand-50 py-2 text-center dark:bg-brand-500/10">
        <span class="text-xs font-semibold text-brand-600 uppercase dark:text-brand-300">${new Date(i.scheduledAt).toLocaleString('en-IN', { month: 'short' })}</span>
        <span class="text-2xl font-bold text-stone-900 dark:text-white">${new Date(i.scheduledAt).getDate()}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h4 class="font-semibold text-stone-900 dark:text-white">${i.round === 'L1' ? 'L1 Technical' : 'L2 Technical'} interview</h4>
          ${upcoming ? '<span class="badge badge-blue">Upcoming</span>' : '<span class="badge badge-gray">Completed</span>'}
        </div>
        <p class="muted mt-1 flex items-center gap-1">${icon('clock', 'size-4')} ${formatDate(i.scheduledAt)}</p>
        <p class="muted mt-1 flex items-center gap-1">${icon('users', 'size-4')} Panel: ${panel}</p>
        ${upcoming && i.meetingLink ? `<div class="mt-3">${meetButton(i.meetingLink)}</div>` : ''}
      </div>
    </div>`;
}

function render(c) {
  const u = c.user;
  content.innerHTML = `
    ${pageHeader(`Hi ${esc(u.fullName.split(' ')[0])} 👋`, 'Here is where your application stands.')}
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <section class="card">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="muted">Applied for</p>
              <h2 class="text-xl font-semibold text-stone-900 dark:text-white">${esc(c.job.title)}</h2>
              <p class="muted mt-1">${esc(c.job.location)} &middot; Applied on ${formatDate(c.createdAt, false)}</p>
            </div>
            ${statusBadge(c.status)}
          </div>
          <div class="mt-8">${stageStepper(c.stage, c.status)}</div>
          <div class="mt-8">${statusBanner(c.status)}</div>
        </section>

        <section class="card">
          <h3 class="text-base font-semibold text-stone-900 dark:text-white">Interview schedule</h3>
          <div class="mt-4 space-y-3">
            ${c.interviews.length ? c.interviews.map(interviewCard).join('') : emptyState('calendar', 'No interviews yet', 'When HR schedules an interview it will appear here and you will get an email.')}
          </div>
        </section>
      </div>

      <aside class="card h-fit">
        <div class="flex items-center gap-3">
          ${avatar(u.fullName, 'size-12 text-base')}
          <div class="min-w-0">
            <p class="truncate font-semibold text-stone-900 dark:text-white">${esc(u.fullName)}</p>
            <p class="muted truncate">${esc(u.email)}</p>
          </div>
        </div>
        <dl class="mt-6 space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-stone-500 dark:text-stone-400">Mobile</dt><dd class="font-medium">${esc(u.mobileCode)} ${esc(u.mobile)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-stone-500 dark:text-stone-400">Experience</dt><dd class="font-medium">${c.totalExperience} yrs</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-stone-500 dark:text-stone-400">Notice period</dt><dd class="font-medium">${c.noticePeriodDays} days</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-stone-500 dark:text-stone-400">Location</dt><dd class="font-medium">${esc(c.preferredLocation)}</dd></div>
        </dl>
        <button type="button" class="btn btn-secondary mt-6 w-full" id="resumeBtn">${icon('document', 'size-4')} View my resume</button>
      </aside>
    </div>`;

  document
    .getElementById('resumeBtn')
    .addEventListener('click', () => openResume(c.id).catch(showError));
}

content.innerHTML = skeleton(5) + skeleton(3);
if (new URLSearchParams(location.search).get('applied') === '1') {
  toast('Application submitted successfully!');
  history.replaceState(null, '', 'my-status.html');
}

api('/candidates/me')
  .then(render)
  .catch((err) => {
    content.innerHTML =
      pageHeader(`Hi ${esc(user.fullName.split(' ')[0])} 👋`) +
      emptyState(
        'briefcase',
        "You haven't applied yet",
        err.message === 'You have not applied for a job yet'
          ? 'Find a role you like and apply in a few minutes.'
          : esc(err.message),
        '<a href="index.html" class="btn btn-primary">Browse open jobs</a>',
      );
  });
