const mongoose = require('mongoose');

// A restaurant has menu items through MenuItem.restaurant.
const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  cuisine: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  rating: { type: Number, required: true, min: 0, max: 5 },
  isOpen: { type: Boolean, required: true },
  openedOn: { type: Date, required: true },
}, {
  strict: 'throw',
  toJSON: { virtuals: true, transform: (doc, result) => { delete result.id; return result; } },
});

// Reverse relationship derived from MenuItem.restaurant, without duplicate IDs.
restaurantSchema.virtual('menuItems', {
  ref: 'MenuItem',
  localField: '_id',
  foreignField: 'restaurant',
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
