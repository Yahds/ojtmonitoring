require('dotenv').config();
const { hashAdviserPasswords } = require('../database.js');

hashAdviserPasswords()
  .then(() => {
    console.log('Adviser passwords hashed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Hashing failed:', err.message);
    process.exit(1);
  });
