'use client';

import { createContext, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface GameLayoutContextValue {
  isMobile: boolean;
  layoutReady: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  sidebarRef: RefObject<HTMLDivElement | null>;
  sidebarToggleRef: RefObject<HTMLButtonElement | null>;
  topBarRef: RefObject<HTMLDivElement | null>;
}

const GameLayoutContext = createContext<GameLayoutContextValue | null>(null);

export function GameLayoutProvider({ children }: { children: ReactNode }) {
  const { isMobile, isResolved } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);

  const value = useMemo<GameLayoutContextValue>(() => ({
    isMobile,
    layoutReady: isResolved,
    sidebarOpen,
    setSidebarOpen,
    sidebarRef,
    sidebarToggleRef,
    topBarRef,
  }), [isMobile, isResolved, sidebarOpen]);

  return <GameLayoutContext.Provider value={value}>{children}</GameLayoutContext.Provider>;
}

export function useGameLayout(): GameLayoutContextValue {
  const context = useContext(GameLayoutContext);
  if (!context) {
    throw new Error('useGameLayout must be used within a GameLayoutProvider');
  }
  return context;
}
