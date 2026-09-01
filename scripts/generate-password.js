const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Uso: node scripts/generate-password.js <senha>');
  console.log('Gera o hash bcrypt para usar como ADMIN_PASSWORD_HASH no .env');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nHash gerado:');
  console.log(hash);
  console.log('\nAdicione ao seu arquivo .env:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
