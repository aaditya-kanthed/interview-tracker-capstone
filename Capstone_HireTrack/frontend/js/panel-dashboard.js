// Panel member: assigned interviews with candidate profile, resume, JD, focus areas + feedback form
const me = requireRole('PANEL');
renderNavbar();
renderFooter();

const box = document.getElementById('interviews');
let interviews = [];
let tab = 'pending';

document.getElementById('header').innerHTML = pageHeader(
  `Welcome, ${esc(me.fullName.split(' ')[0])}`,
  'Your assigned interviews. Feedback is required for every interview.',
);

// 5 clickable stars (radio buttons) for the rating
function starPicker() {
  return `<div class="flex flex-row-reverse justify-end gap-1" role="radiogroup" aria-label="Rating">
      ${[5, 4, 3, 2, 1]
        .map(
          (
            n,
          ) => `<input type="radio" name="rating" value="${n}" id="__ID__-r${n}" class="peer sr-only" ${n === 3 ? 'checked' : ''} required />
          <label for="__ID__-r${n}" title="${n} star${n > 1 ? 's' : ''}" class="cursor-pointer text-stone-300 transition hover:text-amber-400 peer-hover:text-amber-400 peer-checked:text-amber-400 dark:text-stone-600">${icon('star', 'size-7 fill-current')}</label>`,
        )
        .join('')}
    </div>`;
}

function feedbackForm(interviewId) {
  return `<form class="mt-6 space-y-4 rounded-xl border border-stone-200 p-5 dark:border-stone-800" data-id="${interviewId}" novalidate>
      <h4 class="font-semibold text-stone-900 dark:text-white">Submit feedback</h4>
      <div>
        <label class="label">Rating *</label>
        ${starPicker().replaceAll('__ID__', `iv${interviewId}`)}
      </div>
      <div>
        <label class="label" for="c${interviewId}">Comments *</label>
        <textarea class="input" id="c${interviewId}" name="comments" rows="3" required minlength="5" placeholder="Overall impression of the candidate"></textarea>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="s${interviewId}">Strengths *</label>
          <input class="input" id="s${interviewId}" name="strengths" required minlength="2" />
        </div>
        <div>
          <label class="label" for="w${interviewId}">Weaknesses *</label>
          <input class="input" id="w${interviewId}" name="weaknesses" required minlength="2" />
        </div>
      </div>
      <div>
        <label class="label" for="a${interviewId}">Areas covered *</label>
        <input class="input" id="a${interviewId}" name="areasCovered" required minlength="2" />
      </div>
      <div>
        <span class="label">Your recommendation *</span>
        <div class="grid grid-cols-2 gap-2">
          <label class="cursor-pointer"><input type="radio" name="result" value="SELECTED" class="peer sr-only" checked />
            <span class="flex items-center justify-center gap-2 rounded-lg border-2 border-stone-200 p-2.5 text-sm font-semibold transition peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:border-stone-700 dark:peer-checked:bg-emerald-500/10 dark:peer-checked:text-emerald-300">${icon('check', 'size-4')} Selected</span></label>
          <label class="cursor-pointer"><input type="radio" name="result" value="REJECTED" class="peer sr-only" />
            <span class="flex items-center justify-center gap-2 rounded-lg border-2 border-stone-200 p-2.5 text-sm font-semibold transition peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700 dark:border-stone-700 dark:peer-checked:bg-rose-500/10 dark:peer-checked:text-rose-300">${icon('x', 'size-4')} Rejected</span></label>
        </div>
      </div>
      <button class="btn btn-primary" type="submit">Submit feedback</button>
    </form>`;
}

function interviewCard(i) {
  const c = i.candidate;
  const mine = i.feedbacks[0];
  const feedback = mine
    ? `<div class="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
         <span class="text-emerald-600 dark:text-emerald-300">${icon('check')}</span>
         <span class="font-semibold text-emerald-800 dark:text-emerald-200">Feedback submitted</span>
         ${stars(mine.rating)} ${resultBadge(mine.result)}
       </div>`
    : feedbackForm(i.id);
  return `<article class="card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        ${avatar(c.user.fullName, 'size-12 text-base')}
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-lg font-semibold text-stone-900 dark:text-white">${esc(c.user.fullName)}</h3>
            <span class="badge badge-brand">${i.round} Technical</span>
          </div>
          <p class="muted mt-1">${esc(c.job.title)}</p>
          <p class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">${icon('calendar', 'size-4')} ${formatDate(i.scheduledAt)}</p>
        </div>
        <button class="btn btn-secondary btn-sm" data-resume="${c.id}">${icon('document', 'size-4')} Resume</button>
      </div>
      <div class="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-100"><b>Focus areas:</b> ${esc(i.focusAreas)}</div>
      ${i.meetingLink ? `<div class="mt-3">${meetButton(i.meetingLink)}</div>` : ''}
      <details class="group mt-4">
        <summary class="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
          <span class="transition group-open:rotate-90">&rsaquo;</span> Candidate profile &amp; job description
        </summary>
        <div class="mt-3 grid gap-4 rounded-lg border border-stone-200 p-4 text-sm sm:grid-cols-2 dark:border-stone-800">
          <div><p class="muted">Experience</p><p class="font-medium">${c.totalExperience} yrs total, ${c.relevantExperience} yrs relevant</p></div>
          <div><p class="muted">Current organization</p><p class="font-medium">${esc(c.currentOrganization || '-')}</p></div>
          <div><p class="muted">Notice period</p><p class="font-medium">${c.noticePeriodDays} days</p></div>
          <div><p class="muted">Skills required</p><div class="mt-1 flex flex-wrap gap-1">${c.job.skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div></div>
          <div class="sm:col-span-2"><p class="muted">Job description</p><p class="whitespace-pre-line">${esc(c.job.description)}</p></div>
        </div>
      </details>
      ${feedback}
    </article>`;
}

function render() {
  const pending = interviews.filter((i) => !i.feedbacks.length);
  const done = interviews.filter((i) => i.feedbacks.length);
  document.getElementById('tabs').innerHTML = [
    ['pending', 'Needs feedback', pending.length],
    ['done', 'Completed', done.length],
  ]
    .map(
      ([key, label, count]) =>
        `<button type="button" data-tab="${key}" class="rounded-lg px-4 py-2 text-sm font-semibold transition ${
          tab === key
            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-white dark:ring-stone-700'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white'
        }">${label} <span class="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs dark:bg-stone-700">${count}</span></button>`,
    )
    .join('');
  const list = tab === 'pending' ? pending : done;
  box.innerHTML = list.length
    ? list.map(interviewCard).join('')
    : emptyState(
        'clipboard',
        tab === 'pending' ? 'All caught up!' : 'No completed interviews yet',
        tab === 'pending' ? 'You have no interviews waiting for feedback.' : '',
      );
}

async function load() {
  interviews = await api('/interviews/mine');
  render();
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (!t) return;
  tab = t.dataset.tab;
  render();
});

box.addEventListener('click', (e) => {
  const resume = e.target.closest('[data-resume]');
  if (resume) openResume(resume.dataset.resume).catch(showError);
});

box.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const body = Object.fromEntries(new FormData(form));
  body.rating = Number(body.rating);
  try {
    await withBusy(form.querySelector('[type=submit]'), () =>
      api(`/interviews/${form.dataset.id}/feedback`, { method: 'POST', body }),
    );
    toast('Feedback submitted. Thank you!');
    load();
  } catch (err) {
    showError(err, form);
  }
});

box.innerHTML = skeleton(5) + skeleton(5);
load().catch(showError);
