const router = require('express').Router();
const controller = require('../controllers/menuItemController');
const { validateId, validateBody } = require('../middleware/validation');
const body = validateBody({ name: 'string', price: 'number', available: 'boolean', category: 'string', restaurant: 'string' });

router.route('/').get(controller.getAll).post(body, controller.create);
router.route('/:id').all(validateId).get(controller.getById).put(body, controller.replace).delete(controller.remove);
module.exports = router;
