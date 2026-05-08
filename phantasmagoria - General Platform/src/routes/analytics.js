const express = require('express');
const router  = express.Router();
console.log('[ROUTER] Analytics router initialized');
const { verifyApiToken, requirePermission } = require('../security/auth');
const analyticsController = require('../controllers/analyticsController');

router.get('/test', (req, res) => res.json({ success: true, message: 'Analytics router is working!' }));
router.get('/overview',                verifyApiToken, requirePermission('read:analytics'), analyticsController.overview);
router.get('/skills-gap',             verifyApiToken, requirePermission('read:analytics'), analyticsController.skillsGap);
router.get('/employment-by-industry', verifyApiToken, requirePermission('read:analytics'), analyticsController.employmentByIndustry);
router.get('/top-job-titles',         verifyApiToken, requirePermission('read:analytics'), analyticsController.topJobTitles);
router.get('/top-employers',          verifyApiToken, requirePermission('read:analytics'), analyticsController.topEmployers);
router.get('/geographic',             verifyApiToken, requirePermission('read:analytics'), analyticsController.geographic);
router.get('/alumni',                     verifyApiToken, requirePermission('read:alumni'),    analyticsController.alumniList);
router.get('/alumni-filter-options',      verifyApiToken, requirePermission('read:alumni'),    analyticsController.filterOptions);
router.get('/alumni/:id',                 verifyApiToken, requirePermission('read:alumni'),    analyticsController.alumniProfile);
router.get('/employed-vs-unemployed',     verifyApiToken, requirePermission('read:alumni'),    analyticsController.employedVsUnemployed);

router.get('/system-status', verifyApiToken, (req, res) => {
    res.json({
        success: true,
        token_name: req.apiToken.token_name,
        permissions: req.apiToken.permissions
    });
});

module.exports = router;

