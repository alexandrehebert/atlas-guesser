"use client";

import { useState } from 'react';
import { useGameLayout } from './contexts/GameLayoutContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import GameOptions from './GameOptions';
import GamePrompt from './GamePrompt';
import GameResult from './GameResult';
import GameScore from './GameScore';
import { useGame } from './contexts/GameContext';
import { useTranslations } from 'next-intl';
import { MAP_MODES } from './constants';

export default function GameSidebar() {
  const t = useTranslations('guesser');
  const { showOptions, mode, answer } = useGame();
  const { sidebarOpen, setSidebarOpen, sidebarRef, sidebarToggleRef } = useGameLayout();
  const [suppressCollapsedPreview, setSuppressCollapsedPreview] = useState(false);

  // Responsive sidebar: right column on desktop, bottom bar on mobile
  const desktopWrapperClass =
    'z-40 absolute top-[5rem] right-3 flex w-[min(92vw,23rem)] flex-col gap-3 transition-all duration-300' +
    (sidebarOpen
      ? ' translate-x-0 opacity-100'
      : ` translate-x-[calc(100%-1rem)] opacity-100 ${suppressCollapsedPreview ? '' : 'hover:translate-x-[calc(100%-1.5rem)] focus-visible:translate-x-[calc(100%-1.5rem)]'}`);

  return (
    <div
      ref={sidebarRef}
      className={desktopWrapperClass}
      onClick={() => {
        if (!sidebarOpen) {
          setSuppressCollapsedPreview(false);
          setSidebarOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (!sidebarOpen && suppressCollapsedPreview) {
          setSuppressCollapsedPreview(false);
        }
      }}
      role={!sidebarOpen ? 'button' : undefined}
      tabIndex={!sidebarOpen ? 0 : -1}
      onKeyDown={!sidebarOpen ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSidebarOpen(true);
        }
      } : undefined}
      aria-label={!sidebarOpen ? t('expand_sidebar') : undefined}
    >
      <aside
        className="relative h-fit max-h-[calc(100dvh-6.5rem)] rounded-3xl border border-white/12 bg-slate-950/88 shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-md pointer-events-auto flex flex-col"
      >
        {/* Sidebar toggle at the edge of the sidebar on desktop */}
        {(() => {
          const t = useTranslations('guesser');
          const { sidebarOpen, setSidebarOpen } = useGameLayout();
          return (
            <button
              ref={sidebarToggleRef}
              type="button"
                onClick={() => {
                  const willOpen = !sidebarOpen;
                  setSuppressCollapsedPreview(!willOpen);
                  setSidebarOpen(willOpen);
                }}
                className={`absolute -left-16 top-1/2 -translate-y-1/2 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-slate-950/85 text-slate-100 shadow-xl backdrop-blur-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-slate-900 hover:border-white/20 ${!sidebarOpen ? 'hover:scale-105 focus-visible:scale-105' : ''}`}
              aria-label={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
            >
              {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          );
        })()}
        {/* Sidebar content wrapper: always visible, even when folded */}
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-4 transition-all duration-300">
          {/* Instruction always above the answer card, outside the border */}
          {!answer && (
            <div className="mb-0 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              {MAP_MODES.has(mode) ? t('instruction_map') : t('instruction_choices')}
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <GamePrompt />
            {showOptions ? <GameOptions /> : null}
            {/* Only show GameResult if there is an answer, to avoid ghost card */}
            {answer && (
              <div className="mt-3">
                <GameResult />
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="rounded-3xl border border-white/12 bg-slate-950/88 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md pointer-events-auto">
        <GameScore />
      </div>
    </div>
  );
}
