import { cn } from '@/lib/utils';
import { scoreTier } from '@/lib/constants';

function Pill({ label, value, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5 rounded-sm border border-border px-2 py-1 min-w-[3.25rem]', className)}>
      <span className="font-mono text-sm font-semibold leading-none">{value ?? '–'}</span>
      <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground leading-none">{label}</span>
    </div>
  );
}

export default function ScorePills({ prospect, size = 'default' }) {
  if (!prospect.scored) {
    return <span className="font-mono text-[11px] text-muted-foreground italic">Not scored</span>;
  }
  if (prospect.score_error) {
    return <span className="font-mono text-[11px] text-destructive">Score failed</span>;
  }
  const tier = scoreTier(prospect.ai_score);
  const tierClass = tier === 'Hot' ? 'border-primary text-primary' : tier === 'Warm' ? 'border-accent text-accent' : 'border-border text-muted-foreground';

  return (
    <div className={cn('flex items-center gap-1.5', size === 'sm' && 'gap-1')}>
      <Pill label="Need" value={prospect.ai_score} className={tierClass} />
      <Pill label="Fit" value={prospect.fit_score} />
      <Pill label="Urg" value={prospect.urgency_score} />
    </div>
  );
}
