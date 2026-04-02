'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2, Trash2 } from 'lucide-react';
import { usePathname } from '~/i18n/navigation';
import { RouteLoadingLink } from '~/components/RouteLoadingLink';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';
import { useGameLayout } from '../contexts/GameLayoutContext';
import SubdivisionsGameScore from './SubdivisionsGameScore';
import SubdivisionsCountrySelector from './SubdivisionsCountrySelector';

const PANEL_EXIT_ANIMATION_MS = 220;
const PANEL_SHOW_DELAY_MS = 18;

export default function SubdivisionsGameSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [renderPanel, setRenderPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const t = useTranslations('guesser');
  const tSub = useTranslations('subdivisionsGuesser');
  const { quiz, quizLevelId, score, clearScore, gameMode, switchGameMode, switchQuizLevel, dataSourceSections } = useSubdivisionsGame();
  const { isMobile } = useGameLayout();
  const pathname = usePathname();
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;
  const isWorldMap = !pathname.includes('/subdivisions');
  const hasMultipleLevels = quiz.levels.length > 1;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setConfirmClear(false);
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setRenderPanel(true);
      setPanelVisible(false);
      const id = window.setTimeout(() => setPanelVisible(true), PANEL_SHOW_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    setPanelVisible(false);
    const id = window.setTimeout(() => setRenderPanel(false), PANEL_EXIT_ANIMATION_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-label="Settings"
          className="inline-flex items-center justify-center rounded-full border border-white/12 bg-slate-950/80 p-2 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20"
          onClick={() => {
            setOpen((current) => {
              if (current) setConfirmClear(false);
              return !current;
            });
          }}
        >
          <Settings2 className="h-5 w-5" />
        </button>
        {renderPanel && (
          <div className={`absolute right-0 mt-2 w-[min(26rem,calc(100vw-1rem))] rounded-2xl border border-white/12 bg-slate-950/95 p-4 shadow-xl z-50 flex flex-col gap-4 will-change-[opacity,transform,filter] transition-[opacity,transform,filter] sm:w-80 ${panelVisible ? 'opacity-100 translate-y-0 scale-100 blur-0 pointer-events-auto duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'opacity-0 -translate-y-2 scale-[0.97] blur-[1.5px] pointer-events-none duration-220 ease-[cubic-bezier(0.4,0,1,1)]'}`}>
            {/* Game type switcher */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t('game_type_label')}</span>
              <div className="flex gap-2">
                <RouteLoadingLink
                  href="/guesser"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${isWorldMap ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  {t('game_type_world_map')}
                </RouteLoadingLink>
                <RouteLoadingLink
                  href="/subdivisions"
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${!isWorldMap ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  {t('game_type_subdivisions')}
                </RouteLoadingLink>
              </div>
            </div>

            {/* Country selector — mobile only (desktop has it beside zoom controls) */}
            {isMobile ? <SubdivisionsCountrySelector variant="settings" /> : null}

            {/* Level selector — mobile only (desktop has it in the top bar) */}
            {isMobile && hasMultipleLevels ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{tSub('level_label')}</span>
                <div className="flex gap-2">
                  {quiz.levels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => switchQuizLevel(level.id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${quizLevelId === level.id ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                    >
                      {tSub(`mode.${level.id}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Game mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{tSub('game_mode_label')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => switchGameMode('map-click')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${gameMode === 'map-click' ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  {tSub('game_mode_map_click')}
                </button>
                <button
                  type="button"
                  onClick={() => switchGameMode('highlighted-to-name')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${gameMode === 'highlighted-to-name' ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  {tSub('game_mode_highlighted_to_name')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{tSub('score_section_title')}</span>
              {isMobile ? <SubdivisionsGameScore /> : null}

              {/* Clear score */}
              {confirmClear ? (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
                  <p className="mb-3 text-sm font-medium text-rose-100">{tSub('clear_scores_confirm')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearScore();
                        setConfirmClear(false);
                        setOpen(false);
                      }}
                      className="flex-1 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-50 transition hover:border-rose-200/50 hover:bg-rose-500/30"
                    >
                      {tSub('clear_scores_confirm_cta')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    >
                      {tSub('clear_scores_cancel')}
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
                  <span>{tSub('clear_scores')}</span>
                  <Trash2 className="h-4 w-4 shrink-0" />
                </button>
              )}
            </div>

            {/* Data sources — mobile only (desktop has a map watermark) */}
            {isMobile ? (
              <button
                type="button"
                onClick={() => { setOpen(false); setIsSourcesModalOpen(true); }}
                className="self-start px-0 py-0 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/70 transition hover:text-slate-100/95 focus-visible:text-slate-100/95"
              >
                {tSub('sources.open_button')}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Sources modal (shared for desktop watermark + mobile settings link) */}
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
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200/82">{tSub('sources.open_button')}</p>
                <h2 id="geojson-sources-title" className="mt-2 text-xl font-semibold text-white">{tSub('sources.modal_title')}</h2>
                <p className="mt-1 text-sm text-slate-300">{tSub('sources.modal_body')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(false)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {tSub('sources.close')}
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
                            {tSub('sources.open_link')}
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


