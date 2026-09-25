import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, Send } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import GmailConnect from '@/components/hunter/GmailConnect';
import TelegramConnect from '@/components/hunter/TelegramConnect';
import TargetCategoriesEditor from '@/components/settings/TargetCategoriesEditor';
import { TIMEZONES, PRESETS, DEFAULT_CATEGORIES } from '@/lib/constants';

function Section({ title, description, children }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    sender_name: user?.sender_name || '',
    email_signature: user?.email_signature || '',
    business_name: user?.business_name || '',
    business_industry: user?.business_industry || '',
    business_niche: user?.business_niche || '',
    business_description: user?.business_description || '',
    avg_deal_size: user?.avg_deal_size ?? 0,
    drip_daily_cap: user?.drip_daily_cap ?? 20,
    briefing_enabled: user?.briefing_enabled ?? false,
    briefing_hour: user?.briefing_hour ?? 8,
    briefing_timezone: user?.briefing_timezone || 'UTC',
    morning_hunt_zip: user?.morning_hunt_zip || '',
    morning_hunt_radius: user?.morning_hunt_radius ?? 10,
    morning_hunt_facility_types: user?.morning_hunt_facility_types || [],
    target_categories: user?.target_categories || [],
  });

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const allCategories = [...DEFAULT_CATEGORIES, ...form.target_categories];
  const toggleMorningType = (id) => set(
    'morning_hunt_facility_types',
    form.morning_hunt_facility_types.includes(id)
      ? form.morning_hunt_facility_types.filter((t) => t !== id)
      : [...form.morning_hunt_facility_types, id],
  );

  const saveMutation = useMutation({
    mutationFn: () => api.auth.updateMe(form),
    onSuccess: async () => { await refresh(); toast.success('Settings saved'); },
    onError: (err) => toast.error(err.message),
  });

  const testBriefingMutation = useMutation({
    mutationFn: () => api.functions.invoke('sendTestBriefingViaAgent'),
    onSuccess: (result) => toast.success(`Test briefing sent via ${result.channels.join(', ')}`),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-mono text-lg uppercase tracking-[0.14em]">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile, business context, and automation preferences.</p>
      </div>

      <Section title="Profile">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sender_name">Sender name (on emails)</Label>
            <Input id="sender_name" value={form.sender_name} onChange={(e) => set('sender_name', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email_signature">Email signature</Label>
          <Textarea id="email_signature" rows={3} value={form.email_signature} onChange={(e) => set('email_signature', e.target.value)} />
        </div>
      </Section>

      <Section title="Your business" description="Used by the AI to write relevant, non-generic outreach.">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="business_name">Business name</Label>
            <Input id="business_name" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="business_industry">Industry</Label>
            <Input id="business_industry" value={form.business_industry} onChange={(e) => set('business_industry', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business_niche">Niche / specialty</Label>
          <Input id="business_niche" value={form.business_niche} onChange={(e) => set('business_niche', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business_description">What you sell</Label>
          <Textarea id="business_description" rows={3} value={form.business_description} onChange={(e) => set('business_description', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avg_deal_size">Average deal size ($)</Label>
          <Input id="avg_deal_size" type="number" min="0" value={form.avg_deal_size} onChange={(e) => set('avg_deal_size', Number(e.target.value) || 0)} />
        </div>
      </Section>

      <Section title="Target categories" description="Custom business categories to search for, in addition to the defaults.">
        <TargetCategoriesEditor value={form.target_categories} onChange={(v) => set('target_categories', v)} />
      </Section>

      <Section title="Daily briefing" description="A summary email/Telegram message sent once per day.">
        <div className="flex items-center justify-between">
          <Label htmlFor="briefing_enabled">Enable daily briefing</Label>
          <Switch id="briefing_enabled" checked={form.briefing_enabled} onCheckedChange={(v) => set('briefing_enabled', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="briefing_hour">Local hour (0-23)</Label>
            <Input id="briefing_hour" type="number" min="0" max="23" value={form.briefing_hour} onChange={(e) => set('briefing_hour', Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={form.briefing_timezone} onValueChange={(v) => set('briefing_timezone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => testBriefingMutation.mutate()} disabled={testBriefingMutation.isPending}>
          {testBriefingMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send test briefing now
        </Button>
      </Section>

      <Section title="Morning auto-hunt" description="Optionally run a hunt automatically before your daily briefing.">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="morning_hunt_zip">ZIP code</Label>
            <Input id="morning_hunt_zip" value={form.morning_hunt_zip} onChange={(e) => set('morning_hunt_zip', e.target.value)} placeholder="Leave blank to disable" />
          </div>
          <div className="space-y-1.5">
            <Label>Radius</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('morning_hunt_radius', p.value)}
                  className={`px-2.5 py-1 rounded-sm font-mono text-[11px] border ${form.morning_hunt_radius === p.value ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Categories</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allCategories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={form.morning_hunt_facility_types.includes(cat.id)} onCheckedChange={() => toggleMorningType(cat.id)} />
                {cat.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Follow-up drip" description="Caps how many drip follow-up emails send per day across all prospects.">
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="drip_daily_cap">Daily cap</Label>
          <Input id="drip_daily_cap" type="number" min="0" value={form.drip_daily_cap} onChange={(e) => set('drip_daily_cap', Number(e.target.value) || 0)} />
        </div>
      </Section>

      <Section title="Integrations">
        <GmailConnect />
        <Separator />
        <TelegramConnect />
      </Section>

      <div className="flex justify-end">
        <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}
