const express = require('express');
const emissionController = require('../controllers/emissionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(emissionController.getEmissions)
  .post(emissionController.createEmission);

router.route('/:id')
  .get(emissionController.getEmission)
  .put(emissionController.updateEmission)
  .delete(emissionController.deleteEmission);

module.exports = router;
