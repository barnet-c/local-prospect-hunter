import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Crosshair, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PRESETS, DEFAULT_CATEGORIES } from '@/lib/constants';

export default function HuntForm({ onHuntStarted }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const categories = [...(user?.target_categories || []), ...DEFAULT_CATEGORIES];
  const [zip, setZip] = useState(user?.morning_hunt_zip || '');
  const [radius, setRadius] = useState(10);
  const [selected, setSelected] = useState(new Set(categories.map((c) => c.id)));

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const mutation = useMutation({
    mutationFn: () => api.functions.invoke('runHunt', { zip_code: zip, radius_miles: radius, facility_types: [...selected] }),
    onSuccess: (result) => {
      toast.success(`Found ${result.prospects_count} prospects`);
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['searches'] });
      onHuntStarted?.(result);
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!zip.trim()) return toast.error('Enter a ZIP code');
    mutation.mutate();
  };

  return (
    <form onSubmit={submit} className="rounded-sm border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">New hunt</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="zip">ZIP code</Label>
          <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="90210" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="radius">Radius</Label>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setRadius(p.value)}
                className={`px-2.5 py-1 rounded-sm font-mono text-[11px] border transition-colors ${radius === p.value ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Target categories</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selected.has(cat.id)} onCheckedChange={() => toggle(cat.id)} />
              {cat.label}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
        {mutation.isPending ? 'Hunting…' : 'Start hunt'}
      </Button>
    </form>
  );
}
