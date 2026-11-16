/**
 * Realistic sample mail used by the simulated Gmail / Outlook connections.
 * Placeholders:  {{C}} client first name · {{CF}} client full name · {{A}} assistant name
 *                {{day:+N}} → e.g. "Wednesday, 18 Nov"  (N days from now)
 * `ago` is in hours before "now". `out: true` marks messages sent from the client's mailbox.
 */

export const WORK_THREADS = [
  {
    subject: 'Re: Quarterly review with Meridian Bank',
    unread: true,
    messages: [
      { from: ['Priya Nair', 'priya.nair@meridianbank.com'], ago: 52, body: 'Hi {{C}},\n\nLooking forward to our quarterly relationship review on Thursday. I will bring the updated credit facility terms.\n\nBest,\nPriya' },
      { from: ['Priya Nair', 'priya.nair@meridianbank.com'], ago: 1.5, body: "Hi {{A}},\n\nSomething has come up on our side — could we move Thursday's review to {{day:+3}} at 11:00 AM instead? Please let me know if that works for {{C}}'s calendar and I'll send a fresh invite.\n\nThanks,\nPriya" },
    ],
  },
  {
    subject: 'Board deck – need your sign-off on Q4 numbers',
    unread: true,
    starred: true,
    messages: [
      { from: ['Karan Malhotra', 'karan@lumenhealth.co'], ago: 3, body: "{{C}},\n\nBefore the deck goes to the board I need your personal approval on two things: (1) the revised burn of ₹2.1 Cr/month and (2) whether we disclose the delayed Apollo contract now or after it closes. I don't want to make this call without you.\n\nCan you reply by {{day:+1}} at 6:00 PM?\n\nKaran\nCFO, Lumen Health" },
    ],
  },
  {
    subject: 'Your weekly digest – HealthTech Weekly',
    unread: true,
    messages: [
      { from: ['HealthTech Weekly', 'newsletter@healthtechweekly.com'], ago: 5, body: 'This week in HealthTech: AI triage tools see record adoption, three digital-health startups raise Series B, and what the new DPDP rules mean for patient data.\n\nRead the full issue online.\n\nYou are receiving this because you subscribed. Unsubscribe | Manage preferences' },
    ],
  },
  {
    subject: 'Invoice #INV-2291 – Cloudnest Hosting',
    unread: false,
    messages: [
      { from: ['Neha Kulkarni', 'billing@cloudnest.io'], ago: 20, body: "Hello,\n\nPlease find attached invoice #INV-2291 for ₹1,84,000 for October hosting. Our finance team needs the PO number for this invoice before we can process it — could you share it?\n\nRegards,\nNeha\nCloudnest Billing" },
    ],
  },
  {
    subject: 'Series B term sheet (confidential)',
    unread: true,
    starred: true,
    messages: [
      { from: ['Rohan Kapoor', 'rohan@elevationpartners.vc'], ago: 7, body: "Hi {{C}},\n\nAs discussed, attached is our draft term sheet — strictly confidential. We're proposing a ₹180 Cr pre-money valuation with a 1x non-participating preference. Before we take it to our IC on {{day:+4}}, I'd love your thoughts on the board seat structure.\n\nHappy to jump on a call.\n\nRohan" },
    ],
  },
  {
    subject: 'Booking confirmed – The Table, Colaba',
    unread: false,
    messages: [
      { from: ['The Table', 'reservations@thetable.in'], ago: 26, body: 'Your reservation is confirmed!\n\nGuest: {{CF}}\nParty of 4 · {{day:+5}} at 8:00 PM\n\nThis is an automated message, please do not reply to this email.' },
    ],
  },
  {
    subject: 'Re: Speaker invitation – HLTH India Summit',
    unread: true,
    messages: [
      { from: ['Sana Iqbal', 'sana@hlthindia.com'], ago: 72, body: "Dear {{C}},\n\nWe'd be honoured to have you speak on our 'Future of Preventive Care' panel at HLTH India Summit in Bengaluru.\n\nWarm regards,\nSana" },
      { from: ['{{A}}', '{{MAILBOX}}'], ago: 60, out: true, body: "Hi Sana,\n\nThank you for the invitation. Could you share the date, format and expected audience so I can check {{C}}'s schedule?\n\nBest,\n{{A}}" },
      { from: ['Sana Iqbal', 'sana@hlthindia.com'], ago: 4, body: "Hi {{A}},\n\nThe panel is on {{day:+20}} at 2:30 PM, 45 minutes, ~600 attendees. Could you send over {{C}}'s bio and headshot for the website? We also need her personal confirmation that she'd like to speak, and her view on whether she's comfortable sharing the stage with a competitor CEO.\n\nThanks!\nSana" },
    ],
  },
  {
    subject: 'Follow-up: documents for office lease renewal',
    unread: true,
    messages: [
      { from: ['Imran Shaikh', 'imran@prestigerealty.in'], ago: 30, body: "Dear Sir/Madam,\n\nFollowing up on the KYC documents requested last week for the Lower Parel office lease renewal. We need the company PAN, board resolution and authorised signatory ID by {{day:+2}} to keep the current rent.\n\nRegards,\nImran Shaikh\nPrestige Realty" },
    ],
  },
  {
    subject: 'Partnership proposal – Apollo Clinics',
    unread: false,
    messages: [
      { from: ['Meera Iyer', 'meera.iyer@apolloclinics.com'], ago: 80, body: "Hi {{C}},\n\nWe enjoyed the demo. Could your team share the partnership deck and pricing so we can review internally?\n\nBest,\nMeera" },
      { from: ['{{A}}', '{{MAILBOX}}'], ago: 46, out: true, body: "Hi Meera,\n\nThanks for your interest! Sharing the partnership deck and pricing sheet here. Let us know a convenient time for a follow-up call with {{C}}.\n\nBest regards,\n{{A}}\nOffice of {{CF}}" },
    ],
  },
  {
    subject: 'Revised offer – VP Engineering candidate',
    unread: true,
    messages: [
      { from: ['Divya Menon', 'divya@lumenhealth.co'], ago: 9, body: "Hi {{C}},\n\nAditya (VP Eng candidate) has come back asking for 15% more on fixed compensation plus an extra 0.25% equity. He has a competing offer expiring {{day:+2}}. Do you want to approve the counter-offer or hold at our current number? This is your call.\n\nDivya\nHead of People" },
    ],
  },
  {
    subject: 'Team offsite – venue options',
    unread: false,
    messages: [
      { from: ['Rahul Verma', 'rahul@lumenhealth.co'], ago: 28, body: 'Hi {{A}},\n\nShortlisted 3 venues for the leadership offsite on {{day:+12}} — Lonavala (₹4.2L), Alibaug (₹3.8L) and Karjat (₹3.1L). Can you confirm the booking with whichever works by Friday? All three can do a 9:00 AM start.\n\nRahul' },
    ],
  },
  {
    subject: 'Security alert: new sign-in on Windows',
    unread: false,
    messages: [
      { from: ['Google', 'no-reply@accounts.google.com'], ago: 34, body: 'A new sign-in to your Google Account was detected on a Windows device. If this was you, you don\'t need to do anything. If not, we\'ll help you secure your account.\n\nThis is an automated message.' },
    ],
  },
  {
    subject: 'Coffee next week?',
    unread: true,
    messages: [
      { from: ['Vikram Sethi', 'vikram.sethi@gmail.com'], ago: 11, body: "Hey {{C}}!\n\nIt's been ages. Would love to catch up over coffee next week and hear how the fundraise is going. Any time Tuesday or Wednesday afternoon works for me — what's your availability?\n\nCheers,\nVikram" },
    ],
  },
  {
    subject: 'Interview request – Economic Times',
    unread: true,
    messages: [
      { from: ['Anjali Desai', 'anjali.desai@timesgroup.com'], ago: 14, body: "Dear {{C}},\n\nI'm writing a piece on India's preventive-health startups and would love a comment from you on the record about Lumen's growth and your plans for the next 12 months. My deadline is {{day:+2}} at 5:00 PM.\n\nBest,\nAnjali Desai\nThe Economic Times" },
    ],
  },
  {
    subject: 'Your Uber Business receipt',
    unread: false,
    messages: [
      { from: ['Uber Receipts', 'receipts@uber.com'], ago: 40, body: 'Thanks for riding, {{C}}. Total: ₹642.18 · BKC → Lower Parel. This receipt has been sent to your business profile. Manage preferences.' },
    ],
  },
  {
    subject: 'Re: Wi-Fi issue in the conference room',
    unread: false,
    messages: [
      { from: ['IT Helpdesk', 'it@lumenhealth.co'], ago: 50, body: 'Hi, we\'ve logged the Wi-Fi drop-outs in Conference Room B and will check the access point today.' },
      { from: ['{{A}}', '{{MAILBOX}}'], ago: 48, out: true, body: 'Thanks — please keep me posted, {{C}} has investor calls there this week.' },
      { from: ['IT Helpdesk', 'it@lumenhealth.co'], ago: 22, body: 'Replaced the access point — fixed now. No further action needed from your side.' },
    ],
  },
  {
    subject: 'Appointment reminder – Dr. Shah Clinic',
    unread: true,
    messages: [
      { from: ['Dr. Shah Clinic', 'frontdesk@drshahclinic.in'], ago: 6, body: 'Dear patient,\n\nThis is a reminder for {{CF}}\'s appointment on {{day:+2}} at 9:30 AM. Kindly reply YES to confirm or let us know if you need to reschedule.\n\nDr. Shah Clinic' },
    ],
  },
  {
    subject: 'Re: Contract redlines – Apollo pilot',
    unread: true,
    messages: [
      { from: ['Farah Khan', 'farah@khanlegal.in'], ago: 18, body: "Hi {{C}},\n\nI've marked up the indemnity clause in the Apollo pilot agreement. Their draft asks for an uncapped liability on data breaches — I recommend we push for a cap at 12 months of fees. The commercial call on how hard to push is yours. Let me know before {{day:+3}}.\n\nFarah\nKhan Legal" },
    ],
  },
  {
    subject: 'Quick question about the investor update',
    unread: false,
    messages: [
      { from: ['Tanya Bose', 'tanya@narrativeir.com'], ago: 16, body: "Hi {{A}},\n\nWe're finalising the November investor update. Could you send over the latest MAU numbers and the high-res logo files by tomorrow?\n\nThanks,\nTanya" },
    ],
  },
  {
    subject: 'Visa appointment documents',
    unread: false,
    messages: [
      { from: ['{{A}}', '{{MAILBOX}}'], ago: 70, out: true, body: "Hi Ajay,\n\nCould you confirm whether {{C}}'s Schengen visa appointment slot has been booked, and the list of documents she needs to carry?\n\nThanks,\n{{A}}" },
    ],
    to: ['Ajay Travels', 'ajay@ajaytravels.com'],
  },
];

