'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { useRouter } from '~/i18n/navigation';
import { useGlobalRouteLoading } from '~/components/GlobalRouteLoadingProvider';
import { useAdminGame } from './contexts/AdminGameContext';

export default function AdminGameSidebarContent() {
  const t = useTranslations('subdivisionsGuesser');
  const router = useRouter();
  const { startRouteLoading } = useGlobalRouteLoading();

  const {
    quiz,
    quizLevelId,
    gameMode,
    activeLevel,
    activeAreas,
    answer,
    score,
    targetArea,
    optionCodes,
    areasByCode,
    isChoiceMode,
    promptAreaLabel,
    promptBodyLabel,
    countryName,
    dataSourceSections,
    switchQuizLevel,
    switchGameMode,
    submitAnswer,
    nextRound,
    clearScore,
  } = useAdminGame();

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);

  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;
  const hasMultipleLevels = quiz.levels.length > 1;
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;

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

      {/* Level selector */}
      {hasMultipleLevels ? (
        <div className="flex items-center gap-1 rounded-2xl border border-white/12 bg-slate-950/80 p-1">
          {quiz.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => switchQuizLevel(level.id)}
              className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${quizLevelId === level.id ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
            >
              {t(`mode.${level.id}`)}
            </button>
          ))}
        </div>
      ) : null}

      {/* Active level badge */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
        {t(`top_badge.${activeLevelId}`, { count: activeAreas.length })}
      </div>

      {/* Game mode switcher */}
      <div className="flex items-center gap-1 rounded-2xl border border-white/12 bg-slate-950/80 p-1">
        <button
          type="button"
          onClick={() => switchGameMode('map-click')}
          className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'map-click' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          {t('game_mode_map_click')}
        </button>
        <button
          type="button"
          onClick={() => switchGameMode('highlighted-to-name')}
          className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'highlighted-to-name' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
        >
          {t('game_mode_highlighted_to_name')}
        </button>
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

      {/* Score */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_correct_label')}</p>
            <p className="text-xl font-semibold text-white">{score.correct}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_total_label')}</p>
            <p className="text-xl font-semibold text-white">{score.total}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_streak_label')}</p>
            <p className="text-xl font-semibold text-white">{score.streak}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_best_streak')}</p>
            <p className="text-xl font-semibold text-white">{score.bestStreak}</p>
          </div>
        </div>
      </div>

      {/* Clear score */}
      {confirmClear ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
          <p className="mb-3 text-sm font-medium text-rose-100">{t('clear_scores_confirm')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { clearScore(); setConfirmClear(false); }}
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
          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition ${hasScore ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-500/15' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
        >
          <span>{t('clear_scores')}</span>
        </button>
      )}

      {/* Data sources button */}
      <button
        type="button"
        onClick={() => setIsSourcesModalOpen(true)}
        className="self-start px-0 py-0 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/70 transition hover:text-slate-100/95 focus-visible:text-slate-100/95"
      >
        {t('sources.open_button')}
      </button>

      {/* Sources modal */}
      {isSourcesModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm"
          onClick={() => setIsSourcesModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="geojson-sources-title"
            className="w-full max-w-2xl rounded-[1.75rem] border border-white/12 bg-slate-950/96 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200/82">{t('sources.open_button')}</p>
                <h2 id="geojson-sources-title" className="mt-2 text-xl font-semibold text-white">{t('sources.modal_title')}</h2>
                <p className="mt-1 text-sm text-slate-300">{t('sources.modal_body')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(false)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {t('sources.close')}
              </button>
            </div>
            <div className="mt-5 max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto pr-1">
              {dataSourceSections.map((section) => (
                <section key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-300">{section.title}</h3>
                  <div className="mt-3 space-y-3">
                    {section.items.map((item) => (
                      <div key={`${section.id}-${item.filePath}`} className="rounded-2xl border border-white/8 bg-slate-900/72 p-3">
                        <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-slate-400">{item.filePath}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.sourceLabel}</p>
                        <p className="mt-1 text-sm text-slate-300">{item.note}</p>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
                          >
                            {t('sources.open_link')}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
