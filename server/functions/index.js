import { runHunt } from './runHunt.js';
import { scoreProspect } from './scoreProspect.js';
import { enrichProspect } from './enrichProspect.js';
import { generateEmail } from './generateEmail.js';
import { sendGmail } from './sendGmail.js';
import { analyzeReply } from './analyzeReply.js';
import { sendReplyDraft } from './sendReplyDraft.js';
import { processDueFollowUps } from './processDueFollowUps.js';
import { sendDripFollowUps } from './sendDripFollowUps.js';
import { rescoreWatchlist } from './rescoreWatchlist.js';
import { sendDailyBriefing, sendTestBriefingViaAgent } from './sendDailyBriefing.js';
import { checkGmailConnection } from './checkGmailConnection.js';

// admin: true marks functions meant to run as scheduled service-role jobs
// (see server/cron.js). They're still reachable via POST /api/functions/:name
// for manual admin-triggered runs, but never from the regular user-facing UI.
export const FUNCTIONS = {
  runHunt: { handler: runHunt, admin: false },
  scoreProspect: { handler: scoreProspect, admin: false },
  enrichProspect: { handler: enrichProspect, admin: false },
  generateEmail: { handler: generateEmail, admin: false },
  sendGmail: { handler: sendGmail, admin: false },
  analyzeReply: { handler: analyzeReply, admin: false },
  sendReplyDraft: { handler: sendReplyDraft, admin: false },
  checkGmailConnection: { handler: checkGmailConnection, admin: false },
  sendTestBriefingViaAgent: { handler: sendTestBriefingViaAgent, admin: false },
  processDueFollowUps: { handler: processDueFollowUps, admin: true },
  sendDripFollowUps: { handler: sendDripFollowUps, admin: true },
  rescoreWatchlist: { handler: rescoreWatchlist, admin: true },
  sendDailyBriefing: { handler: sendDailyBriefing, admin: true },
};
