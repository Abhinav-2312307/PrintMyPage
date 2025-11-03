// // Load environment variables from our .env file
// require('dotenv').config();
// // --- DEBUG LOG ---
// console.log('--- DEBUG: CHECKING ENV VARIABLES ---');
// console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
// console.log('RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET);
// console.log('-----------------------------------');
// // --- END DEBUG LOG ---
// const verifyERPLogin = require('./utils/verifyERP');
// const Razorpay = require('razorpay');
// const crypto = require('crypto'); // for security in webhook
// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // Import necessary packages
// const cloudinary = require('cloudinary').v2;
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });
// const { PDFDocument } = require('pdf-lib');
// const sendEmail = require('./utils/sendEmail'); // <<<<< MAKE SURE THIS IS CORRECT
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const multer = require('multer'); // For handling file uploads
// const path = require('path');   // For working with file paths
// const fs = require('fs');     // For working with the file system
// // const mime = require('mime-types'); // No longer needed for download route
// const bcrypt = require('bcrypt');
// // --- Import our new models ---
// const Order = require('./models/orderModel.js');
// const Supplier = require('./models/supplierModel.js');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
// const User = require('./models/userModel'); // Our new User model

// // Create an Express application
// const app = express();

// // Configure CORS
// // app.use(cors({
// //   origin: process.env.FRONTEND_URL || 'http://localhost:5500' , // Uses Render variable OR fallback
// //   credentials: true
// // }));
// // Configure CORS to allow multiple origins
// const allowedOrigins = [
//     process.env.FRONTEND_URL,         // Your main customer frontend (e.g., https://printmypage.netlify.app)
//     process.env.SUPPLIER_FRONTEND_URL, // Your new supplier frontend (e.g., https://pmpsupplierportal.netlify.app)
//     'http://localhost:5500',          // Your local customer frontend (optional, for testing)
//     'http://localhost:5501'           // Your local supplier frontend (optional, for testing - adjust port if needed)
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests) OR requests from localhost during development
//     if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed) || origin.startsWith('http://localhost'))) {
//          // A simplified check allowing localhost regardless of port for easier local dev
//          // In stricter production, you might only allow specific localhost ports listed in allowedOrigins
//         return callback(null, true);
//     }
//     // Check if the request origin is in our allowed list (for deployed sites)
//     if (allowedOrigins.indexOf(origin) === -1) {
//       const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
//       console.error('CORS Error:', msg); // Log the blocked origin
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   credentials: true // Allow cookies
// }));
// app.use(cookieParser()); // To read cookies from the request

// // Middlewares to parse JSON and URL-encoded data from requests
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // --- Multer Configuration using Memory Storage ---
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// // --- Price calculation logic ---
// const priceChart = {
//   bw: 2,
//   color: 5,
//   glossy: 15,
//   a4: 1.5
// };

// // --- Helper function to generate a simple Order ID ---
// function generateOrderID() {
//   const timestamp = Date.now().toString(36);
//   const randomStr = Math.random().toString(36).substr(2, 5);
//   return `ORDER-${timestamp}-${randomStr}`.toUpperCase();
// }

// // Get the port number from environment variables
// const PORT = process.env.PORT || 5001; // Corrected default port usage

