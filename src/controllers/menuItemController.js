const { listQuery, paginationHeaders } = require('../utils/listQuery');
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { httpError } = require('../middleware/validation');
const Messages = require('../messages');

function display(query) {
  return query.select('-__v').populate({ path: 'restaurant', select: '-__v' });
}

async function checkRestaurant(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(400, Messages.INVALID_RESTAURANT_ID);
  if (!await Restaurant.exists({ _id: id })) throw httpError(404, Messages.RELATED_RESTAURANT_NOT_FOUND);
}

exports.getAll = async (req, res) => {
  // Range filtering uses $gte and $lte; selection, sorting and paging run in MongoDB.
  const options = listQuery(req.query, {
    field: 'price', minKey: 'minPrice', maxKey: 'maxPrice', min: 0, max: 1000,
    fields: ['name', 'price', 'available', 'category', 'restaurant'],
  });
  let query = MenuItem.find(options.filter).select(options.projection)
    .sort(options.sort).skip(options.skip).limit(options.limit);
  if (!options.excluded.includes('restaurant')) query = query.populate({ path: 'restaurant', select: '-__v' });
  const [data, total] = await Promise.all([query.exec(), MenuItem.countDocuments(options.filter)]);
  paginationHeaders(res, options, total);
  res.json(data);
};

exports.getById = async (req, res) => {
  const item = await display(MenuItem.findById(req.params.id));
  if (!item) throw httpError(404, Messages.MENU_ITEM_NOT_FOUND);
  res.json(item);
};

exports.create = async (req, res) => {
  await checkRestaurant(req.body.restaurant);
  const item = await MenuItem.create(req.body);
  res.location(`/api/menu-items/${item.id}`).status(201).json(await display(MenuItem.findById(item.id)));
};

exports.replace = async (req, res) => {
  if (!await MenuItem.exists({ _id: req.params.id })) throw httpError(404, Messages.MENU_ITEM_NOT_FOUND);
  await checkRestaurant(req.body.restaurant);
  const item = await display(MenuItem.findOneAndReplace(
    { _id: req.params.id }, req.body, { returnDocument: 'after', runValidators: true }
  ));
  if (!item) throw httpError(404, Messages.MENU_ITEM_NOT_FOUND);
  res.json(item);
};

exports.remove = async (req, res) => {
  if (!await MenuItem.exists({ _id: req.params.id })) throw httpError(404, Messages.MENU_ITEM_NOT_FOUND);
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) throw httpError(404, Messages.MENU_ITEM_NOT_FOUND);
  res.status(204).end();
};
