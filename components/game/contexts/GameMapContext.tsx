'use client';

import { createContext, useContext, type RefObject } from 'react';
import type { ZoomTransform } from 'd3-zoom';

export interface GameMapContextValue {
  // 3D globe
  globeRef: RefObject<any>;
  setGlobeRef: (globe: any) => void;
  // 2D SVG
  svgRef: RefObject<SVGSVGElement | null>;
  pathRefs: RefObject<Record<string, SVGPathElement | null>>;
  mapTransform: ZoomTransform;
  // Shared controls
  zoomBy: (factor: number) => void;
  resetZoom: () => void;
  focusCountry: (countryCode: string) => void;
}

export const GameMapContext = createContext<GameMapContextValue | null>(null);

export function useGameMap(): GameMapContextValue {
  const context = useContext(GameMapContext);
  if (!context) {
    throw new Error('useGameMap must be used within a GameMapProvider');
  }
  return context;
}