// // --- AUTH MIDDLEWARE ---
// const authMiddleware = (req, res, next) => {
//   const token = req.cookies.token;
//   if (!token) {
//     return res.status(401).json({ message: 'Access denied. No token provided.' });
//   }
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (ex) {
//     res.status(400).json({ message: 'Invalid token.' });
//   }
// };

// // --- Database Connection ---
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log('Successfully connected to MongoDB Atlas! ✅');
//     app.listen(PORT, () => {
//       console.log(`Server is running on port: ${PORT} 🚀`);
//     });
//   })
//   .catch((err) => {
//     console.error('Database connection error: ❌', err);
//   });

// // --- API ROUTES ---

// // Test Route
// app.get('/', (req, res) => {
//   res.send('Hello from PrintMyPage Backend!');
// });

// // ROUTE 1: GET ALL SUPPLIERS
// app.get('/api/suppliers', async (req, res) => {
//   try {
//     const suppliers = await Supplier.find({ is_active: true });
//     res.status(200).json(suppliers);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching suppliers', error: error });
//   }
// });
// // --- ✨ NEW ROUTE: HANDLE IMMEDIATE FILE UPLOAD & PAGE COUNT ---
// app.post('/api/upload-file', authMiddleware, upload.single('documentFile'), async (req, res) => {
//     try {
//         console.log(`[DEBUG /api/upload-file] Route hit. req.file exists? ${!!req.file}`);
//         if (!req.file) {
//             return res.status(400).json({ success: false, message: 'No file uploaded.' });
//         }

//         let detectedPageCount = 0;
//         const fileType = req.file.mimetype;
//         let requiresManualPages = false;
//         let countError = null; // To store potential counting errors

//         // --- Page Counting Logic (copied from place-order) ---
//         console.log(`[Upload] Detecting pages for: ${req.file.originalname}, Type: ${fileType}`);
//         if (fileType === 'application/pdf') {
//             try {
//                 const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
//                 detectedPageCount = pdfDoc.getPageCount();
//                 if (detectedPageCount === 0) {
//                      console.warn(`[Upload] PDF loaded but page count is zero.`);
//                      requiresManualPages = true; // Force manual count
//                      countError = 'Could not read page count from PDF.';
//                 } else {
//                      console.log(`[Upload] PDF detected: ${detectedPageCount} pages.`);
//                 }
//             } catch (pdfError) {
//                 console.error("[Upload] Error reading PDF:", pdfError.message);
//                 requiresManualPages = true;
//                 countError = 'Could not read PDF file (may be encrypted/corrupted).';
//             }
//         } else if (fileType.startsWith('image/')) {
//             detectedPageCount = 1;
//             console.log(`[Upload] Image detected: 1 page.`);
//         } else {
//             console.warn(`[Upload] Unsupported type for auto count: ${fileType}`);
//             requiresManualPages = true;
//             countError = 'Automatic page counting not supported for this file type.';
//         }
//         // ------------------------------------

//         // --- Upload to Cloudinary ---
//         console.log('[Upload] Uploading file to Cloudinary...');
//         const uploadResult = await new Promise((resolve, reject) => {
//             const uploadStream = cloudinary.uploader.upload_stream(
//                 { resource_type: "raw", folder: "printmypage_uploads" },
//                 (error, result) => {
//                     if (error) return reject(error);
//                     resolve(result);
//                 }
//             );
//             uploadStream.end(req.file.buffer);
//         });
//         console.log('[Upload] Cloudinary successful:', uploadResult.secure_url);
//         // --------------------------

//         // --- Send Success Response ---
//         res.status(200).json({
//             success: true,
//             message: 'File uploaded successfully.',
//             fileUrl: uploadResult.secure_url,
//             originalFilename: req.file.originalname,
//             detectedPageCount: detectedPageCount, // Send 0 if manual is required but not yet entered
//             requiresManualPages: requiresManualPages,
//             countErrorMessage: countError // Send error message if counting failed
//         });

//     } catch (error) {
//         console.error('[Upload] File upload error:', error);
//         res.status(500).json({ success: false, message: 'Server error during file upload.' });
//     }
// });
// // ROUTE 2: PLACE A NEW ORDER (AUTO PAGE COUNTING)
// // ROUTE 2: PLACE A NEW ORDER (Handles "Anyone" supplier)
// // ROUTE 2: PLACE A NEW ORDER (Handles "Anyone" supplier, with Debug Logging)
// app.post('/api/place-order', authMiddleware, async (req, res) => {
//   let orderIdForLogging = 'N/A'; // For logging in case of early failure
//   try {
//     // 1. Get data from JSON body
//     const {
//         printType, copies, duplex, paperSize,
//         cloudinaryUrl, originalFilename, detectedPageCountResult,
//         supplier_id
//     } = req.body;

//     // 2. Validate essential data
//     if (!cloudinaryUrl || !originalFilename || !printType || !supplier_id) {
//         console.error('[DEBUG] Validation failed: Missing required fields in req.body', req.body);
//         return res.status(400).json({ message: 'Missing required order details or file upload.' });
//     }
//     const finalPageCount = parseInt(detectedPageCountResult, 10);
//     if (isNaN(finalPageCount) || finalPageCount <= 0) {
//         console.error('[DEBUG] Validation failed: Invalid page count', detectedPageCountResult);
//         return res.status(400).json({ message: 'Invalid page count provided.' });
//     }

//     // 3. Parse options & Calculate price
//     const numCopies = parseInt(copies, 10) || 1;
//     const isDuplex = (duplex === 'true');
//     const selectedPaperSize = paperSize || 'A4';
//     const pricePerPage = priceChart[printType];
//     if (!pricePerPage) {
//         console.error('[DEBUG] Validation failed: Invalid printType', printType);
//         return res.status(400).json({ message: 'Invalid print type.' });
//     }
//     let totalPrice = pricePerPage * finalPageCount * numCopies;
//     // Add duplex pricing logic if any
//     totalPrice = parseFloat(totalPrice.toFixed(2));

//     // 4. Fetch customer details
//     const customer = await User.findById(req.user.id);
//     if (!customer) {
//         console.error('[DEBUG] Validation failed: Customer not found for ID', req.user.id);
//         return res.status(404).json({ message: 'Customer profile not found.' });
//     }

//     // --- Handle Supplier Selection ---
//     let orderSupplierId = null;
//     let orderBroadcastStatus = 'none';
//     orderIdForLogging = generateOrderID(); // Generate ID here for consistent logging

//     if (supplier_id === 'anyone') {
//         orderBroadcastStatus = 'pending';
//         console.log(`Order ${orderIdForLogging} marked for broadcast.`);
//     } else {
//         orderSupplierId = supplier_id;
//         console.log(`Order ${orderIdForLogging} assigned directly to supplier ${supplier_id}.`);
//     }
//     // ------------------------------------

//     // 5. Create new Order document object (in memory)
//     const orderToSave = new Order({
//       user: req.user.id,
//       orderId: orderIdForLogging, // Use the generated ID
//       customerDetails: {
//           name: customer.name,
//           branch: customer.branch,
//           section: customer.section,
//           rollNumber: customer.rollNumber,
//           contactNo: customer.contactNo
//       },
//       printDetails: {
//           printType,
//           pageCount: finalPageCount,
//           totalPrice,
//           copies: numCopies,
//           duplex: isDuplex,
//           paperSize: selectedPaperSize
//       },
//       fileDetails: { originalFilename, storedPath: cloudinaryUrl },
//       supplier: orderSupplierId,
//       broadcastStatus: orderBroadcastStatus
//     });

//     // --- ✨ ADD DEBUG LOGS AROUND SAVE ✨ ---
//     console.log(`[DEBUG] Attempting to save order ${orderToSave.orderId}...`);
//     let savedOrder; // Declare variable outside try/catch
//     try {
//         savedOrder = await orderToSave.save();
//         console.log(`[DEBUG] Order ${savedOrder.orderId} saved successfully! DB ID: ${savedOrder._id}`);
//     } catch (saveError) {
//         console.error(`[DEBUG]!!! Failed to save order ${orderToSave.orderId} to database !!!`, saveError);
//         // Send an error response immediately if save fails
//         return res.status(500).json({ message: 'Database error saving order.' });
//     }
//     // --- END DEBUG LOGS ---

//     // --- 7. Send Notifications ---
//     // Email Customer (Order Placed)
//     try {
//         if (customer.email) { // Check email exists before sending
//             await sendEmail({
//                  email: customer.email,
//                  subject: `📄 Your PrintMyPage Order (${savedOrder.orderId}) Placed!`,
//                  html: `<p>Hi ${customer.name},</p><p>Your order <strong>${savedOrder.orderId}</strong> has been placed successfully. You will be notified when a supplier accepts it.</p><p>You can track its status on the "My Orders" page.</p>`
//             });
//             console.log(`Order placed email sent to customer ${customer.email}`);
//         } else {
//              console.warn(`Customer ${customer.name} has no email, skipping order placed notification.`);
//         }
//     } catch (emailError) { console.error(`Failed to send 'Order Placed' email for ${savedOrder.orderId}:`, emailError); }

//     // Email Suppliers IF Broadcast
//     if (orderBroadcastStatus === 'pending') {
//          console.log(`[DEBUG] Sending broadcast emails for order ${savedOrder.orderId}...`);
//         try {
//             const activeSuppliers = await Supplier.find({ is_active: true, email: { $exists: true, $ne: null } }); // Ensure email exists
//             if (activeSuppliers.length > 0) {
//                 for (const supplier of activeSuppliers) {
//                      await sendEmail({
//                         email: supplier.email,
//                         subject: `📢 New Broadcast Order Available: ${savedOrder.orderId}`,
//                         html: `<p>Hi ${supplier.name},</p>
//                                <p>A new broadcast print order (<strong>${savedOrder.orderId}</strong>) is available for acceptance.</p>
//                                <p>Details:<br>
//                                   Pages: ${savedOrder.printDetails.pageCount}<br>
//                                   Type: ${savedOrder.printDetails.printType}<br>
//                                   Copies: ${savedOrder.printDetails.copies}<br>
//                                   Duplex: ${savedOrder.printDetails.duplex ? 'Yes' : 'No'}</p>
//                                <p>Log in to your dashboard to accept it if you are available.</p>`
//                      });
//                      console.log(`Broadcast notification sent to supplier ${supplier.email} for order ${savedOrder.orderId}`);
//                 }
//                 console.log(`[DEBUG] Finished sending ${activeSuppliers.length} broadcast emails for order ${savedOrder.orderId}.`);
//             } else {
//                  console.log(`[DEBUG] No active suppliers with emails found for broadcast for order ${savedOrder.orderId}.`);
//             }
//         } catch (emailError) {
//              console.error(`Failed to send broadcast notification emails for ${savedOrder.orderId}:`, emailError);
//         }
//     }
//     // -------------------------

//     // 8. Send success response
//     console.log(`[DEBUG] Sending final success response for order ${savedOrder.orderId}.`);
//     res.status(201).json({ message: 'Order placed successfully!', orderId: savedOrder.orderId });

//   } catch (error) {
//     // This outer catch handles errors BEFORE the save attempt or other unexpected issues
//     console.error(`Outer error in place order route (Order ID if generated: ${orderIdForLogging}):`, error);
//     res.status(500).json({ message: 'Error placing order', error: error.message });
//   }
// }); // End of route

// // --- SUPPLIER PORTAL ROUTES ---

// // ROUTE 3: SUPPLIER LOGIN
// app.post('/api/supplier/login', async (req, res) => {
//   try {
//     const { contact_number, password } = req.body;
//     if (!contact_number || !password) {
//       return res.status(400).json({ message: 'Please enter contact number and password.' });
//     }
//     const supplier = await Supplier.findOne({ contact_number: contact_number });
//     if (!supplier || !supplier.is_active) {
//       return res.status(401).json({ message: 'Invalid credentials or account disabled.' });
//     }
//     const isMatch = await bcrypt.compare(password, supplier.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }
//     res.status(200).json({
//       message: 'Login successful!',
//       supplier: { _id: supplier._id, name: supplier.name, location_code: supplier.location_code }
//     });
//   } catch (error) {
//     console.error('Supplier login error:', error);
//     res.status(500).json({ message: 'Server error during login.' });
//   }
// });

// // ROUTE 4: GET ORDERS FOR A SPECIFIC SUPPLIER
// // ROUTE 4: GET ORDERS FOR SUPPLIER (INCLUDES BROADCAST - CORRECTED POPULATION)
// app.get('/api/supplier/orders/:supplierId', async (req, res) => {
//   try {
//     const { supplierId } = req.params;

//     // Find orders assigned to this supplier OR orders pending broadcast
//     const orders = await Order.find({
//         $or: [
//             { supplier: supplierId },
//             { broadcastStatus: 'pending' }
//         ]
//      })
//     // Ensure all needed fields are populated from the 'user' document
//     .populate('user', 'name email contactNo branch section profilePictureUrl rollNumber') // Added rollNumber just in case
//     .sort({ orderDate: -1 });

//     // Reshape data to correctly merge populated user details
//     const ordersWithDetails = orders.map(order => {
//         // Start with a plain object copy of the order
//         const orderObject = order.toObject();

//         // Prepare customer details, using populated data if available, otherwise fallback
//         const customerDetails = {
//             name: order.user?.name || orderObject.customerDetails.name || 'N/A', // Use optional chaining (?.)
//             rollNumber: order.user?.rollNumber || orderObject.customerDetails.rollNumber || 'N/A',
//             branch: order.user?.branch || orderObject.customerDetails.branch || 'N/A',
//             section: order.user?.section || orderObject.customerDetails.section || 'N/A',
//             contactNo: order.user?.contactNo || orderObject.customerDetails.contactNo || 'N/A',
//             email: order.user?.email || 'N/A',
//             profilePictureUrl: order.user?.profilePictureUrl || '' // Default to empty string if missing
//         };

//         // Replace the original customerDetails with the combined/updated ones
//         orderObject.customerDetails = customerDetails;

//         // Add the broadcast flag
//         orderObject.isBroadcast = (orderObject.broadcastStatus === 'pending' && !orderObject.supplier);

//         // Remove the separate, populated 'user' field as it's now merged
//         delete orderObject.user;

//         return orderObject;
//     });

//     res.status(200).json(ordersWithDetails);

//   } catch (error) {
//     console.error('Error fetching supplier orders:', error);
//     res.status(500).json({ message: 'Server error fetching orders.' });
//   }
// });
// // --- ✨ NEW ROUTE: SUPPLIER ACCEPTS BROADCAST ORDER ---
// app.post('/api/supplier/accept-broadcast/:orderId', async (req, res) => {
//     // Note: In a real app, you'd add middleware here to verify the supplier is logged in
//     // For now, we assume the frontend sends the supplier's ID in the request body
//     const { supplierId } = req.body; // ID of the supplier clicking "Accept"
//     const { orderId } = req.params; // The MongoDB _id of the order

//     if (!supplierId) {
//         return res.status(400).json({ message: 'Supplier ID is required.' });
//     }

//     try {
//         // --- Atomic Update ---
//         // Find an order that matches the ID AND is still pending broadcast,
//         // and update it ONLY if found in that state.
//         const updatedOrder = await Order.findOneAndUpdate(
//             { _id: orderId, broadcastStatus: 'pending', supplier: null }, // Find criteria
//             {
//                 $set: {
//                     supplier: supplierId,          // Assign to this supplier
//                     broadcastStatus: 'accepted', // Mark as claimed
//                     orderStatus: 'awaiting-payment' // Move to next step for customer
//                 }
//             },
//             { new: true } // Return the updated document if successful
//         );
//         // -------------------

//         if (!updatedOrder) {
//             // If null, it means another supplier already accepted it or it wasn't a broadcast order
//             console.log(`Order ${orderId} could not be accepted by supplier ${supplierId} (already taken or invalid).`);
//             return res.status(409).json({ message: 'Order already accepted by another supplier or is invalid.' });
//         }

//         // --- Success! Order is assigned ---
//         console.log(`Order ${updatedOrder.orderId} accepted by supplier ${supplierId}`);

//         // --- Notify Customer: Order Accepted ---
//         try {
//             const fullOrder = await Order.findById(updatedOrder._id)
//                                          .populate('user', 'name email')
//                                          .populate('supplier', 'name contact_number'); // Populate accepting supplier

//             if (fullOrder && fullOrder.user && fullOrder.user.email && fullOrder.supplier) {
//                 await sendEmail({
//                     email: fullOrder.user.email,
//                     subject: `✅ Order Accepted: ${fullOrder.orderId} by ${fullOrder.supplier.name}`,
//                     html: `<p>Hi ${fullOrder.user.name},</p>
//                            <p>Good news! Your order <strong>${fullOrder.orderId}</strong> has been accepted by supplier <strong>${fullOrder.supplier.name}</strong> (Contact: ${fullOrder.supplier.contact_number}) and is now awaiting payment (₹${fullOrder.printDetails.totalPrice}).</p>
//                            <p>Please visit the "My Orders" page on our website to complete the payment.</p>`
//                 });
//                 console.log(`Order accepted (broadcast) email sent to ${fullOrder.user.email}`);
//             }
//         } catch (emailError) {
//              console.error("Failed to send 'Order Accepted (Broadcast)' email:", emailError);
//         }
//         // ------------------------------------

//         res.status(200).json({ message: 'Order accepted successfully!', order: updatedOrder });

//     } catch (error) {
//         console.error('Error accepting broadcast order:', error);
//         res.status(500).json({ message: 'Server error.' });
//     }
// });
// // ROUTE 5: UPDATE AN ORDER'S STATUS (MODIFIED WITH EMAIL)
// app.put('/api/supplier/orders/:orderId', async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { newStatus, supplierRemark } = req.body;
//     if (!newStatus) {
//       return res.status(400).json({ message: 'New status is required.' });
//     }
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found.' });
//     }

//     let updateData = {
//       orderStatus: newStatus,
//       supplierRemark: supplierRemark || order.supplierRemark
//     };

//     // --- Handle Status Specific Logic & Emails ---
//     let emailSubject = '';
//     let emailBody = '';
//     let sendCustomerEmail = false;

//     if (newStatus === 'accepted') {
//       updateData.orderStatus = 'awaiting-payment'; // Auto-move to payment step
//       sendCustomerEmail = true;
//       emailSubject = `✅ Order Accepted: ${order.orderId}`;
//       emailBody = `<p>Good news! Your order <strong>${order.orderId}</strong> has been accepted and is now awaiting payment (₹${order.printDetails.totalPrice}).</p><p>Please visit "My Orders" to complete the payment.</p>`;

//     } else if (newStatus === 'printing') {
//       if (order.paymentStatus !== 'paid') {
//         return res.status(400).json({ message: 'Cannot start printing until payment is received.' });
//       }
//       // No email needed here, payment confirmation email already sent
//     } else if (newStatus === 'completed') {
//       sendCustomerEmail = true;
//       emailSubject = `🎉 Order Completed: ${order.orderId}`;
//       emailBody = `<p>Good news! Your order <strong>${order.orderId}</strong> is complete.</p>`;
//       if (supplierRemark) emailBody += `<p><strong>Supplier Remark:</strong> ${supplierRemark}</p>`;
//       emailBody += `<p>You can add your feedback on the "My Orders" page.</p>`;

//     } else if (newStatus === 'rejected') {
//       sendCustomerEmail = true;
//       emailSubject = `❌ Order Rejected: ${order.orderId}`;
//       emailBody = `<p>Unfortunately, your order <strong>${order.orderId}</strong> was rejected.</p>`;
//       if (supplierRemark) emailBody += `<p><strong>Reason:</strong> ${supplierRemark}</p>`;
//       emailBody += `<p>Please contact support if you have questions.</p>`;
//     }
//     // --- End Status Logic ---

//     const updatedOrder = await Order.findByIdAndUpdate(
//       orderId,
//       { $set: updateData },
//       { new: true }
//     );

//     // --- Send Email If Needed ---
//     if (sendCustomerEmail && updatedOrder) {
//         try {
//             const fullOrder = await Order.findById(updatedOrder._id).populate('user', 'name email');
//             if (fullOrder && fullOrder.user && fullOrder.user.email) {
//                 await sendEmail({
//                     email: fullOrder.user.email,
//                     subject: emailSubject,
//                     html: `<p>Hi ${fullOrder.user.name},</p>${emailBody}` // Add greeting
//                 });
//                 console.log(`Order ${updatedOrder.orderStatus} email sent to ${fullOrder.user.email}`);
//             }
//         } catch (emailError) {
//             console.error(`Failed to send order ${updatedOrder.orderStatus} email:`, emailError);
//         }
//     }
//     // -------------------------

//     res.status(200).json(updatedOrder);

//   } catch (error) {
//     console.error('Error updating order status:', error);
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

// // ROUTE 6: DOWNLOAD A FILE (DELETED - using direct Cloudinary link now)

// // --- CUSTOMER-FACING ROUTES ---

// // ROUTE 7: MY ORDERS (Replaces old tracker)
// app.get('/api/my-orders', authMiddleware, async (req, res) => {
//   try {
//     const orders = await Order.find({ user: req.user.id })
//                               .populate('supplier', 'name location_code contact_number')
//                               .sort({ orderDate: -1 });
//     res.status(200).json(orders);
//   } catch (error) {
//     console.error('Error fetching my-orders:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ROUTE 8: CUSTOMER PAYMENT (DELETED - handled by create-order + webhook)

// // ROUTE 9: CUSTOMER ADDS A REMARK
// app.post('/api/order/remark/:orderId', authMiddleware, async (req, res) => { // Added authMiddleware
//   try {
//     const { orderId } = req.params;
//     const { customerRemark } = req.body;
//     if (!customerRemark) {
//       return res.status(400).json({ message: 'Remark cannot be empty.' });
//     }
//     const order = await Order.findOne({ orderId: orderId, user: req.user.id }); // Ensure user owns order
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found or access denied.' });
//     }
//     if (order.orderStatus !== 'completed') {
//         return res.status(400).json({ message: 'Can only add remark to completed orders.' });
//     }
//     order.customerRemark = customerRemark;
//     await order.save();
//     res.status(200).json({ message: 'Remark added successfully.' });
//   } catch (error) {
//     console.error('Remark add error:', error);
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

// // --- CUSTOMER AUTH ROUTES ---

// // ROUTE: REGISTER A NEW USER (UPDATED WITH ERP VERIFICATION)
// // app.post('/api/auth/register', async (req, res) => {
// //   try {
// //     const { name, rollNumber, password, email } = req.body;
// //     if (!name || !rollNumber || !password || !email) {
// //       return res.status(400).json({ message: 'Please fill all fields.' });
// //     }
// //     const userExists = await User.findOne({ rollNumber });
// //     if (userExists) {
// //       return res.status(400).json({ message: 'This roll number is already registered.' });
// //     }
// //     console.log(`Attempting ERP verification for ${rollNumber}...`);
// //     const isVerified = await verifyERPLogin(rollNumber, password);
// //     if (!isVerified) {
// //       console.log(`ERP verification FAILED for ${rollNumber}.`);
// //       return res.status(401).json({ message: 'Invalid ERP credentials. Please check your roll number and password.' });
// //     }
// //     console.log(`ERP verification SUCCESS for ${rollNumber}. Creating user...`);
// //     const user = new User({ name, rollNumber, email, password, isVerified: true });
// //     await user.save();
// //     res.status(201).json({ message: 'ERP verification successful! Your account is registered. Please login.' });
// //   } catch (error) {
// //     console.error('Register error:', error);
// //     res.status(500).json({ message: 'Server error during registration.' });
// //   }
// // });
// // ROUTE: REGISTER A NEW USER (new features of predemanding information )
// // ROUTE: REGISTER A NEW USER (UPDATED WITH MORE FIELDS)
// app.post('/api/auth/register', async (req, res) => {
//   try {
//     console.log("Received registration data:", req.body);
//     // ✨ ADD branch, section, contactNo here
//     const { name, rollNumber, password, email, branch, section, contactNo } = req.body;
    
//     // Basic validation (add more specific checks if needed)
//     if (!name || !rollNumber || !password || !email || !branch || !section || !contactNo) {
//       return res.status(400).json({ message: 'Please fill all fields.' });
//     }
    
//     const userExists = await User.findOne({ rollNumber });
//     if (userExists) {
//       return res.status(400).json({ message: 'This roll number is already registered.' });
//     }

//     console.log(`Attempting ERP verification for ${rollNumber}...`);
//     const isERPVerified = await verifyERPLogin(rollNumber, password); // Renamed variable for clarity
//     if (!isERPVerified) {
//       console.log(`ERP verification FAILED for ${rollNumber}.`);
//       return res.status(401).json({ message: 'Invalid ERP credentials. Please check your roll number and password.' });
//     }
    
//     console.log(`ERP verification SUCCESS for ${rollNumber}. Creating user...`);
//     const user = new User({
//       name,
//       rollNumber,
//       email,
//       password, // Storing plain-text
//       branch,   // ✨ Save new field
//       section,  // ✨ Save new field
//       contactNo,// ✨ Save new field
//       isVerified: true 
//     });
    
//     await user.save();
//     res.status(201).json({ message: 'ERP verification successful! Your account is registered. Please login.' });

//   } catch (error) {
//     console.error('Register error:', error);
//     res.status(500).json({ message: 'Server error during registration.' });
//   }
// });

// // ROUTE: LOGIN A USER (UPDATED FOR PLAIN-TEXT PASSWORD)
// app.post('/api/auth/login', async (req, res) => {
//   try {
//     const { rollNumber, password } = req.body;
//     if (!rollNumber || !password) {
//       return res.status(400).json({ message: 'Please enter roll number and password.' });
//     }
//     const user = await User.findOne({ rollNumber });
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }
//     const isMatch = (user.password === password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }
//     const tokenPayload = { id: user._id, name: user.name, rollNumber: user.rollNumber };
//     const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
//     // res.cookie('token', token, {
//     //   httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000
//     // });
//     res.cookie('token', token, {
//         httpOnly: true, // Keeps cookie inaccessible to client-side script
//         secure: true, // MUST be true for SameSite=None
//         sameSite: 'None', // Allows cross-site cookie sending
//         maxAge: 24 * 60 * 60 * 1000 // 1 day
//     });
//     res.status(200).json({ message: 'Login successful!', user: tokenPayload });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error.' });
//   }
// });

