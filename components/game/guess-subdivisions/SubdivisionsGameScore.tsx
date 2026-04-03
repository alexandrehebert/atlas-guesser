'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

interface SubdivisionsGameScoreProps {
  showClearAction?: boolean;
}

export default function SubdivisionsGameScore({ showClearAction = false }: SubdivisionsGameScoreProps) {
  const t = useTranslations('subdivisionsGuesser');
  const { score, clearScore } = useSubdivisionsGame();
  const [confirmClear, setConfirmClear] = useState(false);
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <div className="flex min-h-20 flex-col items-center rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_correct_label')}</p>
          </div>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-2xl font-semibold leading-none tabular-nums text-white">{score.correct}</p>
          </div>
        </div>
        <div className="flex min-h-20 flex-col items-center rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_total_label')}</p>
          </div>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-2xl font-semibold leading-none tabular-nums text-white">{score.total}</p>
          </div>
        </div>
        <div className="flex min-h-20 flex-col items-center rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_streak_label')}</p>
          </div>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-2xl font-semibold leading-none tabular-nums text-white">{score.streak}</p>
          </div>
        </div>
        <div className="flex min-h-20 flex-col items-center rounded-xl border border-white/10 bg-white/6 p-3">
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">{t('score_best_streak')}</p>
          </div>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="w-full text-center text-2xl font-semibold leading-none tabular-nums text-white">{score.bestStreak}</p>
          </div>
        </div>
      </div>

      {showClearAction ? (
        confirmClear ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
            <p className="mb-3 text-sm font-medium text-rose-100">{t('clear_scores_confirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearScore();
                  setConfirmClear(false);
                }}
                className="flex-1 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-50 transition hover:border-rose-200/50 hover:bg-rose-500/30"
              >
                {t('clear_scores_confirm_cta')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              >
                {t('clear_scores_cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={!hasScore}
            className={`flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm transition ${hasScore ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-500/15' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
          >
            {t('clear_scores')}
          </button>
        )
      ) : null}
    </div>
  );
}
