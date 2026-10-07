const express = require('express');
const calculatorController = require('../controllers/calculatorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/', calculatorController.calculate);

module.exports = router;