// // ROUTE: LOGOUT A USER
// app.get('/api/auth/logout', (req, res) => {
//   // res.cookie('token', '', {
//   //   httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: new Date(0)
//   // });
//   // ... inside /api/auth/logout ...
// res.cookie('token', '', {
//     httpOnly: true,
//     secure: true, // MUST be true for SameSite=None
//     sameSite: 'None', // Allows cross-site cookie sending
//     expires: new Date(0) // Expire the cookie immediately
// });
// // ... rest of the route ...
//   res.status(200).json({ message: 'Logout successful.' });
// });

// // ROUTE: CHECK IF USER IS ALREADY LOGGED IN
// app.get('/api/auth/check-session', (req, res) => {
//   const token = req.cookies.token;
//   if (!token) {
//     return res.status(401).json({ user: null });
//   }
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     res.status(200).json({ user: decoded });
//   } catch (error) {
//     res.status(401).json({ user: null });
//   }
// });

// // --- RAZORPAY PAYMENT ROUTES ---

// // ROUTE: CREATE RAZORPAY ORDER
// app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
//   try {
//     const { orderId } = req.body;
//     const order = await Order.findOne({ orderId: orderId, user: req.user.id });
//     if (!order) {
//       return res.status(404).json({ message: 'Order not found.' });
//     }
//     if (order.paymentStatus === 'paid') {
//         return res.status(400).json({ message: 'This order is already paid.'});
//     }
//     const options = {
//       amount: order.printDetails.totalPrice * 100, currency: "INR", receipt: order.orderId, notes: { customer_roll_no: req.user.rollNumber }
//     };
//     const razorpayOrder = await razorpay.orders.create(options);
//     res.status(200).json({
//       success: true, orderId: razorpayOrder.id, amount: razorpayOrder.amount, key_id: process.env.RAZORPAY_KEY_ID
//     });
//   } catch (error) {
//     console.error('Create Razorpay order error:', error);
//     res.status(500).json({ message: 'Server error while creating payment order.' });
//   }
// });

