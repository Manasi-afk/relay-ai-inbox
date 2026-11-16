import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, aiProvider } from './config.js';
import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspace.js';
import threadRoutes from './routes/threads.js';
import insightRoutes from './routes/insights.js';
import portalRoutes from './routes/portal.js';
import { engineName } from './services/ai/llm.js';

const app = express();
app.use(cors({ origin: config.clientOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1, ai: engineName() }));
app.use('/api/auth', authRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/threads', requireAuth, threadRoutes);
app.use('/api', requireAuth, workspaceRoutes);
app.use('/api', requireAuth, insightRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app (single deployable service)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

mongoose
  .connect(config.mongoUri)
  .then(() => {
    app.listen(config.port, () => console.log(`Relay API on http://localhost:${config.port} · AI engine: ${aiProvider === 'heuristic' ? 'built-in rules (set ANTHROPIC_API_KEY or GEMINI_API_KEY for LLM)' : engineName()}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
