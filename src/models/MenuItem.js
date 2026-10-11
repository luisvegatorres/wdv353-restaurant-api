const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  price: { type: Number, required: true, min: 0, max: 1000 },
  available: { type: Boolean, required: true },
  category: { type: String, required: true, enum: ['starter', 'main', 'dessert', 'drink'] },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
}, { strict: 'throw', versionKey: false });

module.exports = mongoose.model('MenuItem', menuItemSchema);
