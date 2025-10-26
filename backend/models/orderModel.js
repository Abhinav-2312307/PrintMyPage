const mongoose = require('mongoose');

// NEW, more detailed order statuses
const orderStatusEnum = [
  'pending',         // Customer just placed it
  'accepted',        // Supplier accepted, customer hasn't paid
  'awaiting-payment',// Customer has been notified to pay
  'printing',        // Customer paid, supplier is working
  'completed',       // All done
  'rejected'         // Supplier cannot fulfill
];

const paymentStatusEnum = ['unpaid', 'paid', 'refunded'];

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true, unique: true },
  orderDate: { type: Date, default: Date.now },
  
  // --- NEW FIELDS ---
  orderStatus: { type: String, enum: orderStatusEnum, default: 'pending' },
  paymentStatus: { type: String, enum: paymentStatusEnum, default: 'unpaid' },
  customerRemark: { type: String, trim: true },
  supplierRemark: { type: String, trim: true },
  // ------------------

  customerDetails: {
    name: { type: String, required: true },
    branch: { type: String },
    section: { type: String },
    // academicYear: { type: Number },
    rollNumber: { type: String },
    contactNo: { type: String }
  },

  printDetails: {
    printType: { type: String, required: true },
    pageCount: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    // --- ✨ ADD THESE FIELDS ---
    copies: { type: Number, default: 1 },
    duplex: { type: Boolean, default: false }, // false = single-sided, true = double-sided
    paperSize: { type: String, default: 'A4' }
    // -------------------------
  },
  fileDetails: {
    originalFilename: { type: String, required: true },
    storedPath: { type: String, required: true }
  },
  
  supplier: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier',
    required: false
  },
  broadcastStatus: {
    type: String,
    enum: ['none', 'pending', 'accepted'], // 'none' for direct assign, 'pending' for broadcast, 'accepted' when claimed
    default: 'none'
  }
});

// We'll create an index to help find orders by their custom ID
// orderSchema.index({ orderId: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;