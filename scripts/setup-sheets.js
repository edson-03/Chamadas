require('dotenv').config();
const { initializeSheets } = require('../src/services/googleSheets');
const logger = require('../src/utils/logger');

async function main() {
  try {
    logger.info('Initializing Google Sheets...');
    await initializeSheets();
    logger.info('All sheets created successfully!');
    logger.info('Sheets: Alunos, Chamadas, Presenças, Logs');
    process.exit(0);
  } catch (err) {
    logger.error('Setup failed', { error: err.message });
    process.exit(1);
  }
}

main();
