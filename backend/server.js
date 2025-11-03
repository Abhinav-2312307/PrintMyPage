// Load environment variables
require('dotenv').config();
const admin = require('./firebaseAdminConfig'); // Your Firebase Admin config
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;
const { PDFDocument } = require('pdf-lib');
const sendEmail = require('./utils/sendEmail');
const multer = require('multer');

// --- Models ---
const Order = require('./models/orderModel.js');
const Supplier = require('./models/supplierModel.js');
const User = require('./models/userModel.js');

// --- Service Initializations ---
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- App & Middleware Setup ---
const app = express();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.SUPPLIER_FRONTEND_URL,
    'http://localhost:5500',
    'http://localhost:5501'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed) || origin.startsWith('http://localhost'))) {
        return callback(null, true);
    }
    const msg = `CORS policy does not allow access from Origin: ${origin}`;
    console.error('CORS Error:', msg);
    return callback(new Error(msg), false);
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Multer Configuration ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Constants & Helpers ---
const priceChart = { bw: 2, color: 5, glossy: 15, a4: 1.5 };
const PORT = process.env.PORT || 5001;
function generateOrderID() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `ORDER-${timestamp}-${randomStr}`.toUpperCase();
}

// --- ✨ NEW FIREBASE AUTH MIDDLEWARE ✨ ---
const firebaseAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const localUser = await User.findOne({ firebaseUid: decodedToken.uid });
        if (!localUser) {
            console.warn(`Verified Firebase user ${decodedToken.uid} has no profile in our DB.`);
            return res.status(404).json({ message: 'User profile not found. Please complete registration.', code: 'PROFILE_NOT_FOUND' });
        }
        req.user = localUser; // Attach our *local MongoDB user object*
        next();
    } catch (error) {
        console.error('Firebase token verification error:', error);
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas! ✅');
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT} 🚀`);
    });
  })
  .catch((err) => { console.error('Database connection error: ❌', err); process.exit(1); });

// --- API ROUTES ---

// --- ✨ NEW AUTH ROUTE ✨ ---
// Called by frontend *after* Firebase registration
app.post('/api/auth/create-profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided.' });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebaseUid = decodedToken.uid;
        
        const { name, rollNumber, branch, section, contactNo } = req.body;

        let user = await User.findOne({ firebaseUid: firebaseUid });
        if (user) {
            console.log(`Updating profile for existing user: ${firebaseUid}`);
            user.name = name;
            user.rollNumber = rollNumber;
            user.branch = branch;
            user.section = section;
            user.contactNo = contactNo;
            user.email = decodedToken.email;
            await user.save();
            res.status(200).json({ message: 'User profile updated!', user: user });
        } else {
            console.log(`Creating new profile for user: ${firebaseUid}`);
            const rollExists = await User.findOne({ rollNumber: rollNumber });
            if (rollExists) return res.status(400).json({ message: 'This Roll Number is already registered.' });
            const emailExists = await User.findOne({ email: decodedToken.email });
            if (emailExists) return res.status(400).json({ message: 'This Email is already registered.' });
            
            user = new User({
                firebaseUid: firebaseUid,
                name,
                rollNumber,
                email: decodedToken.email,
                branch,
                section,
                contactNo,
                profilePictureUrl: decodedToken.picture || ''
            });
            await user.save();
            res.status(201).json({ message: 'User profile created successfully!', user: user });
        }
    } catch (error) {
        console.error('Error creating/updating user profile:', error);
        if (error.code === 11000) {
             return res.status(400).json({ message: 'Email or Roll Number already in use.' });
        }
        res.status(500).json({ message: 'Error creating/updating profile.' });
    }
});


// --- PROTECTED ROUTES (USING NEW MIDDLEWARE) ---

// ROUTE 1: GET ALL SUPPLIERS (Public)
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ is_active: true }).select('name location_code');
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

// ROUTE: HANDLE IMMEDIATE FILE UPLOAD (Protected)
app.post('/api/upload-file', firebaseAuthMiddleware, upload.single('documentFile'), async (req, res) => {
    try {
        console.log(`[DEBUG /api/upload-file] Route hit. req.file exists? ${!!req.file}`);
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        let detectedPageCount = 0;
        const fileType = req.file.mimetype;
        let requiresManualPages = false;
        let countError = null;

        if (fileType === 'application/pdf') {
            try {
                const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
                detectedPageCount = pdfDoc.getPageCount();
                if (detectedPageCount === 0) {
                     requiresManualPages = true; countError = 'Could not read page count from PDF.';
                }
            } catch (pdfError) {
                requiresManualPages = true;
                countError = 'Could not read PDF file (may be encrypted/corrupted).';
            }
        } else if (fileType.startsWith('image/')) {
            detectedPageCount = 1;
        } else {
            requiresManualPages = true;
            countError = 'Automatic page counting not supported for this file type.';
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: "raw", folder: "printmypage_uploads" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.status(200).json({
            success: true, message: 'File uploaded successfully.',
            fileUrl: uploadResult.secure_url, originalFilename: req.file.originalname,
            detectedPageCount: detectedPageCount, requiresManualPages: requiresManualPages, countErrorMessage: countError
        });

    } catch (error) {
        console.error('[Upload] File upload error:', error);
        res.status(500).json({ success: false, message: 'Server error during file upload.' });
    }
});

// ROUTE 2: PLACE A NEW ORDER (Protected)
app.post('/api/place-order', firebaseAuthMiddleware, async (req, res) => {
  let orderIdForLogging = 'N/A';
  try {
    const { printType, copies, duplex, paperSize, cloudinaryUrl, originalFilename, detectedPageCountResult, supplier_id } = req.body;
    orderIdForLogging = generateOrderID();
    if (!cloudinaryUrl || !originalFilename || !printType || !supplier_id) {
        return res.status(400).json({ message: 'Missing required order details or file upload.' });
    }
    const finalPageCount = parseInt(detectedPageCountResult, 10);
    if (isNaN(finalPageCount) || finalPageCount <= 0) {
        return res.status(400).json({ message: 'Invalid page count provided.' });
    }
    const numCopies = parseInt(copies, 10) || 1;
    const isDuplex = (duplex === 'true');
    const selectedPaperSize = paperSize || 'A4';
    const pricePerPage = priceChart[printType];
    if (!pricePerPage) { return res.status(400).json({ message: 'Invalid print type.' }); }
    let totalPrice = pricePerPage * finalPageCount * numCopies;
    totalPrice = parseFloat(totalPrice.toFixed(2));
    
    const customer = req.user; // Get user from middleware
    if (!customer) {
        return res.status(404).json({ message: 'Customer profile not found.' });
    }
    
    let orderSupplierId = null;
    let orderBroadcastStatus = 'none';
    if (supplier_id === 'anyone') {
        orderBroadcastStatus = 'pending';
    } else {
        orderSupplierId = supplier_id;
    }
    
    const orderToSave = new Order({
      user: req.user._id,
      orderId: orderIdForLogging,
      customerDetails: {
          name: customer.name, branch: customer.branch, section: customer.section,
          rollNumber: customer.rollNumber, contactNo: customer.contactNo
      },
      printDetails: {
          printType, pageCount: finalPageCount, totalPrice,
          copies: numCopies, duplex: isDuplex, paperSize: selectedPaperSize
      },
      fileDetails: { originalFilename, storedPath: cloudinaryUrl },
      supplier: orderSupplierId,
      broadcastStatus: orderBroadcastStatus
    });

    let savedOrder;
    try {
        savedOrder = await orderToSave.save();
    } catch (saveError) {
        console.error(`[DEBUG]!!! Failed to save order ${orderToSave.orderId} to database !!!`, saveError);
        return res.status(500).json({ message: 'Database error saving order.' });
    }

    // Send response FIRST
    res.status(201).json({ message: 'Order placed successfully!', orderId: savedOrder.orderId });

    // --- Send Notifications (Async) ---
    (async () => {
        try {
            if (customer.email) {
                await sendEmail({
                     email: customer.email,
                     subject: `📄 Your PrintMyPage Order (${savedOrder.orderId}) Placed!`,
                     html: `<p>Hi ${customer.name},...` // Truncated
                });
            }
        } catch (emailError) { console.error(`Failed to send 'Order Placed' email for ${savedOrder.orderId}:`, emailError); }

        if (orderBroadcastStatus === 'pending') {
            try {
                const activeSuppliers = await Supplier.find({ is_active: true, email: { $exists: true, $ne: null } });
                for (const supplier of activeSuppliers) {
                     await sendEmail({
                        email: supplier.email,
                        subject: `📢 New Broadcast Order Available: ${savedOrder.orderId}`,
                        html: `<p>Hi ${supplier.name},...` // Truncated
                     });
                }
            } catch (emailError) {
                 console.error(`Failed to send broadcast notification emails for ${savedOrder.orderId}:`, emailError);
            }
        }
    })();
    // -------------------------

  } catch (error) {
    console.error(`Outer error in place order route (Order ID: ${orderIdForLogging}):`, error);
    if (!res.headersSent) {
        res.status(500).json({ message: 'Error placing order', error: error.message });
    }
  }
});

// --- SUPPLIER PORTAL ROUTES (Not protected by Firebase user auth) ---
app.post('/api/supplier/login', async (req, res) => { /* Your existing supplier login logic */ });
app.get('/api/supplier/orders/:supplierId', async (req, res) => { /* Your existing get supplier orders logic */ });
app.post('/api/supplier/accept-broadcast/:orderId', async (req, res) => { /* Your existing accept broadcast logic (with async email) */ });
app.put('/api/supplier/orders/:orderId', async (req, res) => { /* Your existing update status logic (with async email) */ });

// --- PROTECTED CUSTOMER ROUTES (Using new middleware) ---
app.get('/api/my-orders', firebaseAuthMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
                              .populate('supplier', 'name location_code contact_number')
                              .sort({ orderDate: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching my-orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/order/remark/:orderId', firebaseAuthMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerRemark } = req.body;
    if (!customerRemark) { return res.status(400).json({ message: 'Remark cannot be empty.' }); }
    const order = await Order.findOne({ orderId: orderId, user: req.user._id });
    if (!order) { return res.status(404).json({ message: 'Order not found or access denied.' }); }
    if (order.orderStatus !== 'completed') { return res.status(400).json({ message: 'Can only add remark to completed orders.' }); }
    order.customerRemark = customerRemark;
    await order.save();
    res.status(200).json({ message: 'Remark added successfully.' });
  } catch (error) {
    console.error('Remark add error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// --- RAZORPAY PAYMENT ROUTES (Protected) ---
app.post('/api/payment/create-order', firebaseAuthMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId: orderId, user: req.user._id });
    if (!order) { return res.status(404).json({ message: 'Order not found.' }); }
    if (order.paymentStatus === 'paid') { return res.status(400).json({ message: 'This order is already paid.'}); }
    const options = {
      amount: order.printDetails.totalPrice * 100, currency: "INR", receipt: order.orderId, notes: { customer_roll_no: order.customerDetails.rollNumber }
    };
    const razorpayOrder = await razorpay.orders.create(options);
    res.status(200).json({
      success: true, orderId: razorpayOrder.id, amount: razorpayOrder.amount, key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ message: 'Server error while creating payment order.' });
  }
});

// --- RAZORPAY WEBHOOK (Public, NO middleware) ---
app.post('/api/payment/verification', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers['x-razorpay-signature'];
  try {
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');
    if (digest !== razorpaySignature) {
      console.warn('Webhook signature mismatch!');
      return res.status(400).json({ status: 'invalid signature' });
    }
    console.log('Webhook signature verified successfully.');

    const eventType = req.body.event;
    if (eventType !== 'order.paid') {
      console.log(`Received unhandled event: ${eventType}. Ignoring.`);
      return res.status(200).json({ status: 'ok, event unhandled' });
    }
    const orderEntity = req.body.payload.order.entity;
    const receipt_id = orderEntity.receipt;
    console.log(`--- DEBUG: Received Receipt ID from Razorpay: [${receipt_id}] ---`);
    const order = await Order.findOne({ orderId: receipt_id });
    if (order) {
      order.paymentStatus = 'paid';
      order.orderStatus = 'printing';
      await order.save();
      console.log(`Payment confirmed for order: ${receipt_id}`);
      
      res.status(200).json({ status: 'ok' }); // Respond FIRST

      // --- Send Notifications (Async) ---
      (async () => {
          try {
              const fullOrder = await Order.findById(order._id)
                                           .populate('user', 'name email')
                                           .populate('supplier', 'name email contactNo');
              if (fullOrder?.user?.email) {
                   await sendEmail({
                       email: fullOrder.user.email,
                       subject: `💰 Payment Received for Order ${fullOrder.orderId}!`,
                       html: `<p>Hi ${fullOrder.user.name},...` // Truncated
                   });
              }
              if (fullOrder?.supplier?.email) {
                   await sendEmail({
                       email: fullOrder.supplier.email,
                       subject: `💳 Payment Received - New Print Job (Order ${fullSorder.orderId})`,
                       html: `<p>Hi ${fullOrder.supplier.name},...<br><strong>Contact:</strong> ${fullOrder.customerDetails.contactNo}</p>...` // Truncated
                   });
              }
          } catch (emailError) {
               console.error("Failed to send payment confirmation emails:", emailError);
          }
      })();
    } else {
      console.log(`--- ERROR: Could not find an order with orderId: [${receipt_id}] ---`);
       if (!res.headersSent) res.status(200).json({ status: 'ok' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    if (!res.headersSent) res.status(500).json({ status: 'error' });
  }
});

// --- PROFILE ROUTES (Protected) ---
app.get('/api/profile', firebaseAuthMiddleware, async (req, res) => {
    try {
        // req.user is the full user doc from our DB
        res.status(200).json(req.user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

app.put('/api/profile', firebaseAuthMiddleware, async (req, res) => {
    try {
        const { name, branch, section, contactNo, email } = req.body;
        if (!name || !branch || !section || !contactNo || !email) {
             return res.status(400).json({ message: 'Please fill all required fields.' });
        }
        if (email !== req.user.email) {
            const emailExists = await User.findOne({ email: email });
            if (emailExists) return res.status(400).json({ message: 'Email already in use.' });
        }
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { name, branch, section, contactNo, email },
            { new: true, runValidators: true }
        );
        res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 11000) return res.status(400).json({ message: 'Email or Roll Number already in use.' });
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

app.post('/api/profile/picture', firebaseAuthMiddleware, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "printmypage_profilepics" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profilePictureUrl: uploadResult.secure_url },
            { new: true }
        );
        res.status(200).json({ message: 'Profile picture updated!', profilePictureUrl: user.profilePictureUrl });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ message: 'Server error uploading picture.' });
    }
});
// --- End of Routes ---