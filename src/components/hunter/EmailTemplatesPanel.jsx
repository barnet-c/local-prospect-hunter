import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { api } from '@/api/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { STEP_META, PLACEHOLDERS } from '@/lib/constants';

function TemplateEditor({ position, template }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [enabled, setEnabled] = useState(template?.enabled ?? true);

  useEffect(() => {
    setSubject(template?.subject || '');
    setBody(template?.body || '');
    setEnabled(template?.enabled ?? true);
  }, [template?.id]);

  const mutation = useMutation({
    mutationFn: () => (
      template
        ? api.entities.EmailTemplate.update(template.id, { subject, body, enabled })
        : api.entities.EmailTemplate.create({ sequence_position: position, subject, body, enabled })
    ),
    onSuccess: () => { toast.success('Template saved'); queryClient.invalidateQueries({ queryKey: ['email-templates'] }); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-3 pt-4">
      <div className="flex items-center justify-between">
        <Label>Use custom template</Label>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        When disabled, AI generates this step fresh each time. Placeholders: {PLACEHOLDERS.map((p) => `{{${p.key}}}`).join(', ')}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`subj-${position}`}>Subject</Label>
        <Input id={`subj-${position}`} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Quick question about {{prospect_name}}" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`body-${position}`}>Body</Label>
        <Textarea id={`body-${position}`} rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Save className="h-3.5 w-3.5" /> Save template
        </Button>
      </div>
    </div>
  );
}

export default function EmailTemplatesPanel() {
  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.entities.EmailTemplate.list(),
  });

  const byPosition = Object.fromEntries((templates || []).map((t) => [t.sequence_position, t]));

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">Email templates</h3>
      <Tabs defaultValue="initial">
        <TabsList>
          {Object.values(STEP_META).map((meta) => (
            <TabsTrigger key={meta.position} value={meta.position}>{meta.label}</TabsTrigger>
          ))}
        </TabsList>
        {Object.values(STEP_META).map((meta) => (
          <TabsContent key={meta.position} value={meta.position}>
            <TemplateEditor position={meta.position} template={byPosition[meta.position]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
