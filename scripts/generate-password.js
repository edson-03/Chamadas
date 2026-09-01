const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/generate-password.js <password>');
  console.log('Output the bcrypt hash to use as ADMIN_PASSWORD_HASH in .env');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nGenerated hash:');
  console.log(hash);
  console.log('\nAdd to your .env file:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
