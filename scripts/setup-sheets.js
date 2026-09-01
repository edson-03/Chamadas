require('dotenv').config();
const { initializeSheets } = require('../src/services/googleSheets');
const logger = require('../src/utils/logger');

async function main() {
  try {
    logger.info('Inicializando Google Sheets...');
    await initializeSheets();
    logger.info('Todas as abas criadas com sucesso!');
    logger.info('Abas: Alunos, Chamadas, Presenças, Logs');
    process.exit(0);
  } catch (err) {
    logger.error('Falha na configuração', { error: err.message });
    process.exit(1);
  }
}

main();
