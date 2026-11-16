import mongoose from 'mongoose';
import crypto from 'node:crypto';

const { Schema, model } = mongoose;

/* ---------------- User (the personal assistant) ---------------- */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    onboarded: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ---------------- Client (the person the assistant works for) ---------------- */
const clientSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    portalToken: { type: String, default: () => crypto.randomBytes(18).toString('base64url'), index: true },
  },
  { timestamps: true }
);

/* ---------------- Mailbox (a connected Gmail / Outlook account) ---------------- */
const mailboxSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    provider: { type: String, enum: ['gmail', 'outlook'], required: true },
    address: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ['connected', 'syncing', 'error', 'disconnected'], default: 'syncing' },
    syncProgress: { type: Number, default: 0 },
    syncTotal: { type: Number, default: 0 },
    lastSyncedAt: Date,
    lastError: String,
    simulated: { type: Boolean, default: true },
    incomingCursor: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ---------------- Thread (an email conversation) ---------------- */
const personSchema = new Schema({ name: String, email: String }, { _id: false });

const messageSchema = new Schema(
  {
    from: personSchema,
    to: [personSchema],
    date: { type: Date, required: true },
    body: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], default: 'in' },
    sentBy: { type: String, enum: ['client', 'assistant', 'external'], default: 'external' },
  },
  { _id: true }
);

const RESPONSIBILITY = ['assistant', 'client', 'none'];
const CATEGORIES = ['action', 'waiting', 'meeting', 'important', 'general'];

const aiSchema = new Schema(
  {
    responsibility: { type: String, enum: RESPONSIBILITY },
    confidence: Number,
    needsReview: Boolean,
    reason: String,
    summary: String,
    keyPoints: [String],
    categories: [{ type: String, enum: CATEGORIES }],
    dates: [{ _id: false, label: String, date: Date, kind: { type: String, enum: ['meeting', 'deadline', 'event'] } }],
    priority: { type: String, enum: ['high', 'normal', 'low'] },
    clientReason: String,
    engine: String,
    classifiedAt: Date,
    messageCount: Number,
  },
  { _id: false }
);

const threadSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    mailbox: { type: Schema.Types.ObjectId, ref: 'Mailbox', required: true, index: true },
    subject: { type: String, required: true },
    messages: [messageSchema],
    lastMessageAt: { type: Date, index: true },
    unread: { type: Boolean, default: true },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },

    ai: aiSchema,
    responsibility: { type: String, enum: RESPONSIBILITY },
    responsibilitySource: { type: String, enum: ['ai', 'assistant', 'client'], default: 'ai' },
    classifying: { type: Boolean, default: false },

    clientStatus: { type: String, enum: ['handled', 'handover', null], default: null },
    clientNote: String,
    clientActedAt: Date,

    draft: {
      body: String,
      tone: String,
      generatedBy: String,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

threadSchema.virtual('lastMessage').get(function () {
  return this.messages[this.messages.length - 1];
});

/* ---------------- Activity (shared assistant ↔ client timeline) ---------------- */
const activitySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    thread: { type: Schema.Types.ObjectId, ref: 'Thread' },
    actor: { type: String, enum: ['ai', 'assistant', 'client', 'system'], default: 'system' },
    type: String,
    text: String,
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model('User', userSchema);
export const Client = model('Client', clientSchema);
export const Mailbox = model('Mailbox', mailboxSchema);
export const Thread = model('Thread', threadSchema);
export const Activity = model('Activity', activitySchema);
export { RESPONSIBILITY, CATEGORIES };
