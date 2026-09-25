import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Mail, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import ScorePills from '@/components/hunter/ScorePills';
import WatchlistToggle from '@/components/hunter/WatchlistToggle';

export default function ProspectTable({ prospects, selected, onToggleSelect, onToggleSelectAll, onOpenDetail, onOpenEmail }) {
  const queryClient = useQueryClient();
  const [scoringIds, setScoringIds] = useState(new Set());

  const scoreOne = useMutation({
    mutationFn: (id) => api.functions.invoke('scoreProspect', { prospect_id: id }),
    onMutate: (id) => setScoringIds((s) => new Set(s).add(id)),
    onSettled: (_data, _err, id) => {
      setScoringIds((s) => { const n = new Set(s); n.delete(id); return n; });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const allSelected = prospects.length > 0 && prospects.every((p) => selected.has(p.id));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} /></TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Business</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {prospects.map((p) => (
          <TableRow key={p.id}>
            <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={() => onToggleSelect(p.id)} /></TableCell>
            <TableCell>
              {scoringIds.has(p.id) ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : p.scored ? (
                <button type="button" onClick={() => onOpenDetail(p)}>
                  <ScorePills prospect={p} size="sm" />
                </button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => scoreOne.mutate(p.id)}>Score</Button>
              )}
            </TableCell>
            <TableCell>
              <button type="button" onClick={() => onOpenDetail(p)} className="text-left hover:text-primary">
                <div className="font-medium text-sm">{p.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[16rem]">{p.address}</div>
              </button>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{p.facility_type}</TableCell>
            <TableCell className="font-mono text-xs">
              <div className="flex items-center gap-2">
                {p.email && <span className="truncate max-w-[10rem]">{p.email}</span>}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => onOpenEmail(p)} title="Outreach sequence">
                  <Mail className="h-4 w-4" />
                </Button>
                <WatchlistToggle prospect={p} />
              </div>
            </TableCell>
          </TableRow>
        ))}
        {prospects.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-10 font-mono text-xs text-muted-foreground">
              No prospects yet. Run a hunt to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
