const { describe, it, before } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.GOOGLE_SHEETS_ID = 'test';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = 'test-key';

const { generateToken, verifyToken } = require('../src/middleware/auth');

describe('JWT auth', () => {
  it('generates a valid token', () => {
    const token = generateToken('admin');
    assert.ok(typeof token === 'string');
    assert.ok(token.length > 0);
  });

  it('verifies a valid token', () => {
    const token = generateToken('testuser');
    const decoded = verifyToken(token);
    assert.strictEqual(decoded.username, 'testuser');
    assert.strictEqual(decoded.role, 'admin');
  });

  it('rejects an invalid token', () => {
    assert.throws(() => verifyToken('invalid-token'), { name: 'JsonWebTokenError' });
  });

  it('includes expiration', () => {
    const token = generateToken('admin');
    const decoded = verifyToken(token);
    assert.ok(decoded.exp);
    assert.ok(decoded.exp > Date.now() / 1000);
  });
});