export const PERSONAL_THREADS = [
  {
    subject: 'Term 2 fee reminder – Greenwood High',
    unread: true,
    messages: [
      { from: ['Greenwood High Accounts', 'accounts@greenwoodhigh.edu.in'], ago: 8, body: 'Dear Parent,\n\nThis is a reminder that Term 2 fees of ₹1,45,000 for Ira Rao (Grade 4) are due by {{day:+6}}. Please complete the payment or share the transaction reference.\n\nAccounts Office' },
    ],
  },
  {
    subject: 'Goa trip – which villa?',
    unread: true,
    messages: [
      { from: ['Arjun Rao', 'arjun.rao@gmail.com'], ago: 12, body: "Hey,\n\nNarrowed it down to two villas for Christmas — the one in Assagao with the pool, or the beach one in Morjim. Which one do you prefer? Need your call by tonight so I can block it.\n\nA" },
    ],
  },
  {
    subject: 'Your order has shipped',
    unread: false,
    messages: [
      { from: ['Amazon.in', 'shipment-tracking@amazon.in'], ago: 15, body: 'Your order of "Kindle Paperwhite" has shipped and will arrive {{day:+2}}. Track your package in Your Orders. This is an automated message.' },
    ],
  },
  {
    subject: 'Membership renewal – Cult Fitness',
    unread: false,
    messages: [
      { from: ['Cult Fitness', 'care@cult.fit'], ago: 30, body: 'Hi {{C}},\n\nYour annual membership is up for renewal. Reply to this email to confirm renewal at ₹18,000 or let us know if you would like to pause it.\n\nTeam Cult' },
    ],
  },
  {
    subject: "Mom's birthday dinner",
    unread: true,
    messages: [
      { from: ['Kavya Rao', 'kavya.rao@outlook.com'], ago: 5, body: "Didi!\n\nPlanning a surprise dinner for Mom on {{day:+6}} at 8:00 PM. Can you make it? Also, your thoughts on gifting her the Kerala retreat?\n\nK" },
    ],
  },
];