// // ROUTE: PAYMENT VERIFICATION (WEBHOOK - CORRECTED FOR 'order.paid' EVENT, WITH EMAIL)
// app.post('/api/payment/verification', async (req, res) => {
//   const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
//   const razorpaySignature = req.headers['x-razorpay-signature'];
//   try {
//     const shasum = crypto.createHmac('sha256', secret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest('hex');
//     if (digest !== razorpaySignature) {
//       console.warn('Webhook signature mismatch!');
//       return res.status(400).json({ status: 'invalid signature' });
//     }
//     console.log('Webhook signature verified successfully.');

//     const eventType = req.body.event;
//     if (eventType !== 'order.paid') {
//       console.log(`Received unhandled event: ${eventType}. Ignoring.`);
//       return res.status(200).json({ status: 'ok, event unhandled' });
//     }

//     const orderEntity = req.body.payload.order.entity;
//     console.log('--- DEBUG: Full Order Entity from Razorpay: ---');
//     console.log(JSON.stringify(orderEntity, null, 2));
//     console.log('-----------------------------------------------');

//     const receipt_id = orderEntity.receipt;
//     console.log(`--- DEBUG: Received Receipt ID from Razorpay: [${receipt_id}] ---`);

//     const order = await Order.findOne({ orderId: receipt_id });
//     if (order) {
//       order.paymentStatus = 'paid';
//       order.orderStatus = 'printing';
//       await order.save();
//       console.log(`Payment confirmed for order: ${receipt_id}`);

