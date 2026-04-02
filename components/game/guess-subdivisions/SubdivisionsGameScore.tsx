'use client';

import { useTranslations } from 'next-intl';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

export default function SubdivisionsGameScore() {
  const t = useTranslations('subdivisionsGuesser');
  const { score } = useSubdivisionsGame();

  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="grid min-h-20 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_correct_label')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.correct}</p>
        </div>
      </div>
      <div className="grid min-h-20 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_total_label')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.total}</p>
        </div>
      </div>
      <div className="grid min-h-20 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_streak_label')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.streak}</p>
        </div>
      </div>
      <div className="grid min-h-20 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_best_streak')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.bestStreak}</p>
        </div>
      </div>
    </div>
  );
}
