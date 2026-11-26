const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/jobs', require('./jobRoutes'));
router.use('/candidates', require('./candidateRoutes'));
router.use('/panels', require('./panelRoutes'));
router.use('/interviews', require('./interviewRoutes'));

module.exports = router;
