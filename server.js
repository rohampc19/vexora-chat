// ============================================
// VEXORA CHAT - Professional Server v4.0
// Security + Validation + Caching + Real-time
// ============================================

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Internal modules
const logger = require('./utils/logger');
const {
  securityHeaders, sanitizeInput, generalLimiter, authLimiter,
  speedLimiter, detectSuspiciousActivity, recordFailedAttempt,
  clearFailedAttempts, detectInjectionAttempt
} = require('./middleware/security');
const { errorHandler, notFoundHandler, catchAsync, setupProcessErrorHandlers,
  AuthenticationError, ValidationError, NotFoundError, ConflictError } = require('./middleware/errorHandler');
const { validate, signupSchema, loginSchema, createChatSchema } = require('./middleware/validate');
const cacheService = require('./services/cacheService');
const authService = require('./services/authService');

setupProcessErrorHandlers();

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }
});

const PORT = process.env.PORT || 3000;

// ============== GLOBAL MIDDLEWARE ==============

app.use(securityHeaders);
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: logger.httpLogStream }));
app.use(sanitizeInput);
app.use(detectInjectionAttempt);
app.use('/api/', generalLimiter);
app.use('/api/', speedLimiter);

// Static files (frontend)
app.use(express.static('public'));

// ============== AUTH MIDDLEWARE ==============

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) throw new AuthenticationError('توکن یافت نشد');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    throw new AuthenticationError('توکن نامعتبر یا منقضی شده است');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AuthenticationError('شما دسترسی به این عملیات را ندارید');
    }
    next();
  };
};

