const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const s = require('../validators/schemas');
const panelService = require('../services/panelService');
const { parseId } = require('../utils/helpers');

router.use(authenticate, authorize('HR')); // whole file is HR-only

router.post('/', validate(s.panelSchema), async (req, res) => {
  res.status(201).json(await panelService.createPanel(req.validated));
});

router.get('/', async (req, res) => {
  res.json(await panelService.listPanels({ activeOnly: req.query.active === 'true' }));
});

// Activate (first time) or resend login details: emails login email + temporary password
router.post('/:id/activate', async (req, res) => {
  res.json(await panelService.sendLoginDetails(parseId(req.params.id)));
});

module.exports = router;
