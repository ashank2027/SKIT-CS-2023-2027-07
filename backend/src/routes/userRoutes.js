const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all routes below

router.route('/me')
  .get(userController.getMe)
  .put(userController.updateMe);

module.exports = router;
