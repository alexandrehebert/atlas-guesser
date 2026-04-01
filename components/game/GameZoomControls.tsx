'use client';

import { LocateFixed, Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGameMap } from './contexts/GameMapContext';

export default function GameZoomControls() {
  const t = useTranslations('guesser');
  const { zoomBy, resetZoom } = useGameMap();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/12 bg-slate-950/40 p-1 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => zoomBy(1.25)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-slate-950/80 p-2 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20"
        aria-label={t('zoom_in')}
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => zoomBy(0.8)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-slate-950/80 p-2 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20"
        aria-label={t('zoom_out')}
      >
        <Minus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={resetZoom}
        className="inline-flex h-9 w-9 items-center justify-center gap-1 rounded-full border border-white/12 bg-slate-950/80 p-2 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20 md:w-auto md:px-3"
      >
        <LocateFixed className="h-5 w-5" />
        <span className="hidden md:inline">{t('reset_view')}</span>
      </button>
    </div>
  );
}
