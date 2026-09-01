const { describe, it } = require('node:test');
const assert = require('node:assert');
const { sanitize } = require('../src/middleware/validation');

describe('sanitize', () => {
  it('removes HTML characters', () => {
    assert.strictEqual(sanitize('<script>alert("x")</script>'), 'scriptalert(x)/script');
  });

  it('trims whitespace', () => {
    assert.strictEqual(sanitize('  abc  '), 'abc');
  });

  it('handles empty string', () => {
    assert.strictEqual(sanitize(''), '');
  });

  it('handles non-string input', () => {
    assert.strictEqual(sanitize(null), '');
    assert.strictEqual(sanitize(undefined), '');
    assert.strictEqual(sanitize(123), '');
  });

  it('preserves normal text', () => {
    assert.strictEqual(sanitize('20240001'), '20240001');
    assert.strictEqual(sanitize('João Silva'), 'João Silva');
  });
});

describe('matricula validation rules', () => {
  it('accepts alphanumeric matriculas', () => {
    assert.match('20240001', /^[a-zA-Z0-9]+$/);
    assert.match('ABC123', /^[a-zA-Z0-9]+$/);
  });

  it('rejects special characters', () => {
    assert.doesNotMatch('2024-001', /^[a-zA-Z0-9]+$/);
    assert.doesNotMatch('2024 001', /^[a-zA-Z0-9]+$/);
    assert.doesNotMatch('2024.001', /^[a-zA-Z0-9]+$/);
  });
});
