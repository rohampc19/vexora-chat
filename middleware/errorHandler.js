// ============================================
// VEXORA CHAT - Unified Error Handling
// ============================================

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'اطلاعات ارسالی نامعتبر است') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'احراز هویت ناموفق بود') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'دسترسی غیرمجاز') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'منبع') {
    super(`${resource} یافت نشد`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'این مورد قبلاً وجود دارد') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'تعداد درخواست‌ها بیش از حد مجاز است') {
    super(message, 429, 'RATE_LIMIT');
  }
}

const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'فیلد';
    return new ConflictError(`این ${field} قبلاً استفاده شده است`);
  }
  if (err.code === 'P2025') {
    return new NotFoundError('رکورد');
  }
  if (err.code === 'P2003') {
    return new ValidationError('ارجاع به رکورد نامعتبر است');
  }
  return new AppError('خطا در عملیات دیتابیس', 500, 'DATABASE_ERROR');
};

const handleJWTError = () =>
  new AuthenticationError('توکن نامعتبر است. لطفاً دوباره وارد شوید.');

const handleJWTExpiredError = () =>
  new AuthenticationError('توکن منقضی شده است. لطفاً دوباره وارد شوید.');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.code && err.code.startsWith('P')) {
    error = handlePrismaError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  } else if (!err.isOperational) {
    error = new AppError('خطای داخلی سرور رخ داد', 500, 'INTERNAL_ERROR');
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    logger.error('Server Error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });
  } else {
    logger.warn('Client Error', {
      message: error.message,
      path: req.path,
      method: req.method,
      statusCode
    });
  }

  const response = {
    success: false,
    message: error.message,
  };

  if (error.code) response.code = error.code;

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`مسیر ${req.originalUrl}`));
};

const setupProcessErrorHandlers = () => {
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down...', {
      message: err.message,
      stack: err.stack
    });
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  catchAsync,
  notFoundHandler,
  setupProcessErrorHandlers,
};
