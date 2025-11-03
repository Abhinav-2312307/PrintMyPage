const admin = require('firebase-admin');

// Get the path to the secret file from our environment variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountPath) {
  console.error('CRITICAL ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  // This will cause the app to fail if it tries to use admin functions.
} else {
  try {
    // Load the service account key from the file path
    // Locally, this will be './firebase-service-account.json'
    // On Render, this will be '/etc/secrets/firebase-service-account.json'
    const serviceAccount = require(serviceAccountPath);


    // Initialize the Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log('Firebase Admin SDK initialized successfully.');

  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    console.error('Check if the path is correct. Local path should be ./firebase-service-account.json');
    // This error will crash the server on start, which is good
    // because it prevents it from running without auth.
    process.exit(1); 
  }
}

// Export the initialized admin object
module.exports = admin;
