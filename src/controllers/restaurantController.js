const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { httpError } = require('../middleware/validation');

exports.getAll = async (req, res) => {
  res.json(await Restaurant.find().sort({ name: 1 }));
};

exports.getById = async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) throw httpError(404, 'Restaurant not found.');
  res.json(restaurant);
};

exports.create = async (req, res) => {
  const restaurant = await Restaurant.create(req.body);
  res.location(`/api/restaurants/${restaurant.id}`).status(201).json(restaurant);
};

exports.replace = async (req, res) => {
  const restaurant = await Restaurant.findOneAndReplace(
    { _id: req.params.id }, req.body, { returnDocument: 'after', runValidators: true }
  );
  if (!restaurant) throw httpError(404, 'Restaurant not found.');
  res.json(restaurant);
};

exports.remove = async (req, res) => {
  if (!await Restaurant.exists({ _id: req.params.id })) throw httpError(404, 'Restaurant not found.');
  // Keep existing menu items from becoming orphaned during the demo workflow.
  if (await MenuItem.exists({ restaurant: req.params.id })) {
    throw httpError(409, 'Delete this restaurant’s menu items before deleting the restaurant.');
  }
  const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
  if (!restaurant) throw httpError(404, 'Restaurant not found.');
  res.status(204).end();
};
