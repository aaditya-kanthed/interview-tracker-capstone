// Talks to the backend + small data helpers. Every page loads this first.
const API_BASE = '/api';

const STAGES = ['PROFILING', 'SCREENING', 'L1_TECHNICAL', 'L2_TECHNICAL', 'HR_ROUND'];
const STAGE_LABELS = {
  PROFILING: 'Profiling',
  SCREENING: 'Screening',
  L1_TECHNICAL: 'L1 Technical',
  L2_TECHNICAL: 'L2 Technical',
  HR_ROUND: 'HR Round',
};
const STATUS_LABELS = {
  PROFILING_COMPLETED: 'Profiling Completed',
  IN_PROGRESS: 'In Progress',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
};
const JOB_TYPES = { FULL_TIME: 'Full-time', CONTRACT: 'Contract', REMOTE: 'Remote' };
const SOURCES = {
  LINKEDIN: 'LinkedIn',
  NAUKRI: 'Naukri',
  REFERRAL: 'Referral',
  CAREER_SITE: 'Career site',
  OTHER: 'Other',
};
const HOME_FOR_ROLE = {
  HR: 'hr-dashboard.html',
  PANEL: 'panel-dashboard.html',
  CANDIDATE: 'my-status.html',
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function saveLogin({ token, user }) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// Sends the user to login (and back here afterwards) if they lack one of the roles
function requireRole(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    window.location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw new Error('Not logged in');
  }
  // Logged in with a temporary password: choose a new one before anything else
  if (user.mustChangePassword && !location.pathname.endsWith('/change-password.html')) {
    window.location.href = '/change-password.html';
    throw new Error('Password change required');
  }
  return user;
}

// api('/jobs')  or  api('/jobs', { method: 'POST', body: {...} })
async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: isForm ? body : body && JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Is it running?');
  }
  const data = await res.json().catch(() => null);

  if (res.status === 401 && token) logout(); // token expired
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.details = data?.details;
    throw err;
  }
  return data;
}

// The resume needs the login token, so download it with fetch and open it in a new tab
async function openResume(candidateId) {
  const res = await fetch(`${API_BASE}/candidates/${candidateId}/resume`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Could not open the resume');
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}

// ALWAYS escape text from the server before putting it into HTML (stops XSS).
// Quotes are escaped too, so it is also safe inside attributes like data-name="...".
function esc(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (ch) => map[ch]);
}

function formatDate(value, withTime = true) {
  const options = withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' };
  return new Date(value).toLocaleString('en-IN', options);
}

function formatLpa(amount) {
  return `${(amount / 100000).toFixed(1).replace(/\.0$/, '')} LPA`;
}

function formatMoney(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// "Riya Sharma" -> "RS"
function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
