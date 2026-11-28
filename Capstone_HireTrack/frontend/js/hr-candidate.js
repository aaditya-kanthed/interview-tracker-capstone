// HR: full candidate details + feedback, scheduling, stage control and final decision
requireRole('HR');
renderNavbar();
renderFooter();

const content = document.getElementById('content');
const params = new URLSearchParams(location.search);
const candidateId = params.get('id');
const ROUND_FOR_STAGE = { L1_TECHNICAL: 'L1', L2_TECHNICAL: 'L2' };
let activePanels = [];

if (params.get('created') === '1') {
  toast('Candidate created. They were emailed a link to set a password.');
  history.replaceState(null, '', `hr-candidate.html?id=${candidateId}`);
}

const detail = (label, value) => `<div>
    <dt class="text-xs font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">${label}</dt>
    <dd class="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">${value}</dd>
  </div>`;

function feedbackCard(f) {
  return `<div class="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-night-600 dark:bg-night-700/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">${avatar(f.panel.fullName, 'size-7 text-[10px]')}<span class="font-semibold">${esc(f.panel.fullName)}</span></div>
        <div class="flex items-center gap-3">${stars(f.rating)} ${resultBadge(f.result)}</div>
      </div>
      <p class="mt-3 text-sm text-stone-700 dark:text-stone-300">${esc(f.comments)}</p>
      <dl class="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div><dt class="font-semibold text-emerald-600 dark:text-emerald-400">Strengths</dt><dd class="text-stone-600 dark:text-stone-400">${esc(f.strengths)}</dd></div>
        <div><dt class="font-semibold text-rose-600 dark:text-rose-400">Weaknesses</dt><dd class="text-stone-600 dark:text-stone-400">${esc(f.weaknesses)}</dd></div>
        <div><dt class="font-semibold text-stone-700 dark:text-stone-300">Areas covered</dt><dd class="text-stone-600 dark:text-stone-400">${esc(f.areasCovered)}</dd></div>
      </dl>
    </div>`;
}

function interviewCard(i) {
  const panels = i.panels.map((p) => esc(p.panel.fullName)).join(', ');
  const pending = i.panels.length - i.feedbacks.length;
  return `<div class="card">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 class="font-semibold text-stone-900 dark:text-white">${i.round} Technical interview</h3>
          <p class="muted mt-1 flex items-center gap-1">${icon('calendar', 'size-4')} ${formatDate(i.scheduledAt)}</p>
          <p class="muted mt-1 flex items-center gap-1">${icon('users', 'size-4')} ${panels}</p>
        </div>
        ${pending > 0 ? `<span class="badge badge-amber">${pending} feedback pending</span>` : '<span class="badge badge-green">Feedback complete</span>'}
      </div>
      <p class="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200"><b>Focus areas:</b> ${esc(i.focusAreas)}</p>
      ${i.meetingLink ? `<div class="mt-3 flex flex-wrap items-center gap-2">${meetButton(i.meetingLink)}<span class="muted break-all">${esc(i.meetingLink)}</span></div>` : ''}
      <div class="mt-4 space-y-3">${i.feedbacks.map(feedbackCard).join('')}</div>
    </div>`;
}

function actionsHtml(c) {
  if (c.status === 'SELECTED' || c.status === 'REJECTED') {
    return `<div class="rounded-xl border p-4 text-sm ${c.status === 'SELECTED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'}">
        <p class="font-semibold">Final decision: ${STATUS_LABELS[c.status]}</p>
        <p class="mt-1">${esc(c.finalComments)}</p></div>`;
  }
  const next =
    c.stage !== 'HR_ROUND'
      ? `<button class="btn btn-primary" id="nextBtn">Move to ${STAGE_LABELS[STAGES[STAGES.indexOf(c.stage) + 1]]} ${icon('arrowRight', 'size-4')}</button>`
      : '';
  return `<div class="flex flex-wrap gap-2">${next}<button class="btn btn-secondary text-rose-600 dark:text-rose-400" id="rejectBtn">Reject candidate</button></div>`;
}

function render(c) {
  const u = c.user;
  content.innerHTML = `
    <section class="card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        ${avatar(u.fullName, 'size-16 text-xl')}
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-stone-900 dark:text-white">${esc(u.fullName)}</h1>
          <p class="muted">${esc(c.job.title)} &middot; ${esc(c.job.location)}</p>
          <div class="mt-2 flex flex-wrap gap-2">${stageBadge(c.stage)} ${statusBadge(c.status)}</div>
        </div>
        <button class="btn btn-secondary" id="resumeBtn">${icon('document', 'size-4')} Open resume</button>
      </div>
      <div class="mt-8">${stageStepper(c.stage, c.status)}</div>
      <div class="mt-8">${actionsHtml(c)}</div>
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <section class="card">
          <h2 class="text-base font-semibold text-stone-900 dark:text-white">Profile</h2>
          <dl class="mt-5 grid gap-5 sm:grid-cols-3">
            ${detail('Email', esc(u.email))}
            ${detail('Mobile', `${esc(u.mobileCode)} ${esc(u.mobile)}`)}
            ${detail('Date of birth', c.dateOfBirth ? formatDate(c.dateOfBirth, false) : '-')}
            ${detail('Current organization', esc(c.currentOrganization || '-'))}
            ${detail('Total experience', `${c.totalExperience} yrs`)}
            ${detail('Relevant experience', `${c.relevantExperience} yrs`)}
            ${detail('Current CTC', formatMoney(c.currentCtc))}
            ${detail('Expected CTC', formatMoney(c.expectedCtc))}
            ${detail('Notice period', `${c.noticePeriodDays} days`)}
            ${detail('Preferred location', esc(c.preferredLocation))}
            ${detail('Source', SOURCES[c.source] || esc(c.source))}
            ${detail('Applied on', formatDate(c.createdAt, false))}
          </dl>
        </section>
        <section>
          <h2 class="mb-3 text-lg font-semibold text-stone-900 dark:text-white">Interviews &amp; feedback</h2>
          <div class="space-y-4">${c.interviews.length ? c.interviews.map(interviewCard).join('') : emptyState('calendar', 'No interviews yet', 'Move the candidate to L1 Technical to schedule the first interview.')}</div>
        </section>
      </div>
      <aside class="space-y-6" id="sidePanel"></aside>
    </div>`;

  document
    .getElementById('resumeBtn')
    .addEventListener('click', () => openResume(c.id).catch(showError));
  document
    .getElementById('nextBtn')
    ?.addEventListener('click', (e) =>
      act(
        e.currentTarget,
        `/candidates/${c.id}/next-stage`,
        null,
        'Candidate moved to the next stage',
      ),
    );
  document.getElementById('rejectBtn')?.addEventListener('click', () => rejectCandidate(c));
  renderSideForms(c);
}

