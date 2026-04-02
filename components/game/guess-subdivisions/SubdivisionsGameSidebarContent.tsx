'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { useRouter } from '~/i18n/navigation';
import { useGlobalRouteLoading } from '~/components/GlobalRouteLoadingProvider';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

export default function SubdivisionsGameSidebarContent() {
  const t = useTranslations('subdivisionsGuesser');
  const router = useRouter();
  const { startRouteLoading } = useGlobalRouteLoading();

  const {
    quiz,
    activeLevel,
    activeAreas,
    answer,
    targetArea,
    optionCodes,
    areasByCode,
    isChoiceMode,
    promptAreaLabel,
    promptBodyLabel,
    countryName,
    submitAnswer,
    nextRound,
  } = useSubdivisionsGame();

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);

  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;

  return (
    <>
      {/* Country selector */}
      <div ref={countryDropdownRef} className={`relative ${isCountryDropdownOpen ? 'z-20' : ''}`}>
        <div className="rounded-2xl border border-white/12 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-white/10"
          >
            {countryName}
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isCountryDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 py-1 shadow-[0_20px_60px_rgba(2,6,23,0.6)] backdrop-blur-md">
            {quiz.availableCountries.map((country) => {
              const isActiveCountry = country === quiz.country;
              return (
                <button
                  key={country}
                  type="button"
                  onClick={() => {
                    setIsCountryDropdownOpen(false);
                    if (!isActiveCountry) {
                      startRouteLoading();
                      router.push(`/subdivisions/${country}`);
                    }
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.13em] transition ${isActiveCountry ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {t(`countries.${country}`)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Prompt card */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-rose-100">{t(`prompt_eyebrow.${activeLevelId}`)}</p>
        {promptAreaLabel ? <p className="mt-2 text-2xl font-semibold text-white">{promptAreaLabel}</p> : null}
        <p className="mt-1 text-sm text-slate-300">{promptBodyLabel}</p>

        {isChoiceMode ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {optionCodes.map((code) => {
              const optionArea = areasByCode.get(code);
              const isCorrectChoice = code === targetArea?.code;
              const isSelected = answer?.selectedCode === code;
              let stateClasses = 'border-white/10 bg-slate-900/70 text-slate-100 hover:border-white/20 hover:bg-slate-800/70';
              if (answer && isCorrectChoice) {
                stateClasses = 'border-emerald-200/60 bg-emerald-500/25 text-emerald-50';
              } else if (answer && isSelected && !isCorrectChoice) {
                stateClasses = 'border-rose-200/60 bg-rose-500/25 text-rose-50';
              }
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => submitAnswer(code)}
                  disabled={Boolean(answer)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${stateClasses}`}
                >
                  {optionArea?.name ?? code}
                </button>
              );
            })}
          </div>
        ) : null}

        {!answer ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
            {isChoiceMode ? t('instruction_choices') : t('instruction_map')}
          </p>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
            <p>
              {answer.correct
                ? t('result_correct', { areaName: targetArea?.name ?? '' })
                : t('result_wrong', { areaName: targetArea?.name ?? '' })}
            </p>
            <button
              type="button"
              onClick={nextRound}
              className="mt-3 inline-flex w-full justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/20"
            >
              {t('next_round')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}


