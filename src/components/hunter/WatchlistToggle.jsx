import { Eye, EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function WatchlistToggle({ prospect, className }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.entities.Prospect.update(prospect.id, { watching: !prospect.watching }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(prospect.watching && 'text-primary', className)}
      title={prospect.watching ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {prospect.watching ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
}
