const express = require('express');
const categoryController = require('../controllers/categoryController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/', categoryController.getAllCategories);

module.exports = router;
