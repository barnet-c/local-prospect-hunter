import FollowUpRow from '@/components/hunter/FollowUpRow';

export default function FollowUpEmailSection({ title, followUps, prospectsById }) {
  if (!followUps.length) return null;
  return (
    <div className="space-y-2">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{title} ({followUps.length})</h2>
      <div className="space-y-2">
        {followUps.map((f) => (
          <FollowUpRow key={f.id} followUp={f} prospect={prospectsById[f.prospect_id]} />
        ))}
      </div>
    </div>
  );
}