// Schedule form (L1/L2 not yet booked) and final decision form (HR round)
function renderSideForms(c) {
  const side = document.getElementById('sidePanel');
  const active = c.status !== 'SELECTED' && c.status !== 'REJECTED';
  const round = ROUND_FOR_STAGE[c.stage];

  if (active && round && !c.interviews.some((i) => i.round === round)) {
    side.appendChild(document.getElementById('scheduleTemplate').content.cloneNode(true));
    const form = document.getElementById('scheduleForm');
    form.round.value = round;
    document.getElementById('scheduleTitle').textContent = `Schedule ${round} interview`;
    form.scheduledAt.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    document.getElementById('panelChoices').innerHTML = activePanels.length
      ? activePanels
          .map(
            (
              p,
            ) => `<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-200 p-3 transition has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:border-night-500 dark:has-[:checked]:bg-brand-500/10">
              <input type="checkbox" name="panelIds" value="${p.id}" class="size-4 accent-brand-600" />
              ${avatar(p.fullName, 'size-8 text-xs')}
              <span class="text-sm"><span class="block font-medium">${esc(p.fullName)}</span><span class="text-xs text-stone-500 dark:text-stone-400">${esc(p.designation)}, ${esc(p.organization)}</span></span>
            </label>`,
          )
          .join('')
      : '<p class="muted">No active panel members. <a class="link" href="hr-panels.html">Add one</a> first.</p>';
    form.addEventListener('submit', submitSchedule);
  }

  if (active && c.stage === 'HR_ROUND') {
    side.appendChild(document.getElementById('decisionTemplate').content.cloneNode(true));
    const form = document.getElementById('decisionForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      act(
        form.querySelector('[type=submit]'),
        `/candidates/${c.id}/final-decision`,
        Object.fromEntries(new FormData(form)),
        'Final decision saved',
        form,
      );
    });
  }

  if (!side.children.length) {
    side.innerHTML = `<div class="card"><h3 class="font-semibold text-stone-900 dark:text-white">Next step</h3><p class="muted mt-2">${
      !active
        ? 'This application is closed.'
        : round
          ? 'Interview booked. Wait for all panel feedback, then move the candidate on.'
          : 'Review the profile, then move the candidate to the next stage.'
    }</p></div>`;
  }
}

function submitSchedule(e) {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const panelIds = data.getAll('panelIds').map(Number);
  if (panelIds.length < 1 || panelIds.length > 2) {
    toast('Choose 1 or 2 panel members', 'error');
    return;
  }
  act(
    form.querySelector('[type=submit]'),
    `/candidates/${candidateId}/interviews`,
    {
      round: data.get('round'),
      scheduledAt: new Date(data.get('scheduledAt')).toISOString(),
      panelIds,
      focusAreas: data.get('focusAreas'),
      meetingLink: data.get('meetingLink').trim(),
    },
    'Interview scheduled and emails sent',
    form,
  );
}

async function rejectCandidate(c) {
  const answer = await openDialog({
    title: `Reject ${esc(c.user.fullName)}?`,
    message: 'The candidate will get an email. This cannot be undone.',
    fieldsHtml: `<div><label class="label" for="rejectComments">Reason *</label>
      <textarea class="input" id="rejectComments" name="comments" rows="3" required minlength="5"></textarea></div>`,
    confirmText: 'Reject candidate',
    danger: true,
  });
  if (answer) act(null, `/candidates/${c.id}/reject`, answer, 'Candidate rejected');
}

async function act(button, path, body, successMessage, form) {
  try {
    const run = () => api(path, { method: 'POST', body });
    await (button ? withBusy(button, run) : run());
    toast(successMessage);
    load();
  } catch (err) {
    showError(err, form);
  }
}

async function load() {
  try {
    render(await api(`/candidates/${encodeURIComponent(candidateId)}`));
  } catch (err) {
    content.innerHTML = emptyState(
      'warning',
      'Could not load this candidate',
      esc(err.message),
      '<a href="hr-dashboard.html" class="btn btn-primary">Back to dashboard</a>',
    );
  }
}

content.innerHTML = skeleton(4) + skeleton(6);
api('/panels?active=true')
  .then((panels) => {
    activePanels = panels;
  })
  .catch(showError)
  .finally(load);
