'use client';

import GameSettingsMenu from './GameSettingsMenu';
import GameZoomControls from './GameZoomControls';
import { useGameLayout } from './contexts/GameLayoutContext';

export default function GameTopBar() {
  const { topBarRef } = useGameLayout();
  return (
    <div ref={topBarRef} className="absolute left-4 right-4 top-4 z-50 flex flex-wrap items-center justify-between gap-2 sm:left-5 sm:right-5 sm:top-5">
      <div className="flex items-center gap-3 select-none">
        <span className="inline-flex h-8 items-center gap-1 overflow-visible rounded-full border border-white/10 bg-white/5 pl-1 pr-3 shadow-lg backdrop-blur-sm">
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
        </span>
      </div>
      {/* Zoom controls and then settings button */}
      <div className="flex items-center gap-2">
        <GameZoomControls />
        <GameSettingsMenu />
      </div>
    </div>
  );
}
