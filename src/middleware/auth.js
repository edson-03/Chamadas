const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const logger = require('../utils/logger');

function generateToken(username) {
  return jwt.sign({ username, role: 'admin' }, config.jwtSecret, { expiresIn: '8h' });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('Token de autenticação inválido', { error: err.message, ip: req.ip });
    if (req.headers.accept?.includes('text/html')) {
      res.clearCookie('auth_token');
      return res.redirect('/admin/login');
    }
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { generateToken, verifyToken, requireAuth };
