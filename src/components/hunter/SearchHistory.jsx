import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { cn, fmtDateTime } from '@/lib/utils';

export default function SearchHistory({ activeSearchId, onSelect }) {
  const { data: searches } = useQuery({
    queryKey: ['searches'],
    queryFn: () => api.entities.Search.list('-created_date', 20),
  });

  if (!searches?.length) return null;

  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent hunts</h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn('w-full text-left px-2 py-1.5 rounded-sm font-mono text-xs', !activeSearchId ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
        >
          All prospects
        </button>
        {searches.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn('w-full text-left px-2 py-1.5 rounded-sm font-mono text-xs flex justify-between', activeSearchId === s.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <span>{s.zip_code} · {s.radius_miles}mi</span>
            <span>{s.results_count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
