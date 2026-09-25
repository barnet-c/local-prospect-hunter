import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table2, Map as MapIcon, Columns3 } from 'lucide-react';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import HuntForm from '@/components/hunter/HuntForm';
import SearchHistory from '@/components/hunter/SearchHistory';
import DripStatusPanel from '@/components/hunter/DripStatusPanel';
import GmailConnect from '@/components/hunter/GmailConnect';
import TelegramConnect from '@/components/hunter/TelegramConnect';
import EmailTemplatesPanel from '@/components/hunter/EmailTemplatesPanel';
import ProspectTable from '@/components/hunter/ProspectTable';
import ProspectMap from '@/components/hunter/ProspectMap';
import ProspectKanban from '@/components/hunter/ProspectKanban';
import BulkActionBar from '@/components/hunter/BulkActionBar';
import ProspectDetailDialog from '@/components/hunter/ProspectDetailDialog';
import EmailDialog from '@/components/hunter/EmailDialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const VIEWS = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'kanban', label: 'Pipeline', icon: Columns3 },
];

export default function Hunter() {
  const [view, setView] = useState('table');
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [detailProspect, setDetailProspect] = useState(null);
  const [emailProspect, setEmailProspect] = useState(null);

  const { data: prospects, isFetching } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => api.entities.Prospect.list('-created_date', 500),
    refetchInterval: (query) => {
      const data = query.state.data || [];
      return data.some((p) => p.enriching) ? 2000 : false;
    },
  });

  const filtered = useMemo(() => {
    const list = prospects || [];
    return activeSearchId ? list.filter((p) => p.search_id === activeSearchId) : list;
  }, [prospects, activeSearchId]);

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSelectAll = () => setSelected((prev) => {
    if (filtered.length > 0 && filtered.every((p) => prev.has(p.id))) return new Set();
    return new Set(filtered.map((p) => p.id));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg uppercase tracking-[0.14em]">Hunter</h1>
          <p className="text-sm text-muted-foreground">Find and qualify local businesses that need what you sell.</p>
        </div>
        <div className="flex items-center gap-1 rounded-sm border border-border p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm font-mono text-[11px] uppercase tracking-wide',
                view === v.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">
        <div className="space-y-4 min-w-0">
          <BulkActionBar prospects={filtered} selectedIds={selected} onClear={() => setSelected(new Set())} />

          {isFetching && !prospects ? (
            <div className="rounded-sm border border-border bg-card p-10 text-center font-mono text-xs text-muted-foreground">Loading prospects…</div>
          ) : view === 'table' ? (
            <div className="rounded-sm border border-border bg-card overflow-x-auto">
              <ProspectTable
                prospects={filtered}
                selected={selected}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onOpenDetail={setDetailProspect}
                onOpenEmail={setEmailProspect}
              />
            </div>
          ) : view === 'map' ? (
            <ProspectMap prospects={filtered} onOpenDetail={setDetailProspect} />
          ) : (
            <ProspectKanban prospects={filtered} onOpenDetail={setDetailProspect} />
          )}
        </div>

        <div className="space-y-4">
          <HuntForm onHuntStarted={(result) => setActiveSearchId(result.search_id || null)} />
          <SearchHistory activeSearchId={activeSearchId} onSelect={setActiveSearchId} />
          <DripStatusPanel />

          <Accordion type="multiple" className="rounded-sm border border-border bg-card divide-y divide-border">
            <AccordionItem value="integrations">
              <AccordionTrigger className="px-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Integrations
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <GmailConnect />
                <TelegramConnect />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="templates">
              <AccordionTrigger className="px-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Email templates
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <EmailTemplatesPanel />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <ProspectDetailDialog
        prospect={detailProspect}
        open={!!detailProspect}
        onOpenChange={(v) => !v && setDetailProspect(null)}
        onEmail={(p) => { setDetailProspect(null); setEmailProspect(p); }}
      />
      <EmailDialog
        prospect={emailProspect}
        open={!!emailProspect}
        onOpenChange={(v) => !v && setEmailProspect(null)}
      />
    </div>
  );
}
