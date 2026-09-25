import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, Mail, Clock, Trophy, Eye, Send } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import StatCard from '@/components/dashboard/StatCard';
import DateRangeFilter, { withinRange } from '@/components/dashboard/DateRangeFilter';
import DealSizeSetting from '@/components/dashboard/DealSizeSetting';
import FacilityPieChart from '@/components/dashboard/FacilityPieChart';

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState('30');

  const { data: prospects } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => api.entities.Prospect.list('-created_date', 500),
  });
  const { data: emails } = useQuery({
    queryKey: ['outreach-emails-all'],
    queryFn: () => api.entities.OutreachEmail.list('-created_date', 1000),
  });
  const { data: followUps } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: () => api.entities.FollowUp.list('-created_date', 500),
  });

  const filteredProspects = useMemo(
    () => (prospects || []).filter((p) => withinRange(p.created_date, range)),
    [prospects, range],
  );

  const hotLeads = filteredProspects.filter((p) => (p.ai_score || 0) >= 8);
  const watched = filteredProspects.filter((p) => p.watching);
  const won = filteredProspects.filter((p) => p.status === 'won');
  const sentEmails = (emails || []).filter((e) => e.sent && withinRange(e.sent_at, range));
  const pendingFollowUps = (followUps || []).filter((f) => f.status === 'pending');
  const estimatedRevenue = won.length * Number(user?.avg_deal_size || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg uppercase tracking-[0.14em]">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Pipeline health at a glance.</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Flame} label="Hot leads" value={hotLeads.length} accent />
        <StatCard icon={Mail} label="Prospects" value={filteredProspects.length} />
        <StatCard icon={Send} label="Emails sent" value={sentEmails.length} />
        <StatCard icon={Clock} label="Pending follow-ups" value={pendingFollowUps.length} />
        <StatCard icon={Eye} label="Watchlist" value={watched.length} />
        <StatCard icon={Trophy} label="Est. revenue" value={`$${estimatedRevenue.toLocaleString()}`} accent />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
        <div className="rounded-sm border border-border bg-card p-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Prospects by type</h2>
          <FacilityPieChart prospects={filteredProspects} />
        </div>
        <DealSizeSetting />
      </div>
    </div>
  );
}
