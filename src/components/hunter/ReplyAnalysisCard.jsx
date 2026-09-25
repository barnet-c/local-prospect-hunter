import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Loader2, Check } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const CATEGORY_VARIANT = {
  interested: 'default',
  not_interested: 'destructive',
  question: 'accent',
  unsubscribe: 'destructive',
  auto_reply: 'secondary',
};

export default function ReplyAnalysisCard({ replyAnalysis }) {
  const [subject, setSubject] = useState(replyAnalysis.draft_subject || '');
  const [body, setBody] = useState(replyAnalysis.draft_body || '');

  useEffect(() => {
    setSubject(replyAnalysis.draft_subject || '');
    setBody(replyAnalysis.draft_body || '');
  }, [replyAnalysis.id]);

  const sendMutation = useMutation({
    mutationFn: () => api.functions.invoke('sendReplyDraft', { reply_analysis_id: replyAnalysis.id, draft_subject: subject, draft_body: body }),
    onSuccess: () => toast.success('Reply sent'),
    onError: (err) => {
      if (err.code === 'gmail_not_connected') toast.error('Connect Gmail in Settings before sending.');
      else if (err.code === 'no_draft') toast.error('No draft available for this reply.');
      else toast.error(err.message);
    },
  });

  return (
    <div className="rounded-sm border border-border bg-secondary/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant={CATEGORY_VARIANT[replyAnalysis.category] || 'secondary'}>{replyAnalysis.category}</Badge>
        <span className="font-mono text-[10px] text-muted-foreground">confidence {Math.round((replyAnalysis.confidence || 0) * 100)}%</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{replyAnalysis.reasoning}</p>

      {replyAnalysis.gmail_draft_id && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`ra-subj-${replyAnalysis.id}`}>Draft subject</Label>
            <Input id={`ra-subj-${replyAnalysis.id}`} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={replyAnalysis.sent} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`ra-body-${replyAnalysis.id}`}>Draft reply</Label>
            <Textarea id={`ra-body-${replyAnalysis.id}`} rows={6} value={body} onChange={(e) => setBody(e.target.value)} disabled={replyAnalysis.sent} className="font-mono text-xs" />
          </div>
          {replyAnalysis.sent ? (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-primary"><Check className="h-3.5 w-3.5" /> Draft sent</div>
          ) : (
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send draft reply
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
