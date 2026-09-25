import { cn } from '@/lib/utils';

const RANGES = [
  { id: '7', label: '7d' },
  { id: '30', label: '30d' },
  { id: '90', label: '90d' },
  { id: 'all', label: 'All' },
];

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            'px-2.5 py-1 rounded-sm font-mono text-[11px] uppercase tracking-wide',
            value === r.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function withinRange(dateStr, range) {
  if (range === 'all') return true;
  if (!dateStr) return false;
  const days = Number(range);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(dateStr).getTime() >= cutoff;
}
