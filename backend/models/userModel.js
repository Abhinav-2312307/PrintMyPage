// // const mongoose = require('mongoose');
// // // We no longer import bcrypt

// // const userSchema = new mongoose.Schema({
// //   name: { type: String, required: true },
// //   rollNumber: { type: String, required: true, unique: true },
  
// //   // This will now store the plain-text ERP password
// //   password: { type: String, required: true }, 

// //   email: { type: String, required: true, unique: true },
// //   isVerified: { type: Boolean, default: false }, // We'll set this to true after ERP check
  
// //   googleId: { type: String, unique: true, sparse: true }
// // });

// // // We have REMOVED the password hashing functions
// // // We have REMOVED the comparePassword function

// // const User = mongoose.model('User', userSchema);
// // module.exports = User;

// // backend/models/userModel.js
// const mongoose = require('mongoose');
// // bcrypt is NOT needed here anymore since we removed hashing for ERP verification

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   rollNumber: { type: String, required: true, unique: true },
//   password: { type: String, required: true }, // Plain-text ERP password
//   email: { type: String, required: true, unique: true },
//   isVerified: { type: Boolean, default: false }, // Set to true after ERP check

//   // --- ✨ NEW PROFILE FIELDS ---
//   branch: { type: String, default: '' },
//   section: { type: String, default: '' },
//   contactNo: { type: String, default: '' },
//   profilePictureUrl: { type: String, default: '' }, // URL from Cloudinary
//   // --------------------------

//   googleId: { type: String, unique: true, sparse: true }
// });

// // We REMOVED the password hashing functions and comparePassword

// const User = mongoose.model('User', userSchema);
// module.exports = User;


// backend/models/userModel.js (For ERP password storage)
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   rollNumber: { type: String, required: true, unique: true },
//   password: { type: String, required: true }, // Plain-text ERP password
//   email: { type: String, required: true, unique: true }, // Keep email
//   isVerified: { type: Boolean, default: false }, // Keep for ERP check status

//   // Profile fields (Keep these)
//   branch: { type: String, default: '' },
//   section: { type: String, default: '' },
//   contactNo: { type: String, default: '' },
//   profilePictureUrl: { type: String, default: '' },

//   // Google ID Field (Add this now for Google Auth)
//   googleId: { type: String, unique: true, sparse: true } // sparse allows multiple docs without googleId
// });

// // No password hashing or comparePassword method needed here

// const User = mongoose.model('User', userSchema);
// module.exports = User;

// backend/models/userModel.js
// backend/models/userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // This is the new primary key from Firebase
  firebaseUid: { type: String, required: true, unique: true, index: true },

  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },

  // Profile fields
  branch: { type: String, default: '' },
  section: { type: String, default: '' },
  contactNo: { type: String, default: '' },
  profilePictureUrl: { type: String, default: '' },
});

const User = mongoose.model('User', userSchema);
module.exports = User;