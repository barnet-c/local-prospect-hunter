import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function DealSizeSetting() {
  const { user, refresh } = useAuth();
  const [value, setValue] = useState(user?.avg_deal_size ?? '');

  const mutation = useMutation({
    mutationFn: () => api.auth.updateMe({ avg_deal_size: Number(value) || 0 }),
    onSuccess: async () => { await refresh(); toast.success('Saved'); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-2">
      <Label htmlFor="deal-size" className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Avg. deal size</Label>
      <p className="font-mono text-[11px] text-muted-foreground">Used to estimate pipeline revenue from won deals.</p>
      <div className="flex gap-2">
        <Input id="deal-size" type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
