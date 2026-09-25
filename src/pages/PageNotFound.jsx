import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="py-24 text-center">
      <Crosshair className="h-8 w-8 mx-auto text-muted-foreground" />
      <div className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">404 · Target not found</div>
      <h1 className="mt-4 font-mono text-3xl font-semibold">This page doesn't exist.</h1>
      <Link to="/" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-wider text-primary underline-offset-4 hover:underline">
        Back to Hunter →
      </Link>
    </div>
  );
}
