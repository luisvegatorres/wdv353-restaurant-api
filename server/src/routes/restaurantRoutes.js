const router = require('express').Router();
const controller = require('../controllers/restaurantController');
const { validateId, validateBody } = require('../middleware/validation');
const body = validateBody({ name: 'string', cuisine: 'string', rating: 'number', isOpen: 'boolean', openedOn: 'string' });

router.route('/').get(controller.getAll).post(body, controller.create);
router.route('/:id').all(validateId).get(controller.getById).put(body, controller.replace).delete(controller.remove);
module.exports = router;
