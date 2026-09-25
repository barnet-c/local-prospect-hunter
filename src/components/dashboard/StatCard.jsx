export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={`text-2xl font-semibold ${accent ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}
