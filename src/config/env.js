const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const demoMode = process.env.DEMO_MODE === 'true' || !process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID === 'demo';

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode,
  jwtSecret: process.env.JWT_SECRET || 'demo-secret-key-apenas-para-teste',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '$2b$10$X0nbwaMBV5T6vdMI9NRlYuN3qT3Gp0SLkzYe73lnHc2WhGFOIRhhK',
  googleSheetsId: process.env.GOOGLE_SHEETS_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  appUrl: process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`,
};

function validateConfig() {
  if (config.demoMode) return;
  const required = ['jwtSecret', 'googleSheetsId', 'googleServiceAccountEmail', 'googlePrivateKey'];
  const missing = required.filter(key => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`);
  }
}

function updateConfig(updates) {
  if (updates.googleSheetsId) config.googleSheetsId = updates.googleSheetsId;
  if (updates.googleServiceAccountEmail) config.googleServiceAccountEmail = updates.googleServiceAccountEmail;
  if (updates.googlePrivateKey) config.googlePrivateKey = updates.googlePrivateKey.replace(/\\n/g, '\n');
  config.demoMode = false;
}

module.exports = { config, validateConfig, updateConfig };
