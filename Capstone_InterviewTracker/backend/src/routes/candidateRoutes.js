const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { uploadResume } = require('../middlewares/upload');
const s = require('../validators/schemas');
const candidateService = require('../services/candidateService');
const stageService = require('../services/stageService');
const interviewService = require('../services/interviewService');
const { parseId } = require('../utils/helpers');

router.use(authenticate); // every candidate API needs login

// Candidate applies (or HR creates a profile). Form field for the file: "resume"
router.post(
  '/',
  authorize('HR', 'CANDIDATE'),
  uploadResume,
  validate(s.candidateSchema),
  async (req, res) => {
    const candidate = await candidateService.createProfile(req.validated, req.file, req.user);
    res.status(201).json(candidate);
  },
);

// HR: search + filter, e.g. /api/candidates?stage=L1_TECHNICAL&jobId=2&search=riya
router.get('/', authorize('HR'), validate(s.candidateFilterSchema, 'query'), async (req, res) => {
  res.json(await candidateService.listCandidates(req.validated));
});

// HR: counts per stage and status for the dashboard
router.get('/stats', authorize('HR'), async (_req, res) => {
  res.json(await candidateService.getStats());
});

// Candidate: my stage, status and interview schedule (no feedback)
router.get('/me', authorize('CANDIDATE'), async (req, res) => {
  res.json(await candidateService.getMyProfile(req.user));
});

router.get('/:id', authorize('HR', 'PANEL'), async (req, res) => {
  res.json(await candidateService.getCandidate(parseId(req.params.id), req.user));
});

router.get('/:id/resume', authorize('HR', 'PANEL', 'CANDIDATE'), async (req, res) => {
  res.sendFile(await candidateService.getResumePath(parseId(req.params.id), req.user));
});

// ---- HR controls the workflow ----
router.post('/:id/next-stage', authorize('HR'), async (req, res) => {
  res.json(await stageService.moveToNextStage(parseId(req.params.id)));
});

router.post('/:id/reject', authorize('HR'), validate(s.commentsSchema), async (req, res) => {
  res.json(await stageService.reject(parseId(req.params.id), req.validated.comments));
});

router.post(
  '/:id/final-decision',
  authorize('HR'),
  validate(s.decisionSchema),
  async (req, res) => {
    res.json(await stageService.finalDecision(parseId(req.params.id), req.validated));
  },
);

router.post('/:id/interviews', authorize('HR'), validate(s.interviewSchema), async (req, res) => {
  const interview = await interviewService.scheduleInterview(parseId(req.params.id), req.validated);
  res.status(201).json(interview);
});

module.exports = router;
