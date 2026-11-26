const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const s = require('../validators/schemas');
const interviewService = require('../services/interviewService');
const { parseId } = require('../utils/helpers');

router.use(authenticate, authorize('PANEL'));

router.get('/mine', async (req, res) => {
  res.json(await interviewService.listInterviewsForPanel(req.user.id));
});

router.post('/:id/feedback', validate(s.feedbackSchema), async (req, res) => {
  const feedback = await interviewService.submitFeedback(
    parseId(req.params.id),
    req.user.id,
    req.validated,
  );
  res.status(201).json(feedback);
});

module.exports = router;
