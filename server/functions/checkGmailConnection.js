import { getCurrentAppUserConnection, isGmailConfigured } from '../gmail.js';

export async function checkGmailConnection({ user }) {
  if (!isGmailConfigured()) {
    return { connected: false, configured: false };
  }
  const connection = await getCurrentAppUserConnection(user.id);
  if (!connection) {
    return { connected: false, configured: true };
  }
  return { connected: true, configured: true, email: connection.email };
}
