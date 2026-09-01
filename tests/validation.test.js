const { describe, it } = require('node:test');
const assert = require('node:assert');
const { sanitize } = require('../src/middleware/validation');

describe('sanitização', () => {
  it('remove caracteres HTML', () => {
    assert.strictEqual(sanitize('<script>alert("x")</script>'), 'scriptalert(x)/script');
  });

  it('remove espaços em branco nas extremidades', () => {
    assert.strictEqual(sanitize('  abc  '), 'abc');
  });

  it('trata string vazia', () => {
    assert.strictEqual(sanitize(''), '');
  });

  it('trata entrada não-string', () => {
    assert.strictEqual(sanitize(null), '');
    assert.strictEqual(sanitize(undefined), '');
    assert.strictEqual(sanitize(123), '');
  });

  it('preserva texto normal', () => {
    assert.strictEqual(sanitize('20240001'), '20240001');
    assert.strictEqual(sanitize('João Silva'), 'João Silva');
  });
});

describe('regras de validação de matrícula', () => {
  it('aceita matrículas alfanuméricas', () => {
    assert.match('20240001', /^[a-zA-Z0-9]+$/);
    assert.match('ABC123', /^[a-zA-Z0-9]+$/);
  });

  it('rejeita caracteres especiais', () => {
    assert.doesNotMatch('2024-001', /^[a-zA-Z0-9]+$/);
    assert.doesNotMatch('2024 001', /^[a-zA-Z0-9]+$/);
    assert.doesNotMatch('2024.001', /^[a-zA-Z0-9]+$/);
  });
});
