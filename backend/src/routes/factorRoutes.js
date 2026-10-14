const express = require('express');
const factorController = require('../controllers/factorController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/', factorController.getAllFactors);

module.exports = router;
