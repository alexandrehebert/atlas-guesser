'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';
import GameScore from './GameScore';

export default function GameScoreChip() {
  const t = useTranslations('guesser');
  const { score, scoreLoaded, clearScore } = useGame();
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [confirmClearScore, setConfirmClearScore] = useState(false);
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;

  if (!scoreLoaded) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed right-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-40 lg:hidden">
        <button
          type="button"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/16 bg-slate-950/86 px-3 py-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.52)] backdrop-blur-md"
          onClick={() => {
            setConfirmClearScore(false);
            setIsScoreModalOpen(true);
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            {t('score_correct_label')}
          </span>
          <span className="text-sm font-semibold tabular-nums text-white">{score.correct}</span>
          <span className="text-slate-500">/</span>
          <span className="text-sm font-semibold tabular-nums text-slate-200">{score.total}</span>
        </button>
      </div>

      {isScoreModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm"
          onClick={() => {
            setConfirmClearScore(false);
            setIsScoreModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="world-score-details-title"
            className="w-full max-w-xl rounded-[1.5rem] border border-white/12 bg-slate-950/96 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200/82">{t('score_section_title')}</p>
                <h2 id="world-score-details-title" className="mt-2 text-xl font-semibold text-white">{t('score_section_title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearScore(false);
                  setIsScoreModalOpen(false);
                }}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {t('clear_scores_cancel')}
              </button>
            </div>

            <div className="mt-4">
              <GameScore />
            </div>

            <div className="mt-4">
              {confirmClearScore ? (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
                  <p className="mb-3 text-sm font-medium text-rose-100">{t('clear_scores_confirm')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearScore();
                        setConfirmClearScore(false);
                        setIsScoreModalOpen(false);
                      }}
                      className="flex-1 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-50 transition hover:border-rose-200/50 hover:bg-rose-500/30"
                    >
                      {t('clear_scores_confirm_cta')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearScore(false)}
                      className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    >
                      {t('clear_scores_cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearScore(true)}
                  disabled={!hasScore}
                  className={`flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm transition ${hasScore ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-500/15' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
                >
                  {t('clear_scores')}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