//       // --- Notify Customer & Supplier: Payment Received ---
//       try {
//           const fullOrder = await Order.findById(order._id)
//                                        .populate('user', 'name email')
//                                        .populate('supplier', 'name email'); // Make sure supplier model has 'email'

//           // Notify Customer
//           if (fullOrder && fullOrder.user && fullOrder.user.email) {
//                await sendEmail({
//                    email: fullOrder.user.email,
//                    subject: `💰 Payment Received for Order ${fullOrder.orderId}!`,
//                    html: `<p>Hi ${fullOrder.user.name},</p><p>We've received your payment for order <strong>${fullOrder.orderId}</strong>. The supplier will now begin printing!</p>`
//                });
//                console.log(`Payment received email sent to customer ${fullOrder.user.email}`);
//           }
//           // Notify Supplier
//           if (fullOrder && fullOrder.supplier && fullOrder.supplier.email) {
//                await sendEmail({
//                    email: fullOrder.supplier.email,
//                    subject: `💳 Payment Received - New Print Job (Order ${fullOrder.orderId})`,
//                    html: `<p>Hi ${fullOrder.supplier.name},</p><p>Payment has been received for order <strong>${fullOrder.orderId}</strong> assigned to you.</p><hr><p><strong>Customer:</strong> ${fullOrder.customerDetails.name}<br><strong>Contact:</strong> ${fullOrder.customerDetails.contactNo}<br><strong>Roll No:</strong> ${fullOrder.customerDetails.rollNumber}<br><strong>File:</strong> ${fullOrder.fileDetails.originalFilename}<br><strong>Pages:</strong> ${fullOrder.printDetails.pageCount}<br><strong>Type:</strong> ${fullOrder.printDetails.printType}</p><hr><p>Please proceed with printing and update the status on your dashboard. You can download the file from the dashboard.</p>`
//                });
//                console.log(`Payment received email sent to supplier ${fullOrder.supplier.email}`);
//           } else if (fullOrder && fullOrder.supplier) {
//               console.warn(`Could not notify supplier ${fullOrder.supplier.name} for order ${fullOrder.orderId}, email address missing.`);
//           }
//       } catch (emailError) {
//            console.error("Failed to send payment confirmation emails:", emailError);
//       }
//       // --------------------------------------------

//     } else {
//       console.log(`--- ERROR: Could not find an order with orderId: [${receipt_id}] ---`);
//     }
//     res.status(200).json({ status: 'ok' });
//   } catch (error) {
//     console.error('Webhook error:', error);
//     res.status(500).json({ status: 'error' });
//   }
// });
// // --- NEW PROFILE ROUTES ---

// // ROUTE: GET USER PROFILE (Protected)
// app.get('/api/profile', authMiddleware, async (req, res) => {
//     try {
//         // req.user comes from authMiddleware
//         const user = await User.findById(req.user.id).select('-password'); // Exclude password
//         if (!user) {
//             return res.status(404).json({ message: 'User not found.' });
//         }
//         res.status(200).json(user);
//     } catch (error) {
//         console.error('Get profile error:', error);
//         res.status(500).json({ message: 'Server error fetching profile.' });
//     }
// });

// // ROUTE: UPDATE USER PROFILE (Protected)
// app.put('/api/profile', authMiddleware, async (req, res) => {
//     try {
//         const { name, branch, section, contactNo, email } = req.body;
        
//         // Basic validation
//         if (!name || !branch || !section || !contactNo || !email) {
//              return res.status(400).json({ message: 'Please fill all required fields.' });
//         }

//         // Check if email already exists for another user
//         const existingUser = await User.findOne({ email: email });
//         if (existingUser && existingUser._id.toString() !== req.user.id) {
//             return res.status(400).json({ message: 'Email already in use.' });
//         }

//         const updatedUser = await User.findByIdAndUpdate(
//             req.user.id,
//             { name, branch, section, contactNo, email },
//             { new: true, runValidators: true } // Return updated doc, run schema validators
//         ).select('-password');

//         if (!updatedUser) {
//              return res.status(404).json({ message: 'User not found.' });
//         }
//         res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });

//     } catch (error) {
//         console.error('Update profile error:', error);
//         // Handle potential duplicate email error from MongoDB if validation fails somehow
//         if (error.code === 11000 && error.keyPattern.email) {
//              return res.status(400).json({ message: 'Email already in use.' });
//         }
//         res.status(500).json({ message: 'Server error updating profile.' });
//     }
// });

// // ROUTE: UPDATE PROFILE PICTURE (Protected)
// // We use the same 'upload' middleware configured for Cloudinary
// app.post('/api/profile/picture', authMiddleware, upload.single('profilePic'), async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ message: 'No file uploaded.' });
//         }

//         // --- UPLOAD TO CLOUDINARY ---
//         console.log('Uploading profile picture to Cloudinary...');
//         const uploadResult = await new Promise((resolve, reject) => {
//             // Upload the buffer from memory (using 'upload_stream')
//             const uploadStream = cloudinary.uploader.upload_stream(
//                 { folder: "printmypage_profilepics" }, // Store in a different folder
//                 (error, result) => {
//                     if (error) return reject(error);
//                     resolve(result);
//                 }
//             );
//             uploadStream.end(req.file.buffer);
//         });
//         console.log('Cloudinary profile pic upload successful:', uploadResult.secure_url);
//         // ------------------------------------

//         // Update the user's profilePictureUrl in the database
//         const user = await User.findByIdAndUpdate(
//             req.user.id,
//             { profilePictureUrl: uploadResult.secure_url },
//             { new: true }
//         ).select('-password');

//         if (!user) {
//             // Should not happen if authMiddleware worked
//             return res.status(404).json({ message: 'User not found.' });
//         }

//         res.status(200).json({ message: 'Profile picture updated!', profilePictureUrl: user.profilePictureUrl });

//     } catch (error) {
//         console.error('Profile picture upload error:', error);
//         res.status(500).json({ message: 'Server error uploading picture.' });
//     }
// });



