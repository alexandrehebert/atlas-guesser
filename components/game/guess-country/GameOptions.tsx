'use client';

import { Check, X } from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import { useGame } from './contexts/GameContext';
import type { QuizCountry } from '~/lib/server/countryQuiz';

function OptionLabel({ country, mode }: { country: QuizCountry; mode: string }) {
  switch (mode) {
    case 'country-to-capital':
      return <span className="text-base font-medium text-white">{country.capital}</span>;
    case 'country-to-name':
      return <span className="text-base font-medium text-white">{country.name}</span>;
    case 'country-to-flag':
      return (
        <span className="flex items-center justify-center">
          <CountryFlag country={country.name} countryCode={country.code} className="h-11 w-11 rounded-xl ring-2 ring-white/12" />
          <span className="sr-only">{country.name}</span>
        </span>
      );
    default:
      return null;
  }
}

export default function GameOptions() {
  const { mode, round, answer, countriesByCode, isFlagOptionsMode, isCapitalOptionsMode, isNameOptionsMode, submitAnswer } = useGame();

  return (
    <div className={`mt-3 grid gap-2 ${isFlagOptionsMode ? 'grid-cols-4 sm:grid-cols-2' : isCapitalOptionsMode || isNameOptionsMode ? 'grid-cols-2 sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
      {round.optionCodes.map((code) => {
        const country = countriesByCode.get(code);
        if (!country) return null;

        const isSelected = answer?.selectedCode === code;
        const isCorrect = round.targetCode === code;
        const isWrongSelection = Boolean(answer && isSelected && !answer.correct);
        const isCorrectReveal = Boolean(answer && isCorrect);
        const statusIcon = answer && isCorrect
          ? <Check className="h-4.5 w-4.5 text-emerald-100 sm:h-4 sm:w-4" />
          : answer && isSelected && !answer.correct
            ? <X className="h-4.5 w-4.5 text-rose-100 sm:h-4 sm:w-4" />
            : null;
        const statusBadgeClass = isCorrectReveal
          ? 'border-emerald-300/50'
          : isWrongSelection
            ? 'border-rose-300/50'
            : 'border-white/12';
        const buttonClass = answer
          ? isSelected && answer.correct
            ? 'border-emerald-300/45 bg-emerald-400/18'
            : isSelected && !answer.correct
              ? 'border-rose-300/45 bg-rose-400/18'
              : isCorrect
                ? 'border-sky-300/45 bg-sky-400/16'
                : 'border-white/10 bg-white/[0.03]'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/10 hover:border-white/16';

        return (
          <button
            key={code}
            type="button"
            onClick={() => submitAnswer(code)}
            disabled={Boolean(answer)}
            className={`rounded-xl border p-3 transition-[background-color,border-color,color,box-shadow] duration-150 ${isFlagOptionsMode ? 'text-center' : 'text-left'} ${buttonClass}`}
          >
            {isFlagOptionsMode ? (
              <span className="relative flex min-h-11 items-center justify-center">
                <OptionLabel country={country} mode={mode} />
                {statusIcon ? (
                  <span className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border bg-slate-950/92 sm:h-5 sm:w-5 ${statusBadgeClass}`}>
                    {statusIcon}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="flex min-h-11 items-center justify-between gap-2">
                <OptionLabel country={country} mode={mode} />
                {statusIcon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
