'use client';

import GameSettingsMenu from './GameSettingsMenu';
import GameMapViewToggle from './GameMapViewToggle';
import GameZoomControls from './GameZoomControls';
import { useGameLayout } from './contexts/GameLayoutContext';
import { ArrowLeft } from 'lucide-react';
import { RouteLoadingLink } from '~/components/RouteLoadingLink';
import type { ReactNode } from 'react';

interface GameTopBarProps {
  showMapViewToggle?: boolean;
  settingsMenu?: ReactNode;
}

export default function GameTopBar({ showMapViewToggle = true, settingsMenu }: GameTopBarProps) {
  const { topBarRef, isMobile } = useGameLayout();
  return (
    <div ref={topBarRef} className="absolute left-4 right-4 top-4 z-50 flex flex-wrap items-center justify-between gap-2 sm:left-5 sm:right-5 sm:top-5">
      <div className="flex items-center gap-3 select-none">
        <RouteLoadingLink
          href="/"
          aria-label="Go to landing page"
          className="group inline-flex h-8 items-center gap-1 overflow-visible rounded-full border border-white/10 bg-white/5 pl-0 pr-3 shadow-lg backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-200 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_20px_rgba(2,6,23,0.45)] focus-visible:bg-white/10 focus-visible:border-white/20"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-0 w-0 items-center justify-center overflow-hidden rounded-full border border-sky-300/0 bg-sky-400/0 text-slate-100 opacity-0 -translate-x-1 transition-all duration-200 group-hover:ml-1 group-hover:mr-1 group-hover:h-5 group-hover:w-5 group-hover:border-sky-300/35 group-hover:bg-sky-400/15 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:ml-1 group-focus-visible:mr-1 group-focus-visible:h-5 group-focus-visible:w-5 group-focus-visible:border-sky-300/35 group-focus-visible:bg-sky-400/15 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-14 -25 28 28"
            role="img"
            aria-label="Atlas Guesser pin icon"
            className="h-14 w-14 ml-1 drop-shadow-[0_4px_10px_rgba(15,23,42,0.7)]"
            style={{ zIndex: 1 }}
          >
            <path
              d="M 0 0 C -9.5 -9 -11.5 -21.5 0 -21.5 C 11.5 -21.5 9.5 -9 0 0 Z"
              fill="#38bdf8"
              stroke="#f8fafc"
              strokeWidth="1.4"
            />
          </svg>
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-300">Atlas Guesser</span>
        </RouteLoadingLink>
      </div>
      {/* Zoom controls and then settings button */}
      <div className="flex items-center gap-2">
        <GameZoomControls />
        {showMapViewToggle && !isMobile ? <GameMapViewToggle /> : null}
        {settingsMenu ?? <GameSettingsMenu />}
      </div>
    </div>
  );
}
