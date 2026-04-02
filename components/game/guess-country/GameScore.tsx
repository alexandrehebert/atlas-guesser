'use client';

import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';

export default function GameScore() {
  const t = useTranslations('guesser');
  const { score } = useGame();

  return (
    <div className="order-4 grid grid-cols-3 gap-2 md:order-4">
      <div className="grid min-h-24 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_correct_label')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.correct}</p>
        </div>
      </div>
      <div className="grid min-h-24 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_total_label')}</p>
        </div>
        <div className="flex items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.total}</p>
        </div>
      </div>
      <div className="grid min-h-24 grid-rows-2 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_streak_label')}</p>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-semibold leading-none tabular-nums text-white">{score.streak}</p>
        </div>
      </div>
    </div>
  );
}
