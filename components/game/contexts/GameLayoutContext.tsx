'use client';

import { createContext, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
export { useGame } from './GameContext';

interface GameLayoutContextValue {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  sidebarRef: RefObject<HTMLDivElement | null>;
  sidebarToggleRef: RefObject<HTMLButtonElement | null>;
  topBarRef: RefObject<HTMLDivElement | null>;
}

const GameLayoutContext = createContext<GameLayoutContextValue | null>(null);

export function GameLayoutProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);

  const value = useMemo<GameLayoutContextValue>(() => ({
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    sidebarRef,
    sidebarToggleRef,
    topBarRef,
  }), [isMobile, sidebarOpen]);

  return <GameLayoutContext.Provider value={value}>{children}</GameLayoutContext.Provider>;
}

export function useGameLayout(): GameLayoutContextValue {
  const context = useContext(GameLayoutContext);
  if (!context) {
    throw new Error('useGameLayout must be used within a GameLayoutProvider');
  }
  return context;
}