/**
 * "Live" mail used by "Simulate new email". Some start new conversations,
 * others reply into existing ones so you can watch the AI re-classify.
 */
export const INCOMING = [
  {
    kind: 'reply',
    matchSubject: 'Partnership proposal – Apollo Clinics',
    message: { from: ['Meera Iyer', 'meera.iyer@apolloclinics.com'], body: "Hi {{A}},\n\nThanks for the deck! Could we set up the follow-up call on {{day:+4}} at 4:00 PM? Please send an invite to me and Dr. Rao.\n\nBest,\nMeera" },
  },
  {
    kind: 'new',
    subject: 'URGENT: Payroll approval needed today',
    message: { from: ['Karan Malhotra', 'karan@lumenhealth.co'], body: "{{C}},\n\nThe bank needs your personal approval on the November payroll batch (₹3.4 Cr) before 4:00 PM today, otherwise salaries slip by a day. It's in your banking app under pending approvals.\n\nKaran" },
  },
  {
    kind: 'new',
    subject: 'You appeared in 14 searches this week',
    message: { from: ['LinkedIn', 'notifications-noreply@linkedin.com'], body: 'Hi {{C}}, you appeared in 14 searches this week. See who\'s looking at your profile. Unsubscribe from these emails.' },
  },
  {
    kind: 'reply',
    matchSubject: 'Invoice #INV-2291 – Cloudnest Hosting',
    message: { from: ['Neha Kulkarni', 'billing@cloudnest.io'], body: 'Hi again — never mind, our finance team found the PO number on the original contract. All sorted, no need to reply!\n\nNeha' },
  },
  {
    kind: 'reply',
    matchSubject: 'Visa appointment documents',
    message: { from: ['Ajay Travels', 'ajay@ajaytravels.com'], body: "Hello {{A}},\n\nThe VFS appointment is booked for {{day:+9}} at 10:15 AM. {{C}} needs to carry her passport, 2 photos and the last 6 months' bank statements. Can you confirm her availability for that slot?\n\nAjay" },
  },
  {
    kind: 'new',
    subject: 'Dinner invitation – Founders Circle',
    message: { from: ['Leena Thomas', 'leena@founderscircle.in'], body: "Dear {{C}},\n\nWe'd love for you to join an intimate founders' dinner on {{day:+10}} at 7:30 PM. Would you personally like to attend? It's a closed-door conversation on fundraising in 2027.\n\nWarmly,\nLeena" },
  },
];

/* ---------------------------- template rendering ---------------------------- */
export function render(str, vars) {
  return str
    .replace(/\{\{day:\+(\d+)\}\}/g, (_, n) => {
      const d = new Date();
      d.setDate(d.getDate() + Number(n));
      return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    })
    .replaceAll('{{CF}}', vars.clientFull)
    .replaceAll('{{C}}', vars.client)
    .replaceAll('{{A}}', vars.assistant)
    .replaceAll('{{MAILBOX}}', vars.mailbox);
}
