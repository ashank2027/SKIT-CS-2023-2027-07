const express = require('express');
const calculatorController = require('../controllers/calculatorController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);
router.post('/', calculatorController.calculate);

module.exports = router;
