import jwt from 'jsonwebtoken';
import { fail } from '../utils/response.js';

const secret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export { secret, refreshSecret };

export const requireAuth = (actorType) => (req, res, next) => {
  const raw = req.headers.authorization?.replace('Bearer ', '');
  try {
    const payload = jwt.verify(raw, secret);
    if (payload.actorType !== actorType)
      return fail(res, 'This route is not available for this account.', 403);
    req.auth = payload;
    // Compatibility: also set req.user for routes that use it
    req.user = { id: payload.sub, role: payload.actorType };
    next();
  } catch {
    return fail(res, 'A valid access token is required.', 401);
  }
};
