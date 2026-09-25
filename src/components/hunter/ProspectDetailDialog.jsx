import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Phone, MapPin, Mail } from 'lucide-react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ScorePills from '@/components/hunter/ScorePills';
import ProspectEnrichmentDetails from '@/components/hunter/ProspectEnrichmentDetails';
import WatchlistToggle from '@/components/hunter/WatchlistToggle';
import TagInput from '@/components/hunter/TagInput';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { KANBAN_COLUMNS } from '@/lib/constants';

export default function ProspectDetailDialog({ prospect, open, onOpenChange, onEmail }) {
  const queryClient = useQueryClient();
  const [tags, setTags] = useState(prospect?.tags || []);

  const statusMutation = useMutation({
    mutationFn: (status) => api.entities.Prospect.update(prospect.id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  const tagsMutation = useMutation({
    mutationFn: (next) => api.entities.Prospect.update(prospect.id, { tags: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>{prospect.name}</DialogTitle>
              <DialogDescription>{prospect.facility_type}</DialogDescription>
            </div>
            <WatchlistToggle prospect={prospect} />
          </div>
        </DialogHeader>

        <ScorePills prospect={prospect} />

        {(prospect.ai_reason || prospect.ai_detail) && (
          <p className="text-sm text-muted-foreground leading-relaxed">{prospect.ai_reason} {prospect.ai_detail}</p>
        )}

        <div className="space-y-1.5 font-mono text-xs text-muted-foreground">
          {prospect.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" />{prospect.address}</div>}
          {prospect.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{prospect.phone}</div>}
          {prospect.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" />{prospect.email}</div>}
          {prospect.website && (
            <a href={prospect.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />{prospect.website}
            </a>
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stage</span>
          <Select value={prospect.status} onValueChange={(v) => statusMutation.mutate(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KANBAN_COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <TagInput value={tags} onChange={(next) => { setTags(next); tagsMutation.mutate(next); }} />

        <Separator />

        <ProspectEnrichmentDetails prospect={prospect} />

        <button
          type="button"
          onClick={() => onEmail?.(prospect)}
          className="font-mono text-xs uppercase tracking-wide text-primary hover:underline text-left"
        >
          Open outreach sequence →
        </button>
      </DialogContent>
    </Dialog>
  );
}
