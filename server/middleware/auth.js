import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/index.js';

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: '7d' });

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

// Wrap async handlers so thrown errors reach the error middleware.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
