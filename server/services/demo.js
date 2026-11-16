import bcrypt from 'bcryptjs';
import { Activity, Client, Mailbox, Thread, User } from '../models/index.js';
import { config } from '../config.js';
import { startSync } from './mail.js';

const waitFor = async (id) => {
  for (let i = 0; i < 120; i++) {
    const m = await Mailbox.findById(id).lean();
    if (m.status !== 'syncing') return;
    await new Promise((r) => setTimeout(r, 250));
  }
};

/** Creates (or returns) a fully onboarded demo assistant with two connected mailboxes. */
export async function ensureDemoAccount({ reset = false } = {}) {
  let user = await User.findOne({ email: config.demo.email });
  if (user && reset) {
    await Promise.all([Thread.deleteMany({ owner: user._id }), Mailbox.deleteMany({ owner: user._id }), Client.deleteMany({ owner: user._id }), Activity.deleteMany({ owner: user._id })]);
    await user.deleteOne();
    user = null;
  }
  if (user) return user;

  user = await User.create({
    name: 'Riya Sharma', email: config.demo.email, passwordHash: await bcrypt.hash(config.demo.password, 10), onboarded: true, isDemo: true,
  });
  const client = await Client.create({ owner: user._id, name: 'Ananya Rao', email: 'ananya@lumenhealth.co', title: 'Founder & CEO', company: 'Lumen Health' });
  const work = await Mailbox.create({ owner: user._id, client: client._id, provider: 'gmail', address: 'ananya@lumenhealth.co' });
  const personal = await Mailbox.create({ owner: user._id, client: client._id, provider: 'outlook', address: 'ananya.rao@outlook.com' });
  await startSync(work._id);
  await startSync(personal._id);
  await Promise.all([waitFor(work._id), waitFor(personal._id)]);
  return user;
}
