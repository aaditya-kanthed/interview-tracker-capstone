// Public homepage: open jobs with search + job-type filter
renderNavbar();
renderFooter();
document.getElementById('searchIcon').innerHTML = icon('search');

let allJobs = [];
let activeType = 'ALL';

const TYPE_BADGE = { FULL_TIME: 'badge-green', CONTRACT: 'badge-amber', REMOTE: 'badge-violet' };

function jobCard(job) {
  const skills = job.skills.map((s) => `<span class="skill-chip">${esc(s)}</span>`).join('');
  return `
    <article class="card group flex flex-col transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
      <div class="flex items-start justify-between gap-3">
        <span class="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">${icon('briefcase', 'size-6')}</span>
        <span class="badge ${TYPE_BADGE[job.jobType]}">${JOB_TYPES[job.jobType]}</span>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-stone-900 dark:text-white">${esc(job.title)}</h3>
      <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
        <span class="inline-flex items-center gap-1">${icon('mapPin', 'size-4')}${esc(job.location)}</span>
        <span class="inline-flex items-center gap-1">${icon('clock', 'size-4')}${job.minExperience}-${job.maxExperience} yrs</span>
        <span class="inline-flex items-center gap-1">${icon('money', 'size-4')}${formatLpa(job.minSalary)} - ${formatLpa(job.maxSalary)}</span>
      </div>
      <p class="mt-4 line-clamp-3 text-sm text-stone-600 dark:text-stone-300">${esc(job.description)}</p>
      <div class="mt-4 flex flex-wrap gap-1.5">${skills}</div>
      <div class="mt-6 flex-1"></div>
      <a href="apply.html?jobId=${job.id}" class="btn btn-primary w-full">Apply now ${icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5')}</a>
    </article>`;
}

function renderTypeFilters() {
  const types = [['ALL', 'All jobs'], ...Object.entries(JOB_TYPES)];
  document.getElementById('typeFilters').innerHTML = types
    .map(
      ([value, label]) =>
        `<button type="button" data-type="${value}" class="rounded-full border px-4 py-1.5 text-sm font-medium transition ${
          value === activeType
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-stone-300 bg-white text-stone-600 hover:border-brand-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
        }">${label}</button>`,
    )
    .join('');
}

function renderJobs() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const jobs = allJobs.filter((job) => {
    const text = [job.title, job.location, ...job.skills].join(' ').toLowerCase();
    return (activeType === 'ALL' || job.jobType === activeType) && text.includes(q);
  });
  document.getElementById('jobCount').textContent = `${jobs.length} of ${allJobs.length} jobs`;
  document.getElementById('jobs').innerHTML = jobs.length
    ? jobs.map(jobCard).join('')
    : `<div class="sm:col-span-2 lg:col-span-3">${emptyState(
        'search',
        allJobs.length ? 'No jobs match your search' : 'No open positions right now',
        allJobs.length ? 'Try a different keyword or job type.' : 'Please check back soon.',
      )}</div>`;
}

document.getElementById('search').addEventListener('input', renderJobs);
document.getElementById('typeFilters').addEventListener('click', (e) => {
  const button = e.target.closest('[data-type]');
  if (!button) return;
  activeType = button.dataset.type;
  renderTypeFilters();
  renderJobs();
});

async function loadJobs() {
  document.getElementById('jobs').innerHTML = skeleton(4) + skeleton(4) + skeleton(4);
  try {
    allJobs = await api('/jobs');
    renderTypeFilters();
    renderJobs();
  } catch (err) {
    document.getElementById('jobs').innerHTML = '';
    showError(err);
  }
}

loadJobs();
