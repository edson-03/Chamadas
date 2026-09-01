const { config } = require('../config/env');
const SHEETS = require('../config/sheets');
const logger = require('../utils/logger');

const DEMO_MODE = config.demoMode;

// --- Armazenamento em memória para modo demonstração ---

const memoryStore = {
  Alunos: [
    SHEETS.ALUNOS.headers,
    ['20240001', 'João Silva', '1A', 'Ativo'],
    ['20240002', 'Maria Santos', '1A', 'Ativo'],
    ['20240003', 'Pedro Oliveira', '1B', 'Ativo'],
    ['20240004', 'Ana Costa', '1B', 'Ativo'],
    ['20240005', 'Lucas Souza', '2A', 'Ativo'],
    ['20240006', 'Julia Lima', '2A', 'Inativo'],
  ],
  Chamadas: [SHEETS.CHAMADAS.headers],
  'Presenças': [SHEETS.PRESENCAS.headers],
  Logs: [SHEETS.LOGS.headers],
};

function memReadSheet(range) {
  const sheetName = range.split('!')[0];
  return memoryStore[sheetName] || [];
}

function memAppendRow(sheetName, values) {
  if (!memoryStore[sheetName]) memoryStore[sheetName] = [];
  memoryStore[sheetName].push(values);
}

function memUpdateCell(range, value) {
  const match = range.match(/^(.+)!([A-Z]+)(\d+)$/);
  if (!match) return;
  const [, sheetName, col, rowStr] = match;
  const rowIndex = parseInt(rowStr, 10) - 1;
  const colIndex = col.charCodeAt(0) - 65;
  if (memoryStore[sheetName] && memoryStore[sheetName][rowIndex]) {
    memoryStore[sheetName][rowIndex][colIndex] = value;
  }
}

// --- Google Sheets API real ---

let sheetsInstance = null;

function getAuth() {
  const { google } = require('googleapis');
  return new google.auth.JWT(
    config.googleServiceAccountEmail,
    null,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

function getSheets() {
  if (!sheetsInstance) {
    const { google } = require('googleapis');
    sheetsInstance = google.sheets({ version: 'v4', auth: getAuth() });
  }
  return sheetsInstance;
}

// --- Funções públicas (despacham para memória ou API) ---

async function readSheet(range) {
  if (DEMO_MODE) return memReadSheet(range);

  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetsId,
    range,
  });
  return response.data.values || [];
}

async function appendRow(sheetName, values) {
  if (DEMO_MODE) { memAppendRow(sheetName, values); return; }

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
  if (DEMO_MODE) { rows.forEach(r => memAppendRow(sheetName, r)); return; }

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
  if (DEMO_MODE) { memUpdateCell(range, value); return; }

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheetsId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

async function ensureSheetExists(sheetName, headers) {
  if (DEMO_MODE) {
    if (!memoryStore[sheetName]) {
      memoryStore[sheetName] = [headers];
      logger.info(`Aba "${sheetName}" criada com cabeçalhos (modo demonstração)`);
    }
    return;
  }

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
      logger.info(`Aba "${sheetName}" criada com cabeçalhos`);
    }
  } catch (err) {
    logger.error(`Falha ao garantir existência da aba "${sheetName}"`, { error: err.message });
    throw err;
  }
}

async function initializeSheets() {
  if (DEMO_MODE) {
    logger.info('Modo demonstração ativo — dados armazenados em memória');
    logger.info('Alunos de teste carregados: 20240001 a 20240006');
    return;
  }

  for (const sheet of Object.values(SHEETS)) {
    await ensureSheetExists(sheet.name, sheet.headers);
  }
  logger.info('Todas as abas do Google Sheets foram inicializadas');
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
