const LOG_LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' };

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

const logger = {
  error(message, meta) { console.error(formatLog(LOG_LEVELS.ERROR, message, meta)); },
  warn(message, meta) { console.warn(formatLog(LOG_LEVELS.WARN, message, meta)); },
  info(message, meta) { console.log(formatLog(LOG_LEVELS.INFO, message, meta)); },
  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog(LOG_LEVELS.DEBUG, message, meta));
    }
  },
};

module.exports = logger;
