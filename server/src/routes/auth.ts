import { Router } from 'express';
import { z } from 'zod';
import { UserModel, hashPassword, verifyPassword } from '../models/User.js';
import { signToken } from '../auth/jwt.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

export const authRouter = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

function publicUser(user: {
  _id: unknown;
  email: string;
  name: string;
  onboarded?: boolean;
  routine?: unknown;
}) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    onboarded: !!user.onboarded,
    routine: user.routine ?? null,
  };
}

authRouter.post(
  '/register',
  requireDb,
  asyncHandler(async (req, res) => {
    const { email, password, name } = credentials.parse(req.body);
    const existing = await UserModel.findOne({ email });
    if (existing) throw new HttpError(409, 'An account with that email already exists');

    const user = await UserModel.create({
      email,
      name: name ?? email.split('@')[0],
      passwordHash: await hashPassword(password),
    });

    const token = signToken({ userId: String(user._id) });
    res.status(201).json({ token, user: publicUser(user) });
  }),
);

authRouter.post(
  '/login',
  requireDb,
  asyncHandler(async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }
    const token = signToken({ userId: String(user._id) });
    res.json({ token, user: publicUser(user) });
  }),
);

authRouter.get(
  '/me',
  requireDb,
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.userId);
    if (!user) throw new HttpError(404, 'User not found');
    res.json({ user: publicUser(user) });
  }),
);

const passwordChange = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post(
  '/change-password',
  requireDb,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { newPassword } = passwordChange.parse(req.body);
    const user = await UserModel.findById(req.userId);
    if (!user) throw new HttpError(404, 'User not found');
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    res.json({ ok: true });
  }),
);
