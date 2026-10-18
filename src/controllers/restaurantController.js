const { listQuery, paginationHeaders } = require('../utils/listQuery');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { httpError } = require('../middleware/validation');
const Messages = require('../messages');

function display(query) {
  return query.select('-__v').populate({ path: 'menuItems', select: '-__v', options: { sort: { name: 1 } } });
}

exports.getAll = async (req, res) => {
  // Range filtering uses $gte and $lte; selection, sorting and paging run in MongoDB.
  const options = listQuery(req.query, {
    field: 'rating', minKey: 'minRating', maxKey: 'maxRating', min: 0, max: 5,
    fields: ['name', 'cuisine', 'rating', 'isOpen', 'openedOn', 'menuItems'],
  });
  let query = Restaurant.find(options.filter).select(options.projection)
    .sort(options.sort).skip(options.skip).limit(options.limit);
  if (!options.excluded.includes('menuItems')) query = query.populate({ path: 'menuItems', select: '-__v', options: { sort: { name: 1 } } });
  const [data, total] = await Promise.all([query.exec(), Restaurant.countDocuments(options.filter)]);
  paginationHeaders(res, options, total);
  res.json(data);
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
