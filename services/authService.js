// ============================================
// VEXORA CHAT - Advanced Authentication Service
// Refresh Tokens + 2FA + Password Reset
// ============================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { PrismaClient } = require('@prisma/client');
const { AuthenticationError, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';
const BCRYPT_ROUNDS = 12;

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  return token;
};

const generateTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);
  return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshTokenValue) => {
  const hashedToken = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: hashedToken,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!storedToken) {
    throw new AuthenticationError('Refresh token نامعتبر یا منقضی شده است');
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  const newAccessToken = generateAccessToken(storedToken.user);
  const newRefreshToken = await generateRefreshToken(storedToken.user.id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: storedToken.user,
  };
};

const revokeRefreshToken = async (refreshTokenValue) => {
  const hashedToken = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashedToken },
    data: { revoked: true },
  });
};

const revokeAllUserTokens = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';

  return { checks, score, strength };
};

const createPasswordResetToken = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    logger.logSecurityEvent?.('password_reset_unknown_email', { email });
    return null;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  return { resetToken, user };
};

const resetPasswordWithToken = async (resetTokenValue, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(resetTokenValue).digest('hex');

  const storedToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashedToken,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedToken) {
    throw new ValidationError('لینک بازیابی رمز نامعتبر یا منقضی شده است');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { used: true },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { revoked: true },
    }),
  ]);

  return true;
};

const generate2FASecret = (username) => {
  const secret = speakeasy.generateSecret({
    name: `VEXORA CHAT (${username})`,
    length: 20,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
};

const verify2FAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
};

const enable2FA = async (userId, secret, verificationToken) => {
  const isValid = verify2FAToken(secret, verificationToken);

  if (!isValid) {
    throw new ValidationError('کد تایید نامعتبر است');
  }

  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
      backupCodes: hashedBackupCodes,
    },
  });

  return backupCodes;
};

const disable2FA = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: null,
      twoFactorEnabled: false,
      backupCodes: [],
    },
  });
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;

const checkAccountLockout = async (user) => {
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new AuthenticationError(
      `حساب شما به دلیل تلاش‌های ناموفق مکرر، تا ${minutesLeft} دقیقه دیگر قفل است`
    );
  }
};

const recordFailedLogin = async (userId) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
  });

  if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION),
        failedLoginAttempts: 0,
      },
    });
    logger.logSecurityEvent?.('account_locked', { userId });
  }
};

const clearFailedLogins = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  hashPassword,
  verifyPassword,
  checkPasswordStrength,
  createPasswordResetToken,
  resetPasswordWithToken,
  generate2FASecret,
  verify2FAToken,
  enable2FA,
  disable2FA,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
};
