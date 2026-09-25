import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PALETTE = ['#a3e635', '#f97316', '#71717a', '#38bdf8', '#e879f9', '#facc15', '#4ade80', '#fb7185'];

export default function FacilityPieChart({ prospects }) {
  const counts = {};
  for (const p of prospects) {
    const key = p.facility_type || 'Other';
    counts[key] = (counts[key] || 0) + 1;
  }
  const data = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  if (!data.length) {
    return <div className="font-mono text-xs text-muted-foreground text-center py-10">No prospects in this range yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((entry, i) => <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ background: 'hsl(240 6% 10%)', border: '1px solid hsl(240 4% 18%)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
