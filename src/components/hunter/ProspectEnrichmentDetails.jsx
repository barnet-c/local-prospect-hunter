import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Loader2, Linkedin, Building2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';

export default function ProspectEnrichmentDetails({ prospect }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.functions.invoke('enrichProspect', { prospect_id: prospect.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
    onError: (err) => toast.error(err.message),
  });

  if (!prospect.enriched && !prospect.enriching) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Enrich with AI
      </Button>
    );
  }

  if (prospect.enriching) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching…
      </div>
    );
  }

  if (prospect.enrich_error) {
    return (
      <div className="space-y-2">
        <p className="font-mono text-xs text-destructive">{prospect.enrich_error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {prospect.company_summary && <p className="text-muted-foreground leading-relaxed">{prospect.company_summary}</p>}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {prospect.industry && <div><span className="text-muted-foreground">Industry </span>{prospect.industry}</div>}
        {prospect.employee_count && <div><span className="text-muted-foreground">Employees </span>{prospect.employee_count}</div>}
        {prospect.year_founded && <div><span className="text-muted-foreground">Founded </span>{prospect.year_founded}</div>}
      </div>
      {(prospect.linkedin_url || prospect.linkedin_company_url) && (
        <div className="flex gap-3 font-mono text-xs">
          {prospect.linkedin_url && (
            <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Linkedin className="h-3.5 w-3.5" /> Contact
            </a>
          )}
          {prospect.linkedin_company_url && (
            <a href={prospect.linkedin_company_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              <Building2 className="h-3.5 w-3.5" /> Company
            </a>
          )}
        </div>
      )}
      {prospect.key_contacts?.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Key contacts</div>
          {prospect.key_contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between font-mono text-xs border-b border-border/60 py-1 last:border-0">
              <span>{c.name}{c.title ? ` · ${c.title}` : ''}</span>
              {c.email && <span className="text-muted-foreground">{c.email}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
