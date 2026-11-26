const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const s = require('../validators/schemas');
const jobService = require('../services/jobService');
const { parseId } = require('../utils/helpers');

// Public: homepage job list
router.get('/', async (_req, res) => {
  res.json(await jobService.listOpenJobs());
});

// HR: every job, including closed ones, with applicant counts
router.get('/all', authenticate, authorize('HR'), async (_req, res) => {
  res.json(await jobService.listAllJobs());
});

router.get('/:id', async (req, res) => {
  res.json(await jobService.getJob(parseId(req.params.id)));
});

// HR only
router.post('/', authenticate, authorize('HR'), validate(s.jobSchema), async (req, res) => {
  res.status(201).json(await jobService.createJob(req.validated, req.user.id));
});

router.put('/:id', authenticate, authorize('HR'), validate(s.jobSchema), async (req, res) => {
  res.json(await jobService.updateJob(parseId(req.params.id), req.validated));
});

router.patch('/:id/close', authenticate, authorize('HR'), async (req, res) => {
  res.json(await jobService.setJobOpen(parseId(req.params.id), false));
});

router.patch('/:id/reopen', authenticate, authorize('HR'), async (req, res) => {
  res.json(await jobService.setJobOpen(parseId(req.params.id), true));
});

module.exports = router;
