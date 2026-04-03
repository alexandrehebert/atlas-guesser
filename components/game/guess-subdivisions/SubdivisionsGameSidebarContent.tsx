'use client';

import { useTranslations } from 'next-intl';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';

export default function SubdivisionsGameSidebarContent() {
  const t = useTranslations('subdivisionsGuesser');

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
    submitAnswer,
    nextRound,
  } = useSubdivisionsGame();

  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;
  const resultPanelClasses = answer?.correct
    ? 'mt-4 rounded-2xl border border-emerald-300/35 bg-emerald-500/12 px-3 py-3 text-sm text-emerald-50'
    : 'mt-4 rounded-2xl border border-rose-300/35 bg-rose-500/12 px-3 py-3 text-sm text-rose-50';
  const nextRoundButtonClasses = answer?.correct
    ? 'mt-3 inline-flex w-full justify-center rounded-xl border border-emerald-200/45 bg-emerald-500/18 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-50 transition hover:bg-emerald-500/28'
    : 'mt-3 inline-flex w-full justify-center rounded-xl border border-rose-200/45 bg-rose-500/18 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-rose-50 transition hover:bg-rose-500/28';

  return (
    <>
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
          <div className={resultPanelClasses}>
            <p>
              {answer.correct
                ? t('result_correct', { areaName: targetArea?.name ?? '' })
                : t('result_wrong', { areaName: targetArea?.name ?? '' })}
            </p>
            <button
              type="button"
              onClick={nextRound}
              className={nextRoundButtonClasses}
            >
              {t('next_round')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}


