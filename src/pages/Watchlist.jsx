import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import ScorePills from '@/components/hunter/ScorePills';
import WatchlistToggle from '@/components/hunter/WatchlistToggle';
import ProspectDetailDialog from '@/components/hunter/ProspectDetailDialog';
import EmailDialog from '@/components/hunter/EmailDialog';
import { fmtDateTime } from '@/lib/utils';

function DeltaBadge({ label, value }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] ${up ? 'text-primary' : 'text-destructive'}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {label} {up ? '+' : ''}{value}
    </span>
  );
}

function WatchedRow({ prospect, onOpenDetail, onOpenEmail }) {
  const { data: history } = useQuery({
    queryKey: ['score-history', prospect.id],
    queryFn: () => api.entities.ScoreHistory.filter({ prospect_id: prospect.id }, '-created_date', 1),
  });
  const latest = history?.[0];

  return (
    <div className="rounded-sm border border-border bg-card p-3 flex items-center justify-between gap-3">
      <button type="button" onClick={() => onOpenDetail(prospect)} className="text-left min-w-0">
        <div className="text-sm font-medium truncate">{prospect.name}</div>
        <div className="font-mono text-[11px] text-muted-foreground truncate">{prospect.facility_type}</div>
        {latest && (
          <div className="flex items-center gap-3 pt-1">
            <DeltaBadge label="Need" value={latest.delta_ai} />
            <DeltaBadge label="Fit" value={latest.delta_fit} />
            <DeltaBadge label="Urg" value={latest.delta_urgency} />
            <span className="font-mono text-[10px] text-muted-foreground">{fmtDateTime(latest.created_date)}</span>
          </div>
        )}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <ScorePills prospect={prospect} size="sm" />
        <WatchlistToggle prospect={prospect} />
      </div>
    </div>
  );
}

export default function Watchlist() {
  const queryClient = useQueryClient();
  const [detailProspect, setDetailProspect] = useState(null);
  const [emailProspect, setEmailProspect] = useState(null);

  const { data: prospects, isLoading } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => api.entities.Prospect.list('-created_date', 500),
  });

  const rescoreMutation = useMutation({
    mutationFn: () => api.functions.invoke('rescoreWatchlist'),
    onSuccess: (result) => {
      toast.success(`Rescored ${result.rescored} prospect(s), ${result.alerts} notable change(s)`);
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['score-history'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const watched = (prospects || []).filter((p) => p.watching);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg uppercase tracking-[0.14em]">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Prospects you're tracking. Re-scored weekly, or on demand.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => rescoreMutation.mutate()} disabled={rescoreMutation.isPending || watched.length === 0}>
          {rescoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Rescore now
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">Loading…</div>
      ) : watched.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">
          Nothing on your watchlist yet. Star a prospect from the Hunter page to track it here.
        </div>
      ) : (
        <div className="space-y-2">
          {watched.map((p) => (
            <WatchedRow key={p.id} prospect={p} onOpenDetail={setDetailProspect} onOpenEmail={setEmailProspect} />
          ))}
        </div>
      )}

      <ProspectDetailDialog
        prospect={detailProspect}
        open={!!detailProspect}
        onOpenChange={(v) => !v && setDetailProspect(null)}
        onEmail={(p) => { setDetailProspect(null); setEmailProspect(p); }}
      />
      <EmailDialog prospect={emailProspect} open={!!emailProspect} onOpenChange={(v) => !v && setEmailProspect(null)} />
    </div>
  );
}
