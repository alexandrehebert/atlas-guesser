'use client';

import { useState, useEffect, type ReactNode } from 'react';
import GameBackground from './GameBackground';
import GameSidebarDesktop from './GameSidebarDesktop';
import GameSidebarMobile from './GameSidebarMobile';
import { useGameLayout } from './contexts/GameLayoutContext';

interface GameShellProps {
  /** Map or main interactive area — rendered full-screen behind everything */
  mapContent: ReactNode;
  /** Content rendered inside the sidebar scrollable area */
  sidebarContent: ReactNode;
  /** Optional footer rendered below the sidebar aside (desktop only) */
  sidebarFooter?: ReactNode;
  /** Optional top bar override — defaults to <GameTopBar /> */
  topBar?: ReactNode;
  /** When true, a full-screen loading overlay is shown */
  isLoading?: boolean;
  /** Content inside the loading overlay (icon, text, etc.) */
  loadingContent?: ReactNode;
  /** When true, renders a subtle grid overlay on the background */
  showBackgroundGrid?: boolean;
}

function SidebarSwitcher({ content, footer }: { content: ReactNode; footer?: ReactNode }) {
  const { isMobile, layoutReady } = useGameLayout();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  if (!hydrated || !layoutReady) return null;
  return isMobile
    ? <GameSidebarMobile>{content}</GameSidebarMobile>
    : <GameSidebarDesktop footer={footer}>{content}</GameSidebarDesktop>;
}

export default function GameShell({
  mapContent,
  sidebarContent,
  sidebarFooter,
  topBar,
  isLoading = false,
  loadingContent,
  showBackgroundGrid = false,
}: GameShellProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <GameBackground showGrid={showBackgroundGrid} />
      {topBar ?? null}
      {/* Map area: always rendered, fade in when ready */}
      <div className={`transition-opacity duration-700 ${isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {mapContent}
      </div>
      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 transition-opacity duration-700 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {loadingContent}
      </div>
      {/* Sidebar */}
      <div className={`block transition-opacity duration-700 ${isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <SidebarSwitcher content={sidebarContent} footer={sidebarFooter} />
      </div>
    </div>
  );
}
