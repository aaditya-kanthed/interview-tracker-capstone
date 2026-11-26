// HR: create, edit, close and reopen job descriptions. Skills are entered as tags.
requireRole('HR');
renderNavbar();
renderFooter();

const form = document.getElementById('jobForm');
const drawer = document.getElementById('drawer');
const drawerPanel = document.getElementById('drawerPanel');
const skillInput = document.getElementById('skillInput');
let skills = [];
let jobs = [];
let tab = 'open';

document.getElementById('header').innerHTML = pageHeader(
  'Job descriptions',
  'Create roles and choose which ones are open for applications.',
  `<button class="btn btn-primary" id="newJobBtn">${icon('plus', 'size-4')} New job</button>`,
);
document.getElementById('closeIcon').innerHTML = icon('x');

// ---------- Drawer ----------
function openDrawer(job) {
  form.reset();
  if (typeof clearFieldErrors === 'function') clearFieldErrors(form);
  form.id.value = job?.id || '';
  skills = job ? [...job.skills] : [];
  if (job) {
    for (const key of [
      'title',
      'description',
      'minExperience',
      'maxExperience',
      'minSalary',
      'maxSalary',
      'location',
      'jobType',
    ]) {
      form[key].value = job[key];
    }
  }
  renderSkills();
  document.getElementById('formTitle').textContent = job
    ? `Edit: ${job.title}`
    : 'New job description';
  drawer.hidden = false;
  requestAnimationFrame(() => drawerPanel.classList.remove('translate-x-full'));
  form.title.focus();
}

function closeDrawer() {
  drawerPanel.classList.add('translate-x-full');
  setTimeout(() => {
    drawer.hidden = true;
  }, 300);
}

drawer.addEventListener('click', (e) => e.target.closest('[data-close-drawer]') && closeDrawer());
document.addEventListener('keydown', (e) => e.key === 'Escape' && !drawer.hidden && closeDrawer());
document.getElementById('newJobBtn').addEventListener('click', () => openDrawer(null));

// ---------- Skill tags ----------
function renderSkills() {
  document.querySelectorAll('#skillsBox [data-skill]').forEach((t) => t.remove());
  skillInput.insertAdjacentHTML(
    'beforebegin',
    skills
      .map(
        (
          s,
          i,
        ) => `<span data-skill class="inline-flex items-center gap-1 rounded-md bg-brand-100 py-1 pr-1 pl-2 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
          ${esc(s)}<button type="button" data-remove="${i}" class="rounded p-0.5 hover:bg-brand-200 dark:hover:bg-brand-500/30" aria-label="Remove ${esc(s)}">${icon('x', 'size-3')}</button></span>`,
      )
      .join(''),
  );
}

function addSkill() {
  const value = skillInput.value.trim().replace(/,$/, '').trim();
  if (value && !skills.some((s) => s.toLowerCase() === value.toLowerCase())) skills.push(value);
  skillInput.value = '';
  renderSkills();
}

skillInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addSkill();
  } else if (e.key === 'Backspace' && !skillInput.value && skills.length) {
    skills.pop();
    renderSkills();
  }
});
skillInput.addEventListener('blur', addSkill);
document.getElementById('skillsBox').addEventListener('click', (e) => {
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    skills.splice(Number(remove.dataset.remove), 1);
    renderSkills();
  } else {
    skillInput.focus();
  }
});

// ---------- Job list ----------
function jobCard(j) {
  return `<article class="card flex flex-col ${j.isOpen ? '' : 'opacity-75'}">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-semibold text-stone-900 dark:text-white">${esc(j.title)}</h3>
          <p class="muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-1">${icon('mapPin', 'size-4')}${esc(j.location)}</span>
            <span>${JOB_TYPES[j.jobType]}</span>
            <span>${j.minExperience}-${j.maxExperience} yrs</span>
            <span>${formatLpa(j.minSalary)} - ${formatLpa(j.maxSalary)}</span>
          </p>
        </div>
        ${j.isOpen ? '<span class="badge badge-green">Open</span>' : '<span class="badge badge-gray">Closed</span>'}
      </div>
      <div class="mt-4 flex flex-wrap gap-1.5">${j.skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>
      <div class="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 dark:border-night-600">
        <span class="muted inline-flex items-center gap-1">${icon('users', 'size-4')} ${j._count.candidates} candidate${j._count.candidates === 1 ? '' : 's'}</span>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${j.id}">${icon('pencil', 'size-3.5')} Edit</button>
          ${
            j.isOpen
              ? `<button class="btn btn-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" data-action="close" data-id="${j.id}">Close</button>`
              : `<button class="btn btn-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10" data-action="reopen" data-id="${j.id}">Reopen</button>`
          }
        </div>
      </div>
    </article>`;
}

function renderTabs() {
  const counts = {
    open: jobs.filter((j) => j.isOpen).length,
    closed: jobs.filter((j) => !j.isOpen).length,
  };
  document.getElementById('tabs').innerHTML = ['open', 'closed']
    .map(
      (t) =>
        `<button type="button" data-tab="${t}" class="rounded-lg px-4 py-2 text-sm font-semibold transition ${
          tab === t
            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200 dark:bg-night-700 dark:text-white dark:ring-night-500'
            : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-white'
        }">${t === 'open' ? 'Open' : 'Closed'} <span class="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs dark:bg-night-600">${counts[t]}</span></button>`,
    )
    .join('');
}

function renderJobs() {
  renderTabs();
  const list = jobs.filter((j) => (tab === 'open' ? j.isOpen : !j.isOpen));
  document.getElementById('jobs').innerHTML = list.length
    ? list.map(jobCard).join('')
    : `<div class="md:col-span-2">${emptyState('briefcase', tab === 'open' ? 'No open jobs' : 'No closed jobs', tab === 'open' ? 'Create a job description to start receiving applications.' : '')}</div>`;
}

async function loadJobs() {
  jobs = await api('/jobs/all');
  renderJobs();
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tab]');
  if (!t) return;
  tab = t.dataset.tab;
  renderJobs();
});

document.getElementById('jobs').addEventListener('click', async (e) => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const job = jobs.find((j) => j.id === Number(button.dataset.id));
  if (button.dataset.action === 'edit') return openDrawer(job);
  try {
    await withBusy(button, () =>
      api(`/jobs/${job.id}/${button.dataset.action}`, { method: 'PATCH' }),
    );
    toast(
      button.dataset.action === 'close'
        ? `"${job.title}" is now closed`
        : `"${job.title}" is open again`,
    );
    loadJobs();
  } catch (err) {
    showError(err);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  addSkill();
  if (!form.reportValidity()) return;
  if (!skills.length) {
    showError(
      { message: 'Add at least one skill', details: { skills: ['Add at least one skill'] } },
      form,
    );
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  const id = data.id;
  delete data.id;
  for (const key of ['minExperience', 'maxExperience', 'minSalary', 'maxSalary'])
    data[key] = Number(data[key]);
  data.skills = skills;
  try {
    await withBusy(document.querySelector('[form=jobForm]'), () =>
      id
        ? api(`/jobs/${id}`, { method: 'PUT', body: data })
        : api('/jobs', { method: 'POST', body: data }),
    );
    toast(id ? 'Job updated' : 'Job created');
    closeDrawer();
    loadJobs();
  } catch (err) {
    showError(err, form);
  }
});

document.getElementById('jobs').innerHTML = skeleton(4) + skeleton(4);
loadJobs().catch(showError);
