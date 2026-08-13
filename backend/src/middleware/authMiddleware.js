const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fabrication_super_secret_jwt_key_2026_admin');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Guards the cron-triggered rent-reminder route: accepts either Vercel's
 * own Cron invocation (Authorization: Bearer <CRON_SECRET>, which Vercel
 * sends automatically once CRON_SECRET is set as a project env var) or a
 * normal logged-in admin — so the same endpoint can be triggered manually
 * from the app for testing without a second, unprotected copy of it. */
const authenticateCronOrAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, authenticateCronOrAdmin };