// Load environment variables from our .env file
require('dotenv').config();
// --- DEBUG LOG ---
console.log('--- DEBUG: CHECKING ENV VARIABLES ---');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_WEBHOOK_SECRET:', process.env.RAZORPAY_WEBHOOK_SECRET);
console.log('-----------------------------------');
// --- END DEBUG LOG ---
const verifyERPLogin = require('./utils/verifyERP');
const Razorpay = require('razorpay');
const crypto = require('crypto'); // for security in webhook
// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Import necessary packages
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const { PDFDocument } = require('pdf-lib');
const sendEmail = require('./utils/sendEmail');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
// --- Import our new models ---
const Order = require('./models/orderModel.js');
const Supplier = require('./models/supplierModel.js');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('./models/userModel');

// Create an Express application
const app = express();

// Configure CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,         // Your main customer frontend
    process.env.SUPPLIER_FRONTEND_URL, // Your new supplier frontend
    'http://localhost:5500',          // Your local customer frontend
    'http://localhost:5501'           // Your local supplier frontend
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed) || origin.startsWith('http://localhost'))) {
        return callback(null, true);
    }
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    console.error('CORS Error:', msg);
    return callback(new Error(msg), false);
  },
  credentials: true
}));
app.use(cookieParser()); // To read cookies from the request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Multer Configuration using Memory Storage ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Price calculation logic ---
const priceChart = { bw: 2, color: 5, glossy: 15, a4: 1.5 };

// --- Helper function to generate a simple Order ID ---
function generateOrderID() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `ORDER-${timestamp}-${randomStr}`.toUpperCase();
}

// Get the port number from environment variables
const PORT = process.env.PORT || 5001;

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ message: 'Invalid token.' });
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
  .catch((err) => {
    console.error('Database connection error: ❌', err);
    process.exit(1); // Exit if DB connection fails
  });

// --- API ROUTES ---

// Test Route
app.get('/', (req, res) => {
  res.send('Hello from PrintMyPage Backend!');
});

// ROUTE 1: GET ALL SUPPLIERS
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ is_active: true });
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error });
  }
});

