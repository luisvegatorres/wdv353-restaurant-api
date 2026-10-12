const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { httpError } = require('../middleware/validation');
const Messages = require('../messages');

function display(query) {
  return query.select('-__v').populate({ path: 'menuItems', select: '-__v', options: { sort: { name: 1 } } });
}

exports.getAll = async (req, res) => {
  res.json(await display(Restaurant.find().sort({ name: 1 })));
};

exports.getById = async (req, res) => {
  const restaurant = await display(Restaurant.findById(req.params.id));
  if (!restaurant) throw httpError(404, Messages.RESTAURANT_NOT_FOUND);
  res.json(restaurant);
};

exports.create = async (req, res) => {
  const restaurant = await Restaurant.create(req.body);
  res.location(`/api/restaurants/${restaurant._id}`).status(201).json(await display(Restaurant.findById(restaurant._id)));
};

exports.replace = async (req, res) => {
  if (!await Restaurant.exists({ _id: req.params.id })) throw httpError(404, Messages.RESTAURANT_NOT_FOUND);
  const restaurant = await display(Restaurant.findOneAndReplace(
    { _id: req.params.id }, req.body, { returnDocument: 'after', runValidators: true }
  ));
  if (!restaurant) throw httpError(404, Messages.RESTAURANT_NOT_FOUND);
  res.json(restaurant);
};

exports.remove = async (req, res) => {
  if (!await Restaurant.exists({ _id: req.params.id })) throw httpError(404, Messages.RESTAURANT_NOT_FOUND);
  // Keep existing menu items from becoming orphaned during the demo workflow.
  if (await MenuItem.exists({ restaurant: req.params.id })) {
    throw httpError(409, Messages.RESTAURANT_HAS_ITEMS);
  }
  const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
  if (!restaurant) throw httpError(404, Messages.RESTAURANT_NOT_FOUND);
  res.status(204).end();
};
