// HR dashboard: stats, pipeline, candidate list with search/filter/paging, quick actions
requireRole('HR');
renderNavbar();
renderFooter();

const filtersForm = document.getElementById('filters');
const PAGE_SIZE = 10;
let page = 1;

document.getElementById('header').innerHTML = pageHeader(
  'Recruitment dashboard',
  'Track every candidate and move them through the interview stages.',
  `<a href="apply.html" class="btn btn-primary">${icon('userPlus', 'size-4')} Add candidate</a>`,
);
document.getElementById('searchIcon').innerHTML = icon('search');
document.getElementById('stageFilter').innerHTML += STAGES.map(
  (s) => `<option value="${s}">${STAGE_LABELS[s]}</option>`,
).join('');
document.getElementById('statusFilter').innerHTML += Object.entries(STATUS_LABELS)
  .map(([value, label]) => `<option value="${value}">${label}</option>`)
  .join('');

// ---------- Stats ----------
function statCard(label, value, iconName, colors) {
  return `<div class="card flex items-center gap-4">
      <span class="grid size-12 place-items-center rounded-xl ${colors}">${icon(iconName, 'size-6')}</span>
      <div><p class="muted">${label}</p><p class="text-2xl font-bold text-stone-900 dark:text-white">${value}</p></div>
    </div>`;
}

async function loadStats() {
  const s = await api('/candidates/stats');
  document.getElementById('stats').innerHTML = [
    statCard(
      'Total candidates',
      s.total,
      'users',
      'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
    ),
    statCard(
      'In progress',
      s.byStatus.IN_PROGRESS + s.byStatus.PROFILING_COMPLETED,
      'clock',
      'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    ),
    statCard(
      'Selected',
      s.byStatus.SELECTED,
      'check',
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    ),
    statCard(
      'Rejected',
      s.byStatus.REJECTED,
      'x',
      'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
    ),
  ].join('');

  const max = Math.max(1, ...Object.values(s.byStage));
  document.getElementById('pipeline').innerHTML = STAGES.map(
    (
      stage,
    ) => `<button type="button" data-stage="${stage}" class="group rounded-xl border border-stone-200 p-4 text-left transition hover:border-brand-400 hover:shadow-md dark:border-night-600">
        <p class="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">${STAGE_LABELS[stage]}</p>
        <p class="mt-1 text-2xl font-bold text-stone-900 dark:text-white">${s.byStage[stage]}</p>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-night-700">
          <div class="h-full rounded-full bg-brand-500" style="width:${(s.byStage[stage] / max) * 100}%"></div>
        </div>
      </button>`,
  ).join('');
}

document.getElementById('pipeline').addEventListener('click', (e) => {
  const card = e.target.closest('[data-stage]');
  if (!card) return;
  filtersForm.stage.value = card.dataset.stage;
  page = 1;
  loadCandidates();
  filtersForm.scrollIntoView({ behavior: 'smooth' });
});

// ---------- Candidates table ----------
function row(c) {
  const done = c.status === 'SELECTED' || c.status === 'REJECTED';
  const canMove = !done && c.stage !== 'HR_ROUND';
  const actions = done
    ? ''
    : `${canMove ? `<button class="btn btn-secondary btn-sm" data-action="next" data-id="${c.id}" data-name="${esc(c.user.fullName)}">Next stage ${icon('arrowRight', 'size-3.5')}</button>` : ''}
       <button class="btn btn-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" data-action="reject" data-id="${c.id}" data-name="${esc(c.user.fullName)}">Reject</button>`;
  return `<tr>
      <td>
        <a href="hr-candidate.html?id=${c.id}" class="flex items-center gap-3">
          ${avatar(c.user.fullName, 'size-9 text-xs')}
          <span class="min-w-0">
            <span class="block font-semibold text-stone-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300">${esc(c.user.fullName)}</span>
            <span class="block truncate text-xs text-stone-500 dark:text-stone-400">${esc(c.user.email)}</span>
          </span>
        </a>
      </td>
      <td class="text-stone-600 dark:text-stone-300">${esc(c.job.title)}</td>
      <td>${stageBadge(c.stage)}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="whitespace-nowrap text-stone-500 dark:text-stone-400">${formatDate(c.updatedAt)}</td>
      <td><div class="flex justify-end gap-1">${actions}</div></td>
    </tr>`;
}

async function loadJobsFilter() {
  const jobs = await api('/jobs/all');
  document.getElementById('jobFilter').innerHTML += jobs
    .map((j) => `<option value="${j.id}">${esc(j.title)}</option>`)
    .join('');
}

async function loadCandidates() {
  const query = new URLSearchParams([...new FormData(filtersForm)].filter(([, v]) => v !== ''));
  query.set('page', page);
  query.set('size', PAGE_SIZE);
  const rows = document.getElementById('rows');
  rows.innerHTML = `<tr><td colspan="6"><div class="h-24 animate-pulse rounded-lg bg-stone-100 dark:bg-night-700"></div></td></tr>`;
  try {
    const { items, total } = await api(`/candidates?${query}`);
    rows.innerHTML = items.length
      ? items.map(row).join('')
      : `<tr><td colspan="6">${emptyState('inbox', 'No candidates found', 'Try changing the filters, or add a new candidate.')}</td></tr>`;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    document.getElementById('pageInfo').textContent =
      `Page ${page} of ${pages} · ${total} candidate${total === 1 ? '' : 's'}`;
    document.getElementById('prevBtn').disabled = page <= 1;
    document.getElementById('nextBtn').disabled = page >= pages;
  } catch (err) {
    rows.innerHTML = '';
    showError(err);
  }
}

async function handleAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id, name } = button.dataset;
  try {
    if (action === 'next') {
      const updated = await withBusy(button, () =>
        api(`/candidates/${id}/next-stage`, { method: 'POST' }),
      );
      toast(`${name} moved to ${STAGE_LABELS[updated.stage]}`);
    } else {
      const answer = await openDialog({
        title: `Reject ${esc(name)}?`,
        message: 'The candidate will get an email. This cannot be undone.',
        fieldsHtml: `<div><label class="label" for="rejectComments">Reason *</label>
          <textarea class="input" id="rejectComments" name="comments" rows="3" required minlength="5"></textarea></div>`,
        confirmText: 'Reject candidate',
        danger: true,
      });
      if (!answer) return;
      await api(`/candidates/${id}/reject`, { method: 'POST', body: answer });
      toast(`${name} was rejected`, 'info');
    }
    loadCandidates();
    loadStats();
  } catch (err) {
    showError(err);
  }
}

filtersForm.addEventListener('submit', (e) => {
  e.preventDefault();
  page = 1;
  loadCandidates();
});
filtersForm.addEventListener('reset', () => setTimeout(() => filtersForm.requestSubmit()));
document.getElementById('prevBtn').addEventListener('click', () => {
  page -= 1;
  loadCandidates();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  page += 1;
  loadCandidates();
});
document.getElementById('rows').addEventListener('click', handleAction);

loadStats().catch(showError);
loadJobsFilter().catch(showError);
loadCandidates();
