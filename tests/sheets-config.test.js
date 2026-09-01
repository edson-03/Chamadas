const { describe, it } = require('node:test');
const assert = require('node:assert');
const SHEETS = require('../src/config/sheets');

describe('configuração das planilhas', () => {
  it('define todas as abas obrigatórias', () => {
    assert.ok(SHEETS.ALUNOS);
    assert.ok(SHEETS.CHAMADAS);
    assert.ok(SHEETS.PRESENCAS);
    assert.ok(SHEETS.LOGS);
  });

  it('possui cabeçalhos corretos para Alunos', () => {
    assert.deepStrictEqual(SHEETS.ALUNOS.headers, ['Matrícula', 'Nome', 'Turma', 'Situação']);
  });

  it('possui cabeçalhos corretos para Chamadas', () => {
    assert.deepStrictEqual(SHEETS.CHAMADAS.headers, ['ID Chamada', 'Data', 'Hora', 'Responsável', 'Link', 'Status']);
  });

  it('possui cabeçalhos corretos para Presenças', () => {
    assert.deepStrictEqual(SHEETS.PRESENCAS.headers, ['ID Chamada', 'Matrícula', 'Nome', 'Turma', 'Data', 'Hora', 'Timestamp']);
  });

  it('possui cabeçalhos corretos para Logs', () => {
    assert.deepStrictEqual(SHEETS.LOGS.headers, ['Timestamp', 'Evento', 'Usuário', 'Detalhes', 'IP']);
  });

  it('possui definições de intervalo corretas', () => {
    assert.strictEqual(SHEETS.ALUNOS.range, 'Alunos!A:D');
    assert.strictEqual(SHEETS.CHAMADAS.range, 'Chamadas!A:F');
    assert.strictEqual(SHEETS.PRESENCAS.range, 'Presenças!A:G');
    assert.strictEqual(SHEETS.LOGS.range, 'Logs!A:E');
  });
});
