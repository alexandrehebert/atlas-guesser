'use client';

import { Globe, Map } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';

export default function GameMapViewToggle() {
  const t = useTranslations('guesser');
  const { mapView, setMapView } = useGame();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/12 bg-slate-950/40 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setMapView('flat')}
        className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2.5 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 md:px-3 ${mapView === 'flat' ? 'border-sky-300/45 bg-sky-400/16' : 'border-white/12 bg-slate-950/80 hover:bg-slate-900 hover:border-white/20'}`}
        aria-label={t('map_view_flat')}
      >
        <Map className="h-4 w-4" />
        <span className="hidden text-xs font-medium uppercase tracking-[0.08em] md:inline">{t('map_view_flat')}</span>
      </button>
      <button
        type="button"
        onClick={() => setMapView('globe')}
        className={`inline-flex h-9 items-center justify-center gap-1 rounded-full border px-2.5 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 md:px-3 ${mapView === 'globe' ? 'border-sky-300/45 bg-sky-400/16' : 'border-white/12 bg-slate-950/80 hover:bg-slate-900 hover:border-white/20'}`}
        aria-label={t('map_view_globe')}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden text-xs font-medium uppercase tracking-[0.08em] md:inline">{t('map_view_globe')}</span>
      </button>
    </div>
  );
}
