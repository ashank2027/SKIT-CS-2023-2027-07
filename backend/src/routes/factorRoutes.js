const express = require('express');
const factorController = require('../controllers/factorController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', factorController.getAllFactors);

module.exports = router;
