// Candidate profiling form.
// Candidate: the JD comes from the job they clicked and cannot be changed.
// HR: also enters name + email and picks the JD from a dropdown.
const user = requireRole('HR', 'CANDIDATE');
const isHr = user.role === 'HR';
const form = document.getElementById('applyForm');
const jobSelect = document.getElementById('jobSelect');
const resumeInput = document.getElementById('resume');

renderNavbar();
renderFooter();
document.getElementById('uploadIcon').innerHTML = icon('upload', 'size-8');
document.getElementById('source').innerHTML = Object.entries(SOURCES)
  .map(([value, label]) => `<option value="${value}">${label}</option>`)
  .join('');

function showJobSummary(job) {
  document.getElementById('jobSummary').innerHTML = `
    <div class="card mb-6 flex flex-col gap-4 border-brand-200 bg-brand-50/60 sm:flex-row sm:items-center dark:border-brand-500/30 dark:bg-brand-500/10">
      <span class="grid size-12 place-items-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-night-800 dark:text-brand-300">${icon('briefcase', 'size-6')}</span>
      <div class="flex-1">
        <p class="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">You are applying for</p>
        <p class="text-lg font-semibold text-stone-900 dark:text-white">${esc(job.title)}</p>
        <p class="muted">${esc(job.location)} &middot; ${JOB_TYPES[job.jobType]} &middot; ${job.minExperience}-${job.maxExperience} yrs</p>
      </div>
    </div>`;
}

async function setUpJob() {
  if (isHr) {
    document.getElementById('header').innerHTML = pageHeader(
      'Add a candidate',
      'Create a profile on behalf of a candidate.',
    );
    const jobs = await api('/jobs');
    jobSelect.innerHTML =
      '<option value="">Select a job description</option>' +
      jobs
        .map((j) => `<option value="${j.id}">${esc(j.title)} (${esc(j.location)})</option>`)
        .join('');
    document.getElementById('hrOnly').hidden = false;
    form.fullName.required = true;
    form.email.required = true;
    document.getElementById('cancelLink').href = 'hr-dashboard.html';
    return true;
  }

  document.getElementById('header').innerHTML = pageHeader(
    'Complete your profile',
    'This takes about 2 minutes. Fields marked * are required.',
  );
  const jobId = new URLSearchParams(location.search).get('jobId');
  if (!jobId) {
    document.getElementById('jobSummary').innerHTML = emptyState(
      'briefcase',
      'Choose a job first',
      'Pick an open position from the jobs page, then click Apply.',
      '<a href="index.html" class="btn btn-primary">Browse jobs</a>',
    );
    return false;
  }
  const job = await api(`/jobs/${encodeURIComponent(jobId)}`);
  jobSelect.innerHTML = `<option value="${job.id}">${esc(job.title)}</option>`;
  showJobSummary(job);
  return true;
}

// ----- Resume picker with drag & drop -----
function setFile(file) {
  const label = document.getElementById('fileName');
  if (!file) {
    label.textContent = 'Click to upload or drag your PDF here';
    return;
  }
  if (file.type !== 'application/pdf') {
    toast('Please choose a PDF file', 'error');
    resumeInput.value = '';
    return setFile(null);
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('The file is larger than 5 MB', 'error');
    resumeInput.value = '';
    return setFile(null);
  }
  label.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
}

resumeInput.addEventListener('change', () => setFile(resumeInput.files[0]));
const dropZone = document.getElementById('dropZone');
['dragover', 'dragenter'].forEach((type) =>
  dropZone.addEventListener(type, (e) => {
    e.preventDefault();
    dropZone.classList.add('border-brand-500');
  }),
);
['dragleave', 'drop'].forEach((type) =>
  dropZone.addEventListener(type, () => dropZone.classList.remove('border-brand-500')),
);
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  if (!e.dataTransfer.files.length) return;
  resumeInput.files = e.dataTransfer.files;
  setFile(resumeInput.files[0]);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const saved = await withBusy(form.querySelector('[type=submit]'), () =>
      api('/candidates', { method: 'POST', body: data, isForm: true }),
    );
    if (isHr) {
      window.location.href = `hr-candidate.html?id=${saved.id}&created=1`;
    } else {
      window.location.href = 'my-status.html?applied=1';
    }
  } catch (err) {
    showError(err, form);
  }
});

setUpJob()
  .then((ok) => {
    form.hidden = !ok;
  })
  .catch((err) => showError(err));
