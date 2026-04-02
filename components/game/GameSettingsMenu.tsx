"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from 'next-intl';
import GameModeSelector from "./GameModeSelector";
import GameScore from "./GameScore";
import { Globe, Map, Settings2, Trash2 } from "lucide-react";
import { useGame } from './contexts/GameContext';
import { useGameLayout } from './contexts/GameLayoutContext';

const PANEL_EXIT_ANIMATION_MS = 220;
const PANEL_SHOW_DELAY_MS = 18;

export default function GameSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [renderPanel, setRenderPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const t = useTranslations('guesser');
  const { clearScore, score, mapView, setMapView } = useGame();
  const { isMobile } = useGameLayout();
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;

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
      const showTimeoutId = window.setTimeout(() => {
        setPanelVisible(true);
      }, PANEL_SHOW_DELAY_MS);
      return () => window.clearTimeout(showTimeoutId);
    }

    setPanelVisible(false);
    const timeoutId = window.setTimeout(() => {
      setRenderPanel(false);
    }, PANEL_EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Settings"
        className="inline-flex items-center justify-center rounded-full border border-white/12 bg-slate-950/80 p-2 text-slate-100 shadow backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-150 hover:bg-slate-900 hover:border-white/20"
        onClick={() => {
          setOpen((current) => {
            if (current) {
              setConfirmClear(false);
            }
            return !current;
          });
        }}
      >
        <Settings2 className="h-5 w-5" />
      </button>
      {renderPanel && (
        <div className={`absolute right-0 mt-2 w-[min(26rem,calc(100vw-1rem))] rounded-2xl border border-white/12 bg-slate-950/95 p-4 shadow-xl z-50 flex flex-col gap-4 will-change-[opacity,transform,filter] transition-[opacity,transform,filter] sm:w-80 ${panelVisible ? 'opacity-100 translate-y-0 scale-100 blur-0 pointer-events-auto duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'opacity-0 -translate-y-2 scale-[0.97] blur-[1.5px] pointer-events-none duration-220 ease-[cubic-bezier(0.4,0,1,1)]'}`}>
          <GameModeSelector />
          {isMobile ? (
            <div className="order-2 flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t('map_view_label')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMapView('globe')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${mapView === 'globe' ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  {t('map_view_globe')}
                </button>
                <button
                  type="button"
                  onClick={() => setMapView('flat')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color] duration-150 ${mapView === 'flat' ? 'border-sky-400/50 bg-sky-500/15 text-sky-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:border-white/16'}`}
                >
                  <Map className="h-4 w-4 shrink-0" />
                  {t('map_view_flat')}
                </button>
              </div>
            </div>
          ) : null}
          {isMobile ? <GameScore /> : null}
          {confirmClear ? (
            <div className="order-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
              <p className="mb-3 text-sm font-medium text-rose-100">{t('clear_scores_confirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearScore();
                    setConfirmClear(false);
                    setOpen(false);
                  }}
                  className="flex-1 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-50 transition-[background-color,border-color,color] duration-150 hover:border-rose-200/50 hover:bg-rose-500/30"
                >
                  {t('clear_scores_confirm_cta')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-[background-color,border-color,color] duration-150 hover:border-white/20 hover:bg-white/10"
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
              className={`order-5 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-[background-color,border-color,color,box-shadow] duration-150 ${hasScore ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-500/15' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
            >
              <span>{t('clear_scores')}</span>
              <Trash2 className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
