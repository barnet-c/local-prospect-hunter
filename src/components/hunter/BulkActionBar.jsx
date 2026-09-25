import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Download, X, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { runWorkerPool } from '@/lib/workerPool';
import { exportProspectsCsv } from '@/lib/exportCsv';

export default function BulkActionBar({ prospects, selectedIds, onClear }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);

  const selectedProspects = prospects.filter((p) => selectedIds.has(p.id));
  if (selectedProspects.length === 0) return null;

  const scoreSelected = async () => {
    setBusy(true);
    setProgress({ done: 0, total: selectedProspects.length });
    await runWorkerPool(
      selectedProspects,
      (p) => api.functions.invoke('scoreProspect', { prospect_id: p.id }),
      4,
      () => setProgress((prev) => ({ ...prev, done: prev.done + 1 })),
    );
    setBusy(false);
    setProgress(null);
    queryClient.invalidateQueries({ queryKey: ['prospects'] });
    toast.success(`Scored ${selectedProspects.length} prospects`);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-primary/40 bg-primary/5 px-4 py-2.5">
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-primary">{selectedProspects.length} selected</span>
        {progress && <span className="text-muted-foreground">({progress.done}/{progress.total})</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={scoreSelected} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Score selected
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exportProspectsCsv(selectedProspects)}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onClear}><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
