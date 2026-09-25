import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Sparkles, Loader2, Clock, Check } from 'lucide-react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { STEP_META, POSITION_LABEL } from '@/lib/constants';
import { fmtDateTime } from '@/lib/utils';

function StepPanel({ email, onSaved }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [to, setTo] = useState(email.to_email || '');

  useEffect(() => { setSubject(email.subject); setBody(email.body); setTo(email.to_email || ''); }, [email.id]);

  const saveMutation = useMutation({
    mutationFn: () => api.entities.OutreachEmail.update(email.id, { subject, body, to_email: to }),
    onSuccess: (updated) => { toast.success('Saved'); onSaved(updated); },
    onError: (err) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      return api.functions.invoke('sendGmail', { email_id: email.id, to_email: to });
    },
    onSuccess: async (result) => {
      toast.success('Email sent');
      onSaved(result.email);
      await api.entities.Prospect.update(email.prospect_id, { status: 'contacted' }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
    onError: (err) => {
      if (err.code === 'gmail_not_connected') toast.error('Connect Gmail in Settings before sending.');
      else toast.error(err.message);
    },
  });

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 flex-1">
          <Label htmlFor="to">To</Label>
          <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="contact@business.com" disabled={email.sent} />
        </div>
        {email.sent ? (
          <div className="ml-3 flex items-center gap-1.5 font-mono text-[11px] text-primary shrink-0">
            <Check className="h-3.5 w-3.5" /> Sent {fmtDateTime(email.sent_at)}
          </div>
        ) : email.scheduled_send_at ? (
          <div className="ml-3 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground shrink-0">
            <Clock className="h-3.5 w-3.5" /> Auto-sends {fmtDateTime(email.scheduled_send_at)}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={email.sent} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Body</Label>
        <Textarea id="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} disabled={email.sent} className="font-mono text-xs" />
      </div>

      {email.send_error && <p className="font-mono text-xs text-destructive">{email.send_error}</p>}

      {!email.sent && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save draft'}
          </Button>
          <Button type="button" size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !to}>
            {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send now
          </Button>
        </div>
      )}
    </div>
  );
}

export default function EmailDialog({ prospect, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: emails, isLoading } = useQuery({
    queryKey: ['outreach-emails', prospect?.id],
    queryFn: () => api.entities.OutreachEmail.filter({ prospect_id: prospect.id }, 'step'),
    enabled: open && !!prospect,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.functions.invoke('generateEmail', { prospect_id: prospect.id }),
    onSuccess: () => {
      toast.success('Email sequence generated');
      queryClient.invalidateQueries({ queryKey: ['outreach-emails', prospect.id] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (!prospect) return null;
  const sorted = [...(emails || [])].sort((a, b) => a.step - b.step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prospect.name}</DialogTitle>
          <DialogDescription>3-step cold-email sequence</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto my-8" />
        ) : sorted.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="font-mono text-xs text-muted-foreground">No emails generated yet for this prospect.</p>
            <Button type="button" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate sequence
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={String(sorted[0].step)}>
            <TabsList>
              {sorted.map((email) => (
                <TabsTrigger key={email.id} value={String(email.step)}>
                  {STEP_META[email.step]?.label || POSITION_LABEL[email.sequence_position]}
                  {email.sent && <Check className="h-3 w-3" />}
                </TabsTrigger>
              ))}
            </TabsList>
            {sorted.map((email) => (
              <TabsContent key={email.id} value={String(email.step)}>
                <StepPanel
                  email={email}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ['outreach-emails', prospect.id] })}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
