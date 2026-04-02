'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGame } from './contexts/GameContext';

export default function GameResult() {
  const t = useTranslations('guesser');
  const { answer, targetCountry, nextRound } = useGame();

  const renderResultText = (messageKey: 'result_correct' | 'result_wrong') => {
    return t.rich(messageKey, {
      countryName: targetCountry.name,
      capitalName: targetCountry.capital,
      country: (chunks) => (
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-semibold text-white">{chunks}</span>
      ),
      capital: (chunks) => (
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-semibold text-white">{chunks}</span>
      ),
    });
  };

  return (
    <div className={`order-1 rounded-2xl border px-4 py-3 text-sm md:order-1 ${answer ? answer.correct ? 'border-emerald-300/25 bg-emerald-400/12 text-emerald-50' : 'border-rose-300/25 bg-rose-400/12 text-rose-50' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>
      {answer ? (
        answer.correct ? (
          <p>{renderResultText('result_correct')}</p>
        ) : (
          <p>{renderResultText('result_wrong')}</p>
        )
      ) : null}

      {answer ? (
        <button
          type="button"
          onClick={nextRound}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-100"
        >
          {t('next_round')}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