// ============== HEALTH CHECK ==============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    database: 'connected',
    redis: cacheService.getClient()?.status || 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/signup', authLimiter, validate(signupSchema), catchAsync(async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) throw new ConflictError('این ایمیل یا نام کاربری قبلاً ثبت شده است');

  const passwordHash = await authService.hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      username, email, passwordHash,
      avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=00d4ff&color=fff`,
      profile: { create: { fullName: username } },
    },
  });

  const { accessToken, refreshToken } = await authService.generateTokenPair(newUser);
  logger.logActivity(newUser.id, 'signup', { ip: req.ip });

  res.status(201).json({
    success: true,
    message: 'ثبت نام موفق! به VEXORA CHAT خوش آمدید 🎮',
    accessToken, refreshToken,
    user: { id: newUser.id, username: newUser.username, email: newUser.email, avatarUrl: newUser.avatarUrl },
  });
}));

app.post('/api/auth/login', authLimiter, detectSuspiciousActivity, validate(loginSchema), catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });

  if (!user) {
    recordFailedAttempt(req.ip);
    throw new AuthenticationError('ایمیل یا رمز عبور نادرست است');
  }

  await authService.checkAccountLockout(user);

  const isValid = await authService.verifyPassword(password, user.passwordHash);
  if (!isValid) {
    recordFailedAttempt(req.ip);
    await authService.recordFailedLogin(user.id);
    throw new AuthenticationError('ایمیل یا رمز عبور نادرست است');
  }

  clearFailedAttempts(req.ip);
  await authService.clearFailedLogins(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  if (user.twoFactorEnabled) {
    const tempToken = jwt.sign({ id: user.id, step: '2fa_pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    return res.json({ success: true, requires2FA: true, tempToken });
  }

  const { accessToken, refreshToken } = await authService.generateTokenPair(user);
  logger.logActivity(user.id, 'login', { ip: req.ip });

  res.json({
    success: true,
    message: 'ورود موفق! 🎉',
    accessToken, refreshToken,
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, level: user.profile?.level || 1 },
  });
}));

app.post('/api/auth/verify-2fa', catchAsync(async (req, res) => {
  const { tempToken, code } = req.body;
  const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

  if (decoded.step !== '2fa_pending') throw new AuthenticationError('درخواست نامعتبر');

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  const isValid = authService.verify2FAToken(user.twoFactorSecret, code);

  if (!isValid) throw new AuthenticationError('کد تایید نادرست است');

  const { accessToken, refreshToken } = await authService.generateTokenPair(user);
  res.json({ success: true, accessToken, refreshToken, user: { id: user.id, username: user.username } });
}));

app.post('/api/auth/refresh', catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AuthenticationError('Refresh token الزامی است');

  const result = await authService.refreshAccessToken(refreshToken);
  res.json({
    success: true,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}));

app.post('/api/auth/logout', authenticate, catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await authService.revokeRefreshToken(refreshToken);
  logger.logActivity(req.user.id, 'logout');
  res.json({ success: true, message: 'با موفقیت خارج شدید' });
}));

app.post('/api/auth/logout-all', authenticate, catchAsync(async (req, res) => {
  await authService.revokeAllUserTokens(req.user.id);
  res.json({ success: true, message: 'از تمام دستگاه‌ها خارج شدید' });
}));

// ============== 2FA SETUP ==============

app.post('/api/auth/2fa/setup', authenticate, catchAsync(async (req, res) => {
  const { secret, otpauthUrl } = authService.generate2FASecret(req.user.username);
  res.json({ success: true, secret, otpauthUrl });
}));

app.post('/api/auth/2fa/enable', authenticate, catchAsync(async (req, res) => {
  const { secret, token } = req.body;
  const backupCodes = await authService.enable2FA(req.user.id, secret, token);
  res.json({ success: true, message: '2FA فعال شد', backupCodes });
}));

app.post('/api/auth/2fa/disable', authenticate, catchAsync(async (req, res) => {
  await authService.disable2FA(req.user.id);
  res.json({ success: true, message: '2FA غیرفعال شد' });
}));

// ============================================
// USER ROUTES
// ============================================

app.get('/api/users/:id', authenticate, catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      profile: true,
      _count: { select: { chats: true, comments: true } },
    },
  });

  if (!user) throw new NotFoundError('کاربر');

  const { passwordHash, twoFactorSecret, backupCodes, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
}));

app.get('/api/users/me/profile', authenticate, catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  const { passwordHash, twoFactorSecret, backupCodes, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
}));

// ============================================
// CHAT ROUTES
// ============================================

app.get('/api/chats', authenticate, catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [chats, total] = await Promise.all([
    prisma.chat.findMany({
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip, take: limit,
    }),
    prisma.chat.count(),
  ]);

  res.json({
    success: true, data: chats,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

app.post('/api/chats', authenticate, validate(createChatSchema), catchAsync(async (req, res) => {
  const { title, content } = req.body;

  const newChat = await prisma.chat.create({
    data: { userId: req.user.id, title, content },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  });

  await cacheService.cacheDeletePattern('chats:*');
  io.emit('new_chat', newChat);

  res.status(201).json({ success: true, message: 'پیام منتشر شد!', data: newChat });
}));

app.post('/api/chats/:id/like', authenticate, catchAsync(async (req, res) => {
  const chatId = parseInt(req.params.id);

  const existingLike = await prisma.like.findUnique({
    where: { userId_chatId: { userId: req.user.id, chatId } },
  });

  if (existingLike) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existingLike.id } }),
      prisma.chat.update({ where: { id: chatId }, data: { likesCount: { decrement: 1 } } }),
    ]);
    return res.json({ success: true, liked: false });
  }

  await prisma.$transaction([
    prisma.like.create({ data: { userId: req.user.id, chatId } }),
    prisma.chat.update({ where: { id: chatId }, data: { likesCount: { increment: 1 } } }),
  ]);

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (chat.userId !== req.user.id) {
    await prisma.notification.create({
      data: {
        userId: chat.userId, type: 'like',
        title: 'لایک جدید', message: `${req.user.username} پست شما را لایک کرد`,
        metadata: { chatId, likedBy: req.user.id },
      },
    });
    io.to(`user_${chat.userId}`).emit('notification', { type: 'like', chatId });
  }

  res.json({ success: true, liked: true });
}));

// ============================================
// NOTIFICATIONS
// ============================================

app.get('/api/notifications', authenticate, catchAsync(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json({ success: true, notifications, unreadCount });
}));

app.patch('/api/notifications/:id/read', authenticate, catchAsync(async (req, res) => {
  await prisma.notification.update({
    where: { id: parseInt(req.params.id) },
    data: { isRead: true },
  });
  res.json({ success: true });
}));

// ============================================
// STATS
// ============================================

app.get('/api/stats', authenticate, cacheService.cacheMiddleware('stats', 300), catchAsync(async (req, res) => {
  const [totalUsers, totalChats, totalComments, onlineUsers] = await Promise.all([
    prisma.user.count(),
    prisma.chat.count(),
    prisma.comment.count(),
    cacheService.getOnlineUsersCount(),
  ]);

  res.json({ success: true, stats: { totalUsers, totalChats, totalComments, onlineUsers } });
}));

// ============================================
// WEBSOCKET
// ============================================

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  logger.info('User connected via WebSocket', { userId });

  socket.join(`user_${userId}`);
  cacheService.setUserOnline(userId);

  socket.on('direct_message', async ({ receiverId, content }) => {
    const message = await prisma.directMessage.create({
      data: { senderId: userId, receiverId, content },
    });
    io.to(`user_${receiverId}`).emit('direct_message', message);
  });

  socket.on('typing', ({ receiverId }) => {
    io.to(`user_${receiverId}`).emit('typing', { senderId: userId });
  });

  socket.on('heartbeat', () => cacheService.setUserOnline(userId));

  socket.on('disconnect', () => {
    logger.info('User disconnected', { userId });
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');

    cacheService.connectRedis();

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════╗
║     VEXORA CHAT - Server v4.0 🚀          ║
║     http://localhost:${PORT}                    ║
║     ✅ Security: Advanced                  ║
║     ✅ Database: PostgreSQL + Prisma       ║
║     ✅ Cache: Redis                        ║
║     ✅ Real-time: Socket.io                ║
║     Environment: ${process.env.NODE_ENV}                  ║
╚══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();

// ============== GRACEFUL SHUTDOWN ==============

const gracefulShutdown = async () => {
  logger.info('🛑 Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('✅ Server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, server, io };
