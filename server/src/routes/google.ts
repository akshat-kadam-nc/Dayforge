import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { env, isGoogleConfigured } from '../config/env.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { signToken, verifyToken } from '../auth/jwt.js';
import { GoogleAccountModel } from '../models/GoogleAccount.js';
import { BudgetExclusionModel } from '../models/BudgetExclusion.js';
import {
  buildAuthUrl,
  exchangeCode,
  fetchEvents,
  fetchUserInfo,
  getValidAccessToken,
  upsertAccount,
} from '../services/google.js';
import { normaliseDay } from '../util/day.js';

export const googleRouter = Router();
googleRouter.use(requireDb);

const ACCOUNT_COLORS = ['#4285F4', '#0F9D58', '#DB4437', '#F4B400', '#AB47BC', '#00ACC1'];

/** Guards routes that need a configured OAuth client. */
function requireGoogle(_req: Request, _res: Response, next: NextFunction): void {
  if (!isGoogleConfigured) {
    throw new HttpError(503, 'Google Calendar not configured. Set GOOGLE_CLIENT_ID/SECRET in server/.env');
  }
  next();
}

// Whether sync is available + the user's connected accounts (no tokens leaked).
googleRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const accounts = isGoogleConfigured
      ? await GoogleAccountModel.find({ userId: req.userId }).select('email name color enabled createdAt')
      : [];
    res.json({
      configured: isGoogleConfigured,
      accounts: accounts.map((a) => ({ id: a._id, email: a.email, name: a.name, color: a.color, enabled: a.enabled })),
    });
  }),
);

// Build the consent URL; state carries a short-lived signed app-user id.
googleRouter.get(
  '/auth-url',
  requireGoogle,
  requireAuth,
  asyncHandler(async (req, res) => {
    const state = signToken({ userId: String(req.userId) });
    res.json({ url: buildAuthUrl(state) });
  }),
);

// OAuth redirect target. No app JWT here — identity comes from the signed state.
googleRouter.get(
  '/callback',
  requireGoogle,
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const back = (status: string) => res.redirect(`${env.clientOrigin}/settings?google=${status}`);
    if (typeof code !== 'string' || typeof state !== 'string') return back('error');

    let userId: string;
    try {
      userId = verifyToken(state).userId;
    } catch (err) {
      console.error('[google] callback state verify failed', err);
      return back('error');
    }

    try {
      const tokens = await exchangeCode(code);
      const info = await fetchUserInfo(tokens.access_token);
      const count = await GoogleAccountModel.countDocuments({ userId });
      await upsertAccount(userId, info, tokens, ACCOUNT_COLORS[count % ACCOUNT_COLORS.length]);
      console.log(`[google] connected ${info.email} (sub ${info.sub}) for user ${userId}`);
      return back('connected');
    } catch (err) {
      console.error('[google] callback connect failed for user', userId, err);
      return back('error');
    }
  }),
);

const accountPatch = z.object({
  enabled: z.boolean().optional(),
  color: z.string().optional(),
});

googleRouter.patch(
  '/accounts/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = accountPatch.parse(req.body);
    const account = await GoogleAccountModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true },
    ).select('email name color enabled');
    if (!account) throw new HttpError(404, 'Account not found');
    res.json({ account: { id: account._id, email: account.email, name: account.name, color: account.color, enabled: account.enabled } });
  }),
);

googleRouter.delete(
  '/accounts/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await GoogleAccountModel.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) throw new HttpError(404, 'Account not found');
    res.status(204).end();
  }),
);

// Today's (or a range's) events across enabled accounts, with deduction flags.
googleRouter.get(
  '/events',
  requireGoogle,
  requireAuth,
  asyncHandler(async (req, res) => {
    const startKey = normaliseDay(req.query.start);
    const endKey = normaliseDay(req.query.end ?? req.query.start);
    const [sy, sm, sd] = startKey.split('-').map(Number);
    const [ey, em, ed] = endKey.split('-').map(Number);
    const timeMin = new Date(sy, sm - 1, sd, 0, 0, 0).toISOString();
    const timeMax = new Date(ey, em - 1, ed, 23, 59, 59).toISOString();

    const [accounts, exclusions] = await Promise.all([
      GoogleAccountModel.find({ userId: req.userId, enabled: true }),
      BudgetExclusionModel.find({ userId: req.userId }).select('seriesKey'),
    ]);
    const muted = new Set(exclusions.map((e) => e.seriesKey));

    const events = [];
    for (const account of accounts) {
      try {
        const token = await getValidAccessToken(account);
        const items = await fetchEvents(token, timeMin, timeMax);
        for (const e of items) {
          events.push({
            ...e,
            accountId: account._id,
            color: account.color,
            // Default: timed events deduct; all-day and muted series do not.
            deduct: !e.allDay && !muted.has(e.seriesKey),
          });
        }
      } catch (err) {
        console.error(`[google] events fetch failed for ${account.email}`, err);
      }
    }
    res.json({ events });
  }),
);

const excludeInput = z.object({ seriesKey: z.string().min(1), label: z.string().optional() });

// Mute a series (stop it deducting from the budget).
googleRouter.post(
  '/exclude',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = excludeInput.parse(req.body);
    await BudgetExclusionModel.findOneAndUpdate(
      { userId: req.userId, seriesKey: data.seriesKey },
      { userId: req.userId, seriesKey: data.seriesKey, label: data.label },
      { upsert: true, setDefaultsOnInsert: true },
    );
    res.status(201).json({ ok: true });
  }),
);

// Un-mute a series (resume deducting).
googleRouter.delete(
  '/exclude/:seriesKey',
  requireAuth,
  asyncHandler(async (req, res) => {
    await BudgetExclusionModel.deleteOne({ userId: req.userId, seriesKey: req.params.seriesKey });
    res.status(204).end();
  }),
);
