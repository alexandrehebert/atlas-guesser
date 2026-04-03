import { Map } from 'lucide-react';

export default function GuesserRouteLoading() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
        <Map className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
      </div>
    </div>
  );
}
