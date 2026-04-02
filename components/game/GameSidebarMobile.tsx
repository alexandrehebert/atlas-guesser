"use client";

import { useState } from 'react';
import { useGameLayout } from './contexts/GameLayoutContext';
import GameOptions from './GameOptions';
import GamePrompt from './GamePrompt';
import GameResult from './GameResult';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useGame } from './contexts/GameContext';
import { useTranslations } from 'next-intl';
import { MAP_MODES } from './constants';

export default function GameSidebarMobile() {
  const t = useTranslations('guesser');
  const { showOptions, mode, answer } = useGame();
  const { sidebarOpen, setSidebarOpen, sidebarRef, sidebarToggleRef } = useGameLayout();
  const [suppressCollapsedPreview, setSuppressCollapsedPreview] = useState(false);

  // Mobile sidebar: bottom sheet, full width, rounded, toggle at top center
  return (
    <div
      ref={sidebarRef}
      className={
        `fixed left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-center transition-all duration-300` +
        (sidebarOpen
          ? ' translate-y-0 opacity-100 pointer-events-auto'
          : ` translate-y-[90%] opacity-100 pointer-events-auto ${suppressCollapsedPreview ? '' : 'hover:translate-y-[86%] focus-visible:translate-y-[86%]'}`)
      }
      style={{ boxSizing: 'border-box' }}
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
      {/* Button always outside and above the column, constant gap */}
      <button
        ref={sidebarToggleRef}
        type="button"
        onClick={() => {
          const willOpen = !sidebarOpen;
          setSuppressCollapsedPreview(!willOpen);
          setSidebarOpen(willOpen);
        }}
        className={`absolute left-1/2 -top-12 z-50 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-white/12 bg-slate-950/85 text-slate-100 shadow-xl backdrop-blur-sm transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-slate-900 hover:border-white/20 ${!sidebarOpen ? 'hover:scale-105 focus-visible:scale-105' : ''}`}
        aria-label={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
      >
        {sidebarOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
      </button>
      <div className="relative w-full">
        {/* Sidebar: always rendered, animates in/out */}
        <aside
          className="w-full rounded-t-3xl rounded-b-3xl min-h-0 h-auto max-h-[90dvh] border border-white/12 bg-slate-950/88 shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-md pointer-events-auto flex flex-col"
        >
          <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-4 transition-all duration-300">
            {!answer && (
              <div className="mb-0 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                {MAP_MODES.has(mode) ? t('instruction_map') : t('instruction_choices')}
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <GamePrompt />
              {showOptions ? <GameOptions /> : null}
              {answer && (
                <div className="mt-3">
                  <GameResult />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