// ROUTE: HANDLE IMMEDIATE FILE UPLOAD & PAGE COUNT
app.post('/api/upload-file', authMiddleware, upload.single('documentFile'), async (req, res) => {
    try {
        console.log(`[DEBUG /api/upload-file] Route hit. req.file exists? ${!!req.file}`);
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded.' });
        }
        let detectedPageCount = 0;
        const fileType = req.file.mimetype;
        let requiresManualPages = false;
        let countError = null;
        console.log(`[Upload] Detecting pages for: ${req.file.originalname}, Type: ${fileType}`);
        if (fileType === 'application/pdf') {
            try {
                const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
                detectedPageCount = pdfDoc.getPageCount();
                if (detectedPageCount === 0) {
                     console.warn(`[Upload] PDF loaded but page count is zero.`);
                     requiresManualPages = true;
                     countError = 'Could not read page count from PDF.';
                } else {
                     console.log(`[Upload] PDF detected: ${detectedPageCount} pages.`);
                }
            } catch (pdfError) {
                console.error("[Upload] Error reading PDF:", pdfError.message);
                requiresManualPages = true;
                countError = 'Could not read PDF file (may be encrypted/corrupted).';
            }
        } else if (fileType.startsWith('image/')) {
            detectedPageCount = 1;
            console.log(`[Upload] Image detected: 1 page.`);
        } else {
            console.warn(`[Upload] Unsupported type for auto count: ${fileType}`);
            requiresManualPages = true;
            countError = 'Automatic page counting not supported for this file type.';
        }
        console.log('[Upload] Uploading file to Cloudinary...');
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
        console.log('[Upload] Cloudinary successful:', uploadResult.secure_url);
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

// ROUTE 2: PLACE A NEW ORDER (Handles "Anyone" supplier, with Debug Logging)
app.post('/api/place-order', authMiddleware, async (req, res) => {
  let orderIdForLogging = 'N/A';
  try {
    const { printType, copies, duplex, paperSize, cloudinaryUrl, originalFilename, detectedPageCountResult, supplier_id } = req.body;
    orderIdForLogging = generateOrderID(); // Generate ID early

    if (!cloudinaryUrl || !originalFilename || !printType || !supplier_id) {
        console.error('[DEBUG] Validation failed: Missing required fields in req.body', req.body);
        return res.status(400).json({ message: 'Missing required order details or file upload.' });
    }
    const finalPageCount = parseInt(detectedPageCountResult, 10);
    if (isNaN(finalPageCount) || finalPageCount <= 0) {
        console.error('[DEBUG] Validation failed: Invalid page count', detectedPageCountResult);
        return res.status(400).json({ message: 'Invalid page count provided.' });
    }
    const numCopies = parseInt(copies, 10) || 1;
    const isDuplex = (duplex === 'true');
    const selectedPaperSize = paperSize || 'A4';
    const pricePerPage = priceChart[printType];
    if (!pricePerPage) {
        console.error('[DEBUG] Validation failed: Invalid printType', printType);
        return res.status(400).json({ message: 'Invalid print type.' });
    }
    let totalPrice = pricePerPage * finalPageCount * numCopies;
    totalPrice = parseFloat(totalPrice.toFixed(2));
    const customer = await User.findById(req.user.id);
    if (!customer) {
        console.error('[DEBUG] Validation failed: Customer not found for ID', req.user.id);
        return res.status(404).json({ message: 'Customer profile not found.' });
    }
    let orderSupplierId = null;
    let orderBroadcastStatus = 'none';
    if (supplier_id === 'anyone') {
        orderBroadcastStatus = 'pending';
        console.log(`Order ${orderIdForLogging} marked for broadcast.`);
    } else {
        orderSupplierId = supplier_id;
        console.log(`Order ${orderIdForLogging} assigned directly to supplier ${supplier_id}.`);
    }
    const orderToSave = new Order({
      user: req.user.id,
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

    console.log(`[DEBUG] Attempting to save order ${orderToSave.orderId}...`);
    let savedOrder;
    try {
        savedOrder = await orderToSave.save();
        console.log(`[DEBUG] Order ${savedOrder.orderId} saved successfully! DB ID: ${savedOrder._id}`);
    } catch (saveError) {
        console.error(`[DEBUG]!!! Failed to save order ${orderToSave.orderId} to database !!!`, saveError);
        return res.status(500).json({ message: 'Database error saving order.' });
    }

    // --- ✨ FIX: SEND RESPONSE IMMEDIATELY ---
    console.log(`[DEBUG] Sending final success response for order ${savedOrder.orderId}.`);
    res.status(201).json({ message: 'Order placed successfully!', orderId: savedOrder.orderId });
    // ----------------------------------------

    // --- 7. Send Notifications (Asynchronously) ---
    // Run email logic *after* sending response so user isn't waiting
    (async () => {
        try {
            if (customer.email) {
                await sendEmail({
                     email: customer.email,
                     subject: `📄 Your PrintMyPage Order (${savedOrder.orderId}) Placed!`,
                     html: `<p>Hi ${customer.name},</p><p>Your order <strong>${savedOrder.orderId}</strong> has been placed successfully. You will be notified when a supplier accepts it.</p><p>You can track its status on the "My Orders" page.</p>`
                });
                console.log(`Order placed email sent to customer ${customer.email}`);
            } else {
                 console.warn(`Customer ${customer.name} has no email, skipping order placed notification.`);
            }
        } catch (emailError) { console.error(`Failed to send 'Order Placed' email for ${savedOrder.orderId}:`, emailError); }

        if (orderBroadcastStatus === 'pending') {
             console.log(`[DEBUG] Sending broadcast emails for order ${savedOrder.orderId} (async)...`);
            try {
                const activeSuppliers = await Supplier.find({ is_active: true, email: { $exists: true, $ne: null } });
                if (activeSuppliers.length > 0) {
                    for (const supplier of activeSuppliers) {
                         await sendEmail({ // Keep await here to send one by one
                            email: supplier.email,
                            subject: `📢 New Broadcast Order Available: ${savedOrder.orderId}`,
                            html: `<p>Hi ${supplier.name},</p><p>A new broadcast print order...` // Truncated
                         });
                         console.log(`Broadcast notification sent to supplier ${supplier.email} for order ${savedOrder.orderId}`);
                    }
                    console.log(`[DEBUG] Finished sending ${activeSuppliers.length} broadcast emails for ${savedOrder.orderId}.`);
                } else {
                     console.log(`[DEBUG] No active suppliers with emails found for broadcast for ${savedOrder.orderId}.`);
                }
            } catch (emailError) {
                 console.error(`Failed to send broadcast notification emails for ${savedOrder.orderId}:`, emailError);
            }
        }
    })(); // Immediately invoke the async function
    // -------------------------

  } catch (error) {
    console.error(`Outer error in place order route (Order ID: ${orderIdForLogging}):`, error);
    if (!res.headersSent) { // Prevent sending response twice
        res.status(500).json({ message: 'Error placing order', error: error.message });
    }
  }
}); // End of route

// --- SUPPLIER PORTAL ROUTES ---

// ROUTE 3: SUPPLIER LOGIN
app.post('/api/supplier/login', async (req, res) => {
  try {
    const { contact_number, password } = req.body;
    if (!contact_number || !password) {
      return res.status(400).json({ message: 'Please enter contact number and password.' });
    }
    const supplier = await Supplier.findOne({ contact_number: contact_number });
    if (!supplier || !supplier.is_active) {
      return res.status(401).json({ message: 'Invalid credentials or account disabled.' });
    }
    const isMatch = await bcrypt.compare(password, supplier.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    res.status(200).json({
      message: 'Login successful!',
      supplier: { _id: supplier._id, name: supplier.name, location_code: supplier.location_code }
    });
  } catch (error) {
    console.error('Supplier login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ROUTE 4: GET ORDERS FOR SUPPLIER (INCLUDES BROADCAST)
app.get('/api/supplier/orders/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const orders = await Order.find({
        $or: [ { supplier: supplierId }, { broadcastStatus: 'pending' } ]
     })
    .populate('user', 'name email contactNo branch section profilePictureUrl rollNumber')
    .sort({ orderDate: -1 });

    const ordersWithDetails = orders.map(order => {
        const orderObject = order.toObject();
        const customerDetails = {
            name: order.user?.name || orderObject.customerDetails.name || 'N/A',
            rollNumber: order.user?.rollNumber || orderObject.customerDetails.rollNumber || 'N/A',
            branch: order.user?.branch || orderObject.customerDetails.branch || 'N/A',
            section: order.user?.section || orderObject.customerDetails.section || 'N/A',
            contactNo: order.user?.contactNo || orderObject.customerDetails.contactNo || 'N/A',
            email: order.user?.email || 'N/A',
            profilePictureUrl: order.user?.profilePictureUrl || ''
        };
        orderObject.customerDetails = customerDetails;
        orderObject.isBroadcast = (orderObject.broadcastStatus === 'pending' && !orderObject.supplier);
        delete orderObject.user;
        return orderObject;
    });
    res.status(200).json(ordersWithDetails);
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
});

// ROUTE: SUPPLIER ACCEPTS BROADCAST ORDER (Sends Email Async)
app.post('/api/supplier/accept-broadcast/:orderId', async (req, res) => {
    const { supplierId } = req.body;
    const { orderId } = req.params; // MongoDB _id
    if (!supplierId) {
        return res.status(400).json({ message: 'Supplier ID is required.' });
    }
    try {
        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId, broadcastStatus: 'pending', supplier: null },
            { $set: { supplier: supplierId, broadcastStatus: 'accepted', orderStatus: 'awaiting-payment' }},
            { new: true }
        );
        if (!updatedOrder) {
            console.log(`Order ${orderId} could not be accepted by ${supplierId} (already taken).`);
            return res.status(409).json({ message: 'Order already accepted by another supplier.' });
        }
        console.log(`Order ${updatedOrder.orderId} accepted by supplier ${supplierId}`);
        
        // --- Send response FIRST ---
        res.status(200).json({ message: 'Order accepted successfully!', order: updatedOrder });
        
        // --- Notify Customer: Order Accepted (Async) ---
        (async () => {
            try {
                const fullOrder = await Order.findById(updatedOrder._id)
                                             .populate('user', 'name email')
                                             .populate('supplier', 'name contact_number');
                if (fullOrder && fullOrder.user && fullOrder.user.email && fullOrder.supplier) {
                    await sendEmail({
                        email: fullOrder.user.email,
                        subject: `✅ Order Accepted: ${fullOrder.orderId} by ${fullOrder.supplier.name}`,
                        html: `<p>Hi ${fullOrder.user.name},</p><p>Good news! Your order <strong>${fullOrder.orderId}</strong> has been accepted by supplier <strong>${fullOrder.supplier.name}</strong> (Contact: ${fullOrder.supplier.contact_number})...</p>` // Truncated
                    });
                    console.log(`Order accepted (broadcast) email sent to ${fullOrder.user.email}`);
                }
            } catch (emailError) {
                 console.error("Failed to send 'Order Accepted (Broadcast)' email:", emailError);
            }
        })();
        // ------------------------------------

    } catch (error) {
        console.error('Error accepting broadcast order:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

// ROUTE 5: UPDATE AN ORDER'S STATUS (Sends Email Async)
app.put('/api/supplier/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params; // MongoDB _id
    const { newStatus, supplierRemark } = req.body;
    if (!newStatus) {
      return res.status(400).json({ message: 'New status is required.' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    let updateData = { orderStatus: newStatus, supplierRemark: supplierRemark || order.supplierRemark };
    let emailSubject = '';
    let emailBody = '';
    let sendCustomerEmail = false;

    if (newStatus === 'accepted') {
      updateData.orderStatus = 'awaiting-payment';
      // This logic is for *direct assignment* orders
      sendCustomerEmail = true;
      emailSubject = `✅ Order Accepted: ${order.orderId}`;
      emailBody = `<p>Good news! Your order <strong>${order.orderId}</strong> has been accepted and is now awaiting payment (₹${order.printDetails.totalPrice})...</p>`; // Truncated
    } else if (newStatus === 'printing') {
      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({ message: 'Cannot start printing until payment is received.' });
      }
      sendCustomerEmail = false; // Payment email already sent
    } else if (newStatus === 'completed') {
      sendCustomerEmail = true;
      emailSubject = `🎉 Order Completed: ${order.orderId}`;
      emailBody = `<p>Good news! Your order <strong>${order.orderId}</strong> is complete.</p>`;
      if (supplierRemark) emailBody += `<p><strong>Supplier Remark:</strong> ${supplierRemark}</p>`;
      emailBody += `<p>You can add your feedback on the "My Orders" page.</p>`;
    } else if (newStatus === 'rejected') {
      sendCustomerEmail = true;
      emailSubject = `❌ Order Rejected: ${order.orderId}`;
      emailBody = `<p>Unfortunately, your order <strong>${order.orderId}</strong> was rejected.</p>`;
      if (supplierRemark) emailBody += `<p><strong>Reason:</strong> ${supplierRemark}</p>`;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    );

    // --- Send response FIRST ---
    res.status(200).json(updatedOrder);

    // --- Send Email If Needed (Async) ---
    if (sendCustomerEmail && updatedOrder) {
        (async () => {
            try {
                const fullOrder = await Order.findById(updatedOrder._id).populate('user', 'name email');
                if (fullOrder && fullOrder.user && fullOrder.user.email) {
                    await sendEmail({
                        email: fullOrder.user.email,
                        subject: emailSubject,
                        html: `<p>Hi ${fullOrder.user.name},</p>${emailBody}`
                    });
                    console.log(`Order ${updatedOrder.orderStatus} email sent to ${fullOrder.user.email}`);
                }
            } catch (emailError) {
                console.error(`Failed to send order ${updatedOrder.orderStatus} email:`, emailError);
            }
        })();
    }
    // -------------------------

  } catch (error) {
    console.error('Error updating order status:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Server error.' });
  }
});

// --- CUSTOMER-FACING ROUTES ---
app.get('/api/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }) // user.id is MongoDB _id from authMiddleware
                              .populate('supplier', 'name location_code contact_number')
                              .sort({ orderDate: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching my-orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/order/remark/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params; // This is the custom ORDER-ID
    const { customerRemark } = req.body;
    if (!customerRemark) { /* ... */ }
    const order = await Order.findOne({ orderId: orderId, user: req.user.id });
    if (!order) { /* ... */ }
    if (order.orderStatus !== 'completed') { /* ... */ }
    order.customerRemark = customerRemark;
    await order.save();
    res.status(200).json({ message: 'Remark added successfully.' });
  } catch (error) { /* ... */ }
});

// --- CUSTOMER AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log("Received registration data:", req.body);
    const { name, rollNumber, password, email, branch, section, contactNo } = req.body;
    if (!name || !rollNumber || !password || !email || !branch || !section || !contactNo) {
      return res.status(400).json({ message: 'Please fill all fields.' });
    }
    const userExists = await User.findOne({ rollNumber });
    if (userExists) {
      return res.status(400).json({ message: 'This roll number is already registered.' });
    }
    console.log(`Attempting ERP verification for ${rollNumber}...`);
    const isERPVerified = await verifyERPLogin(rollNumber, password);
    if (!isERPVerified) {
      console.log(`ERP verification FAILED for ${rollNumber}.`);
      return res.status(401).json({ message: 'Invalid ERP credentials. Please check your roll number and password.' });
    }
    console.log(`ERP verification SUCCESS for ${rollNumber}. Creating user...`);
    const user = new User({
      name, rollNumber, email, password, branch, section, contactNo, isVerified: true 
    });
    await user.save();
    res.status(201).json({ message: 'ERP verification successful! Please login.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { rollNumber, password } = req.body;
    if (!rollNumber || !password) { /* ... */ }
    const user = await User.findOne({ rollNumber });
    if (!user) { /* ... */ }
    const isMatch = (user.password === password);
    if (!isMatch) { /* ... */ }
    const tokenPayload = { id: user._id, name: user.name, rollNumber: user.rollNumber };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
        httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000
    });
    res.status(200).json({ message: 'Login successful!', user: tokenPayload });
  } catch (error) { /* ... */ }
});
app.get('/api/auth/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true, secure: true, sameSite: 'None', expires: new Date(0)
  });
  res.status(200).json({ message: 'Logout successful.' });
});
app.get('/api/auth/check-session', (req, res) => {
  const token = req.cookies.token;
  if (!token) { /* ... */ }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ user: decoded });
  } catch (error) { /* ... */ }
});

