// ============================================
// VEXORA CHAT - Advanced Security Middleware
// ============================================

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');

// ============== SECURITY HEADERS (Helmet) ==============

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// ============== XSS SANITIZATION ==============

const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value !== 'string') return value;
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeValue(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// ============== CSRF PROTECTION (Token-Based) ==============

const csrfTokens = new Map();

const generateCsrfToken = (req, res, next) => {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = req.user?.id || req.ip;
  csrfTokens.set(sessionId, { token, expires: Date.now() + 3600000 });
  res.locals.csrfToken = token;
  next();
};

const verifyCsrfToken = (req, res, next) => {
  if (req.method === 'GET') return next();

  const sessionId = req.user?.id || req.ip;
  const clientToken = req.headers['x-csrf-token'];
  const storedData = csrfTokens.get(sessionId);

  if (!storedData || storedData.token !== clientToken || Date.now() > storedData.expires) {
    return res.status(403).json({
      success: false,
      message: 'توکن امنیتی نامعتبر است. صفحه را رفرش کنید.'
    });
  }

  next();
};

// ============== ADVANCED RATE LIMITING ==============

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.'
  },
  keyGenerator: (req) => req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'تلاش‌های ورود بیش از حد مجاز. لطفاً 15 دقیقه صبر کنید.'
  },
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500,
  maxDelayMs: 10000,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'این عملیات محدودیت دارد. حداکثر 3 بار در ساعت.'
  },
});

// ============== IP BLOCKING ==============

const suspiciousIPs = new Map();

const detectSuspiciousActivity = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();

  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, { failedAttempts: 0, blockedUntil: null });
  }

  const record = suspiciousIPs.get(ip);

  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `به دلیل فعالیت مشکوک، IP شما تا ${remainingMinutes} دقیقه دیگر مسدود است.`
    });
  }

  req.suspiciousRecord = record;
  req.suspiciousIP = ip;
  next();
};

const recordFailedAttempt = (ip) => {
  const record = suspiciousIPs.get(ip) || { failedAttempts: 0, blockedUntil: null };
  record.failedAttempts++;

  if (record.failedAttempts >= 10) {
    record.blockedUntil = Date.now() + (30 * 60 * 1000);
    record.failedAttempts = 0;
  }

  suspiciousIPs.set(ip, record);
};

const clearFailedAttempts = (ip) => {
  suspiciousIPs.delete(ip);
};

// ============== SQL/NoSQL INJECTION DETECTION ==============

const detectInjectionAttempt = (req, res, next) => {
  const suspiciousPatterns = [
    /(\$where|\$ne|\$gt|\$lt|\$regex)/i,
    /(union.*select|select.*from|drop.*table|insert.*into)/i,
    /(<script|javascript:|onerror=|onload=)/i,
  ];

  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key in obj) {
      if (typeof obj[key] === 'string' && checkValue(obj[key])) return true;
      if (typeof obj[key] === 'object' && checkObject(obj[key])) return true;
    }
    return false;
  };

  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    console.warn(`⚠️  Injection attempt detected from IP: ${req.ip}`);
    return res.status(400).json({
      success: false,
      message: 'درخواست نامعتبر شناسایی شد'
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  sanitizeInput,
  generateCsrfToken,
  verifyCsrfToken,
  generalLimiter,
  authLimiter,
  speedLimiter,
  strictLimiter,
  detectSuspiciousActivity,
  recordFailedAttempt,
  clearFailedAttempts,
  detectInjectionAttempt,
};
