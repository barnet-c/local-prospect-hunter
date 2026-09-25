import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import FollowUpEmailSection from '@/components/hunter/FollowUpEmailSection';

export default function FollowUps() {
  const { data: followUps, isLoading } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: () => api.entities.FollowUp.list('-due_date', 300),
  });

  const { data: prospects } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => api.entities.Prospect.list('-created_date', 500),
  });

  const prospectsById = Object.fromEntries((prospects || []).map((p) => [p.id, p]));
  const list = followUps || [];
  const pending = list.filter((f) => f.status === 'pending');
  const replied = list.filter((f) => f.status === 'replied');
  const noReply = list.filter((f) => f.status === 'no_reply');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-lg uppercase tracking-[0.14em]">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">Track sent outreach, replies, and suggested next steps.</p>
      </div>

      {isLoading ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">Loading follow-ups…</div>
      ) : list.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">
          No follow-ups yet. Send an outreach email from the Hunter page to schedule one.
        </div>
      ) : (
        <div className="space-y-8">
          <FollowUpEmailSection title="Awaiting reply" followUps={pending} prospectsById={prospectsById} />
          <FollowUpEmailSection title="Replied" followUps={replied} prospectsById={prospectsById} />
          <FollowUpEmailSection title="No reply" followUps={noReply} prospectsById={prospectsById} />
        </div>
      )}
    </div>
  );
}
