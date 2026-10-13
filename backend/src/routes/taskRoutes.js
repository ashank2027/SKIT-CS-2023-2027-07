const express = require('express');
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All task routes require authentication
router.use(protect);

router.route('/')
  .post(taskController.createTask)
  .get(taskController.getTasks);

router.route('/:id')
  .get(taskController.getTaskById);

router.route('/:id/status')
  .get(taskController.getTaskStatus)
  .patch(taskController.updateTaskStatus);

module.exports = router;
