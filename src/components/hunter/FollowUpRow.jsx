import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/utils';
import ReplyAnalysisCard from '@/components/hunter/ReplyAnalysisCard';

const STATUS_VARIANT = { pending: 'outline', replied: 'default', no_reply: 'secondary' };

export default function FollowUpRow({ followUp, prospect }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: analyses } = useQuery({
    queryKey: ['reply-analyses', followUp.id],
    queryFn: () => api.entities.ReplyAnalysis.filter({ follow_up_id: followUp.id }, '-created_date'),
    enabled: expanded && followUp.status === 'replied',
  });

  const checkMutation = useMutation({
    mutationFn: () => api.functions.invoke('analyzeReply', { follow_up_id: followUp.id }),
    onSuccess: (result) => {
      if (result.found) toast.success('Reply found and analyzed');
      else toast('No new reply yet');
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['reply-analyses', followUp.id] });
    },
    onError: (err) => {
      if (err.code === 'gmail_not_connected') toast.error('Connect Gmail in Settings to check replies.');
      else toast.error(err.message);
    },
  });

  return (
    <div className="rounded-sm border border-border bg-card p-3 space-y-2">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between gap-3 text-left">
        <div>
          <div className="text-sm font-medium">{prospect?.name || 'Unknown prospect'}</div>
          <div className="font-mono text-[11px] text-muted-foreground">Due {fmtDateTime(followUp.due_date)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_VARIANT[followUp.status] || 'secondary'}>{followUp.status.replace('_', ' ')}</Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          {followUp.reply_snippet && (
            <p className="font-mono text-xs text-muted-foreground border-l-2 border-border pl-2">{followUp.reply_snippet}</p>
          )}
          {followUp.status === 'no_reply' && followUp.suggested_message && (
            <div className="rounded-sm border border-border bg-secondary/20 p-3 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Suggested: {followUp.suggested_action}</div>
              <p className="text-sm text-muted-foreground">{followUp.suggested_message}</p>
            </div>
          )}
          {followUp.status === 'replied' && (analyses || []).map((a) => <ReplyAnalysisCard key={a.id} replyAnalysis={a} />)}
          {followUp.status === 'pending' && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}>
                {checkMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Check for reply now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
