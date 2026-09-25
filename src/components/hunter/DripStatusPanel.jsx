import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { api } from '@/api/client';
import { fmtDateTime } from '@/lib/utils';
import { POSITION_LABEL } from '@/lib/constants';

export default function DripStatusPanel() {
  const { data: emails } = useQuery({
    queryKey: ['outreach-emails', 'pending-drip'],
    queryFn: () => api.entities.OutreachEmail.filter({ sent: false, enabled: true }, 'scheduled_send_at'),
  });

  const scheduled = (emails || []).filter((e) => e.scheduled_send_at);
  if (!scheduled.length) return null;

  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Drip queue
      </h3>
      <div className="space-y-1">
        {scheduled.slice(0, 8).map((e) => (
          <div key={e.id} className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>{POSITION_LABEL[e.sequence_position]}</span>
            <span>{fmtDateTime(e.scheduled_send_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
