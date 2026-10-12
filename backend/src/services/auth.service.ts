import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyAccessToken,
} from '../utils/tokens';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { activityRepository } from '../repositories/activity.repository';

const sanitizeUser = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  theme: string;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.avatar,
  theme: user.theme,
  createdAt: user.createdAt,
});

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });

    const tokens = await this.createTokens(user.id, user.email);
    await activityRepository.log({
      userId: user.id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user.id,
    });

    return { user: sanitizeUser(user), ...tokens };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = await this.createTokens(user.id, user.email);
    await activityRepository.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
    });

    return { user: sanitizeUser(user), ...tokens };
  },

  async createTokens(userId: string, email: string) {
    const accessToken = generateAccessToken({ userId, email });
    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedError('Invalid refresh token');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.createTokens(stored.user.id, stored.user.email);
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If the email exists, a reset link will be sent' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    // In production, send email with reset link
    return {
      message: 'If the email exists, a reset link will be sent',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
  },

  async resetPassword(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetExpires: { gt: new Date() } },
    });
    if (!user) throw new UnauthorizedError('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetExpires: null },
    });

    return { message: 'Password reset successful' };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    return sanitizeUser(user);
  },

  async updateProfile(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  }>) {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return sanitizeUser(user);
  },
};
