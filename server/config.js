import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/relay',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  demo: {
    email: 'demo@relay.app',
    password: 'demo1234',
  },
};

export const aiProvider = config.ai.anthropicKey ? 'anthropic' : config.ai.geminiKey ? 'gemini' : 'heuristic';
