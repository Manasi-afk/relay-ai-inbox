// Resets the demo account (demo@relay.app) to a fresh state.
import mongoose from 'mongoose';
import { config } from '../config.js';
import { ensureDemoAccount } from '../services/demo.js';

await mongoose.connect(config.mongoUri);
await ensureDemoAccount({ reset: true });
console.log('Demo account reset.');
await mongoose.disconnect();
