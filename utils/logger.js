// ============================================
// VEXORA CHAT - Professional Logging System (Winston)
// ============================================

const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'vexora-chat' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    ),
  }));
}

const httpLogStream = {
  write: (message) => logger.info(message.trim(), { type: 'http' }),
};

const logActivity = (userId, action, details = {}) => {
  logger.info('User Activity', {
    type: 'activity',
    userId,
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    type: 'security',
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

module.exports = logger;
module.exports.httpLogStream = httpLogStream;
module.exports.logActivity = logActivity;
module.exports.logSecurityEvent = logSecurityEvent;
