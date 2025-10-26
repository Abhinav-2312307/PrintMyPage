const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location_code: { type: String, required: true }, // e.g., "AA37"
  contact_number: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, sparse: true }, // ✨ ADD THIS LINE (unique + sparse allows null/missing emails but requires unique ones if present)
  is_active: { type: Boolean, default: true }
});

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;