// --- RAZORPAY PAYMENT ROUTES ---
app.post('/api/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId: orderId, user: req.user.id });
    if (!order) { /* ... */ }
    if (order.paymentStatus === 'paid') { /* ... */ }
    const options = {
      amount: order.printDetails.totalPrice * 100, currency: "INR", receipt: order.orderId, notes: { customer_roll_no: req.user.rollNumber }
    };
    const razorpayOrder = await razorpay.orders.create(options);
    res.status(200).json({
      success: true, orderId: razorpayOrder.id, amount: razorpayOrder.amount, key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) { /* ... */ }
});

// ROUTE: PAYMENT VERIFICATION (WEBHOOK - CORRECTED, Sends Email Async)
app.post('/api/payment/verification', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers['x-razorpay-signature'];
  try {
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');
    if (digest !== razorpaySignature) { /* ... */ }
    console.log('Webhook signature verified successfully.');
    const eventType = req.body.event;
    if (eventType !== 'order.paid') { /* ... */ }
    const orderEntity = req.body.payload.order.entity;
    const receipt_id = orderEntity.receipt;
    console.log(`--- DEBUG: Received Receipt ID from Razorpay: [${receipt_id}] ---`);
    const order = await Order.findOne({ orderId: receipt_id });
    if (order) {
      order.paymentStatus = 'paid';
      order.orderStatus = 'printing';
      await order.save();
      console.log(`Payment confirmed for order: ${receipt_id}`);
      
      // Send response FIRST
      res.status(200).json({ status: 'ok' });

      // --- Notify Customer & Supplier (Async) ---
      (async () => {
          try {
              const fullOrder = await Order.findById(order._id)
                                           .populate('user', 'name email')
                                           .populate('supplier', 'name email contactNo'); // Added contactNo

              // Notify Customer
              if (fullOrder && fullOrder.user && fullOrder.user.email) {
                   await sendEmail({
                       email: fullOrder.user.email,
                       subject: `💰 Payment Received for Order ${fullOrder.orderId}!`,
                       html: `<p>Hi ${fullOrder.user.name},</p><p>We've received your payment...` // Truncated
                   });
                   console.log(`Payment received email sent to customer ${fullOrder.user.email}`);
              }
              // Notify Supplier
              if (fullOrder && fullOrder.supplier && fullOrder.supplier.email) {
                   await sendEmail({
                       email: fullOrder.supplier.email,
                       subject: `💳 Payment Received - New Print Job (Order ${fullOrder.orderId})`,
                       html: `<p>Hi ${fullOrder.supplier.name},</p><p>Payment received for <strong>${fullOrder.orderId}</strong>...<br><strong>Contact:</strong> ${fullOrder.customerDetails.contactNo}</p>...` // Truncated
                   });
                   console.log(`Payment received email sent to supplier ${fullOrder.supplier.email}`);
              } else if (fullOrder && fullOrder.supplier) {
                  console.warn(`Could not notify supplier ${fullOrder.supplier.name} (no email)`);
              }
          } catch (emailError) {
               console.error("Failed to send payment confirmation emails:", emailError);
          }
      })();
      // --------------------------------------------
    } else {
      console.log(`--- ERROR: Could not find an order with orderId: [${receipt_id}] ---`);
       if (!res.headersSent) res.status(200).json({ status: 'ok' }); // Still respond OK
    }
  } catch (error) {
    console.error('Webhook error:', error);
    if (!res.headersSent) res.status(500).json({ status: 'error' });
  }
});

// --- PROFILE ROUTES ---
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) { /* ... */ }
        res.status(200).json(user);
    } catch (error) { /* ... */ }
});
app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const { name, branch, section, contactNo, email } = req.body;
        if (!name || !branch || !section || !contactNo || !email) { /* ... */ }
        const existingUser = await User.findOne({ email: email });
        if (existingUser && existingUser._id.toString() !== req.user.id) { /* ... */ }
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { name, branch, section, contactNo, email },
            { new: true, runValidators: true }
        ).select('-password');
        if (!updatedUser) { /* ... */ }
        res.status(200).json({ message: 'Profile updated successfully!', user: updatedUser });
    } catch (error) { /* ... */ }
});
app.post('/api/profile/picture', authMiddleware, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) { /* ... */ }
        console.log('Uploading profile picture to Cloudinary...');
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "printmypage_profilepics" },
                (error, result) => { /* ... */ }
            );
            uploadStream.end(req.file.buffer);
        });
        console.log('Cloudinary profile pic upload successful:', uploadResult.secure_url);
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { profilePictureUrl: uploadResult.secure_url },
            { new: true }
        ).select('-password');
        if (!user) { /* ... */ }
        res.status(200).json({ message: 'Profile picture updated!', profilePictureUrl: user.profilePictureUrl });
    } catch (error) { /* ... */ }
});

// --- End of Routes ---