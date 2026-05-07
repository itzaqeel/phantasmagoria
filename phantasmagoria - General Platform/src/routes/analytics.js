const express = require('express');
const router  = express.Router();
const { verifyApiToken, requirePermission } = require('../security/auth');
const analyticsController = require('../controllers/analyticsController');

router.get('/skills-gap',             verifyApiToken, requirePermission('read:analytics'), analyticsController.skillsGap);
router.get('/employment-by-industry', verifyApiToken, requirePermission('read:analytics'), analyticsController.employmentByIndustry);
router.get('/top-job-titles',         verifyApiToken, requirePermission('read:analytics'), analyticsController.topJobTitles);
router.get('/top-employers',          verifyApiToken, requirePermission('read:analytics'), analyticsController.topEmployers);
router.get('/geographic',             verifyApiToken, requirePermission('read:analytics'), analyticsController.geographic);

module.exports = router;
