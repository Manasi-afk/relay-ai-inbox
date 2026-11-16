import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Client, Mailbox, User } from '../models/index.js';
import { ah, requireAuth, signToken } from '../middleware/auth.js';
import { aiProvider, config } from '../config.js';
import { engineName } from '../services/ai/llm.js';
import { ensureDemoAccount } from '../services/demo.js';

const r = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

r.post('/signup', ah(async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {};
  if (!name.trim()) return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.', field: 'email' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.', field: 'password' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'An account with this email already exists. Try signing in.', field: 'email' });
  const user = await User.create({ name: name.trim(), email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user) });
}));

r.post('/login', ah(async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  if (email.toLowerCase() === config.demo.email) await ensureDemoAccount();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  res.json({ token: signToken(user) });
}));

// One-click demo login for reviewers
r.post('/demo', ah(async (_req, res) => {
  const user = await ensureDemoAccount();
  res.json({ token: signToken(user) });
}));

r.get('/me', requireAuth, ah(async (req, res) => {
  const [client, mailboxes] = await Promise.all([
    Client.findOne({ owner: req.user._id }).lean(),
    Mailbox.find({ owner: req.user._id }).sort({ createdAt: 1 }).lean(),
  ]);
  res.json({
    user: { id: req.user._id, name: req.user.name, email: req.user.email, onboarded: req.user.onboarded, isDemo: req.user.isDemo },
    client,
    mailboxes,
    ai: { provider: aiProvider, engine: engineName() },
  });
}));

export default r;
