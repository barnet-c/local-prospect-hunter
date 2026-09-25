import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function slugify(label, existingIds) {
  let base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'category';
  let id = base;
  let n = 2;
  while (existingIds.has(id)) { id = `${base}_${n}`; n += 1; }
  return id;
}

export default function TargetCategoriesEditor({ value, onChange }) {
  const [label, setLabel] = useState('');
  const [queries, setQueries] = useState('');

  const categories = value || [];

  const add = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const existingIds = new Set(categories.map((c) => c.id));
    const id = slugify(trimmed, existingIds);
    const queryList = queries.split(',').map((q) => q.trim()).filter(Boolean);
    onChange([...categories, { id, label: trimmed, queries: queryList.length ? queryList : [trimmed.toLowerCase()] }]);
    setLabel('');
    setQueries('');
  };

  const remove = (id) => onChange(categories.filter((c) => c.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.length === 0 && <p className="font-mono text-xs text-muted-foreground">No custom categories yet — add one below.</p>}
        {categories.map((c) => (
          <Badge key={c.id} variant="secondary" className="gap-1.5">
            {c.label}
            <button type="button" onClick={() => remove(c.id)}><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Category name, e.g. Veterinary Clinics" />
        <Input value={queries} onChange={(e) => setQueries(e.target.value)} placeholder="Search terms, comma-separated (optional)" />
        <Button type="button" variant="outline" onClick={add}><Plus className="h-3.5 w-3.5" /> Add</Button>
      </div>
    </div>
  );
}
