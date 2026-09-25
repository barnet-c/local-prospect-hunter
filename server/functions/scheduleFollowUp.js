export async function maybeScheduleFollowUp({ entities, user, outreachEmail, prospect }) {
  if (outreachEmail.sequence_position !== 'initial') return null;
  if (Number(prospect.ai_score || 0) < 8) return null;

  const existing = entities.FollowUp.filter({ email_id: outreachEmail.id });
  if (existing.length) return existing[0];

  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  return entities.FollowUp.create({
    prospect_id: prospect.id,
    email_id: outreachEmail.id,
    owner_email: user.email,
    to_email: outreachEmail.to_email,
    due_date: dueDate,
    status: 'pending',
  });
}
