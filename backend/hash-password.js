const bcrypt = require('bcrypt');
const saltRounds = 10;

// Get the password from the command line arguments
const myPassword = process.argv[2];

if (!myPassword) {
  console.error('Error: Please provide a password.');
  console.log('Usage: node hash-password.js <your-password-here>');
  process.exit(1);
}

bcrypt.hash(myPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Your password:', myPassword);
    console.log('Your HASH (copy this):');
    console.log(hash);
  }
});