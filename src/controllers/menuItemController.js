const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { httpError } = require('../middleware/validation');

async function checkRestaurant(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, 'restaurant must be a valid ObjectId.');
  if (!await Restaurant.exists({ _id: id })) throw httpError(404, 'Related restaurant not found.');
}

exports.getAll = async (req, res) => {
  res.json(await MenuItem.find().populate('restaurant').sort({ name: 1 }));
};

exports.getById = async (req, res) => {
  const item = await MenuItem.findById(req.params.id).populate('restaurant');
  if (!item) throw httpError(404, 'Menu item not found.');
  res.json(item);
};

exports.create = async (req, res) => {
  await checkRestaurant(req.body.restaurant);
  const item = await MenuItem.create(req.body);
  res.location(`/api/menu-items/${item.id}`).status(201).json(item);
};

exports.replace = async (req, res) => {
  if (!await MenuItem.exists({ _id: req.params.id })) throw httpError(404, 'Menu item not found.');
  await checkRestaurant(req.body.restaurant);
  const item = await MenuItem.findOneAndReplace(
    { _id: req.params.id }, req.body, { returnDocument: 'after', runValidators: true }
  );
  if (!item) throw httpError(404, 'Menu item not found.');
  res.json(item);
};

exports.remove = async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw httpError(404, 'Menu item not found.');
  res.status(204).end();
};
