const { google } = require('googleapis');
const { config } = require('../config/env');
const SHEETS = require('../config/sheets');
const logger = require('../utils/logger');

let sheetsInstance = null;

function getAuth() {
  return new google.auth.JWT(
    config.googleServiceAccountEmail,
    null,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function getSheets() {
  if (!sheetsInstance) {
    sheetsInstance = google.sheets({ version: 'v4', auth: getAuth() });
  }
  return sheetsInstance;
}

async function readSheet(range) {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetsId,
    range,
  });
  return response.data.values || [];
}

async function appendRow(sheetName, values) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheetsId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

async function appendRows(sheetName, rows) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheetsId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

async function updateCell(range, value) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheetsId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

async function ensureSheetExists(sheetName, headers) {
  const sheets = getSheets();
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: config.googleSheetsId });
    const existing = meta.data.sheets.map(s => s.properties.title);

    if (!existing.includes(sheetName)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheetsId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheetsId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
      logger.info(`Sheet "${sheetName}" created with headers`);
    }
  } catch (err) {
    logger.error(`Failed to ensure sheet "${sheetName}"`, { error: err.message });
    throw err;
  }
}

async function initializeSheets() {
  for (const sheet of Object.values(SHEETS)) {
    await ensureSheetExists(sheet.name, sheet.headers);
  }
  logger.info('All Google Sheets tabs initialized');
}

async function getAllAlunos() {
  const rows = await readSheet(SHEETS.ALUNOS.range);
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    matricula: (row[0] || '').trim(),
    nome: (row[1] || '').trim(),
    turma: (row[2] || '').trim(),
    situacao: (row[3] || '').trim(),
  }));
}

async function findAluno(matricula) {
  const alunos = await getAllAlunos();
  return alunos.find(a => a.matricula === matricula.trim()) || null;
}

async function getAllChamadas() {
  const rows = await readSheet(SHEETS.CHAMADAS.range);
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: (row[0] || '').trim(),
    data: (row[1] || '').trim(),
    hora: (row[2] || '').trim(),
    responsavel: (row[3] || '').trim(),
    link: (row[4] || '').trim(),
    status: (row[5] || 'aberta').trim(),
  }));
}

async function findChamada(chamadaId) {
  const chamadas = await getAllChamadas();
  return chamadas.find(c => c.id === chamadaId) || null;
}

async function getChamadaRowIndex(chamadaId) {
  const rows = await readSheet(SHEETS.CHAMADAS.range);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').trim() === chamadaId) return i + 1;
  }
  return -1;
}

async function getPresencasByChamada(chamadaId) {
  const rows = await readSheet(SHEETS.PRESENCAS.range);
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(row => (row[0] || '').trim() === chamadaId)
    .map(row => ({
      chamadaId: (row[0] || '').trim(),
      matricula: (row[1] || '').trim(),
      nome: (row[2] || '').trim(),
      turma: (row[3] || '').trim(),
      data: (row[4] || '').trim(),
      hora: (row[5] || '').trim(),
      timestamp: (row[6] || '').trim(),
    }));
}

async function getAllPresencas() {
  const rows = await readSheet(SHEETS.PRESENCAS.range);
  if (rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    chamadaId: (row[0] || '').trim(),
    matricula: (row[1] || '').trim(),
    nome: (row[2] || '').trim(),
    turma: (row[3] || '').trim(),
    data: (row[4] || '').trim(),
    hora: (row[5] || '').trim(),
    timestamp: (row[6] || '').trim(),
  }));
}

async function checkDuplicatePresenca(chamadaId, matricula) {
  const presencas = await getPresencasByChamada(chamadaId);
  return presencas.some(p => p.matricula === matricula.trim());
}

async function addLog(evento, usuario, detalhes, ip) {
  const timestamp = new Date().toISOString();
  await appendRow(SHEETS.LOGS.name, [timestamp, evento, usuario, detalhes, ip]);
}

module.exports = {
  initializeSheets,
  readSheet,
  appendRow,
  appendRows,
  updateCell,
  getAllAlunos,
  findAluno,
  getAllChamadas,
  findChamada,
  getChamadaRowIndex,
  getPresencasByChamada,
  getAllPresencas,
  checkDuplicatePresenca,
  addLog,
};
