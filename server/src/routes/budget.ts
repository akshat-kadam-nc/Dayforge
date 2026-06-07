import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { normaliseDay, scopeRange, type BudgetScope } from '../util/day.js';
import { computeBudget } from '../services/budget.js';

export const budgetRouter = Router();
budgetRouter.use(requireDb, requireAuth);

/**
 * Aggregate the budget across a day/week/month window. The cockpit's Time
 * Budget card uses this to make the scope toggle real: available scales by the
 * number of days in the window; allocated/logged/interrupted are summed over it.
 */
budgetRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const raw = typeof req.query.scope === 'string' ? req.query.scope : 'day';
    const scope: BudgetScope = raw === 'week' || raw === 'month' ? raw : 'day';
    const day = normaliseDay(req.query.day);
    const { start, end, days } = scopeRange(scope, day);
    const agg = await computeBudget(req.userId, start, end, days);
    res.json({ scope, start, end, days, ...agg });
  }),
);
