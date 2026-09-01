const { describe, it } = require('node:test');
const assert = require('node:assert');
const SHEETS = require('../src/config/sheets');

describe('sheets config', () => {
  it('defines all required sheets', () => {
    assert.ok(SHEETS.ALUNOS);
    assert.ok(SHEETS.CHAMADAS);
    assert.ok(SHEETS.PRESENCAS);
    assert.ok(SHEETS.LOGS);
  });

  it('has correct headers for Alunos', () => {
    assert.deepStrictEqual(SHEETS.ALUNOS.headers, ['Matrícula', 'Nome', 'Turma', 'Situação']);
  });

  it('has correct headers for Chamadas', () => {
    assert.deepStrictEqual(SHEETS.CHAMADAS.headers, ['ID Chamada', 'Data', 'Hora', 'Responsável', 'Link', 'Status']);
  });

  it('has correct headers for Presenças', () => {
    assert.deepStrictEqual(SHEETS.PRESENCAS.headers, ['ID Chamada', 'Matrícula', 'Nome', 'Turma', 'Data', 'Hora', 'Timestamp']);
  });

  it('has correct headers for Logs', () => {
    assert.deepStrictEqual(SHEETS.LOGS.headers, ['Timestamp', 'Evento', 'Usuário', 'Detalhes', 'IP']);
  });

  it('has proper range definitions', () => {
    assert.strictEqual(SHEETS.ALUNOS.range, 'Alunos!A:D');
    assert.strictEqual(SHEETS.CHAMADAS.range, 'Chamadas!A:F');
    assert.strictEqual(SHEETS.PRESENCAS.range, 'Presenças!A:G');
    assert.strictEqual(SHEETS.LOGS.range, 'Logs!A:E');
  });
});
