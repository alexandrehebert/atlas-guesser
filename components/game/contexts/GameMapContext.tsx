'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { CountryQuizPayload } from '~/lib/server/countryQuiz';
import { DESKTOP_DEFAULT_MAP_TRANSFORM, MAP_MODES } from '../constants';
import { getCountryFocusScale } from '../focusScale';
import { useGame } from './GameContext';
import { useGameLayout } from './GameLayoutContext';

// ── Globe (3D) constants ─────────────────────────────────────────────────────
const DEFAULT_ALT = 1.65;
const MOBILE_ALT  = 1.95;
const FOCUS_ALT   = 1.15;

interface GameMapContextValue {
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

const GameMapContext = createContext<GameMapContextValue | null>(null);

export function GameMapProvider({ children }: { children: ReactNode }) {
  const { mode, round, answer, quiz, mapView } = useGame();
  const { isMobile, sidebarOpen } = useGameLayout();
  const [isMapEngineReady, setIsMapEngineReady] = useState(false);
  const [flatMapMountTick, setFlatMapMountTick] = useState(0);
  const flatMapMountRetryFrameRef = useRef<number | null>(null);

  // ── 3D refs ──────────────────────────────────────────────────────────────
  const globeRef = useRef<any>(null);

  const setGlobeRef = useCallback((globe: any) => {
    globeRef.current = globe;
    setIsMapEngineReady(Boolean(globe));
  }, []);

  // ── 2D refs ──────────────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const defaultTransformRef = useRef<ZoomTransform>(DESKTOP_DEFAULT_MAP_TRANSFORM);
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(DESKTOP_DEFAULT_MAP_TRANSFORM);
  const viewBox = quiz.viewBox;

  const focusBoundsByCode = useMemo(() => {
    return new Map(
      quiz.countries
        .filter((c) => c.focusBounds.width > 0 && c.focusBounds.height > 0)
        .map((c) => [c.code, c.focusBounds] as const),
    );
  }, [quiz.countries]);

  const getDefaultMapTransform = useCallback(() => {
    return isMobile ? zoomIdentity : DESKTOP_DEFAULT_MAP_TRANSFORM;
  }, [isMobile]);

  // ── Wire up d3-zoom when the SVG is mounted (2D mode) ────────────────────
  useEffect(() => {
    if (mapView !== 'flat') return;
    setIsMapEngineReady(false);

    const svgElement = svgRef.current;
    if (!svgElement) {
      flatMapMountRetryFrameRef.current = requestAnimationFrame(() => {
        flatMapMountRetryFrameRef.current = null;
        setFlatMapMountTick((current) => current + 1);
      });
      return () => {
        if (flatMapMountRetryFrameRef.current !== null) {
          cancelAnimationFrame(flatMapMountRetryFrameRef.current);
          flatMapMountRetryFrameRef.current = null;
        }
      };
    }

    const svgSelection = select(svgElement);
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        setMapTransform(event.transform);
      });

    zoomBehaviorRef.current = behavior;
    svgSelection.call(behavior);
    svgSelection.call(behavior.transform, defaultTransformRef.current);
    setIsMapEngineReady(true);

    return () => {
      svgSelection.on('.zoom', null);
      zoomBehaviorRef.current = null;
    };
  }, [flatMapMountTick, mapView]); // re-wire whenever flat view mounts

  useEffect(() => {
    if (mapView === 'globe') {
      setIsMapEngineReady(false);
    }
  }, [mapView]);

  useEffect(() => {
    if (mapView !== 'flat') return;
    const nextDefaultTransform = getDefaultMapTransform();
    defaultTransformRef.current = nextDefaultTransform;

    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.transform, nextDefaultTransform);
  }, [getDefaultMapTransform, mapView]);

  // ── focusCountry — works for both map types ───────────────────────────────
  const focusCountry = useCallback((countryCode: string) => {
    if (!countryCode) return;
    const country = quiz.countries.find((c) => c.code === countryCode);

    if (mapView === 'globe') {
      if (!globeRef.current || !country) return;
      const [lat, lng] = country.latlng;
      globeRef.current.pointOfView({ lat, lng, altitude: FOCUS_ALT }, 800);
      return;
    }

    // Flat (2D)
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const pathElement = pathRefs.current[countryCode];
    const bounds = focusBoundsByCode.get(countryCode) || pathElement?.getBBox();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const nextScale = getCountryFocusScale({ bounds, viewBox, isMobile });
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const targetCenterX = !isMobile && sidebarOpen ? viewBox.width * 0.44 : viewBox.width / 2;
    const targetCenterY = isMobile && sidebarOpen ? viewBox.height * 0.34 : viewBox.height / 2;
    const nextTransform = zoomIdentity
      .translate(targetCenterX - nextScale * centerX, targetCenterY - nextScale * centerY)
      .scale(nextScale);

    select(svgRef.current)
      .transition()
      .duration(260)
      .call(zoomBehaviorRef.current.transform, nextTransform);
  }, [focusBoundsByCode, isMobile, mapView, quiz.countries, sidebarOpen, viewBox]);

  // Auto-focus behavior:
  // - Before answering: keep country-to-X modes focused on the target.
  // - After answering: always center/zoom to the correct target country.
  useEffect(() => {
    if (!isMapEngineReady) return;

    if (answer && round.targetCode) {
      focusCountry(round.targetCode);
      return;
    }

    if (MAP_MODES.has(mode)) return;
    focusCountry(round.targetCode);
  }, [answer, focusCountry, isMapEngineReady, mode, round.targetCode]);

  // ── zoomBy ────────────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    if (mapView === 'globe') {
      if (!globeRef.current) return;
      const pov = globeRef.current.pointOfView();
      const newAlt = Math.max(0.4, Math.min(6.0, (pov?.altitude ?? DEFAULT_ALT) / factor));
      globeRef.current.pointOfView({ ...pov, altitude: newAlt }, 300);
      return;
    }
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(180).call(zoomBehaviorRef.current.scaleBy, factor);
  }, [mapView]);

  // ── resetZoom ─────────────────────────────────────────────────────────────
  const resetZoom = useCallback(() => {
    if (!MAP_MODES.has(mode) && round.targetCode) {
      focusCountry(round.targetCode);
      return;
    }
    if (mapView === 'globe') {
      if (!globeRef.current) return;
      const pov = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ ...pov, altitude: isMobile ? MOBILE_ALT : DEFAULT_ALT }, 500);
      return;
    }
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.transform, defaultTransformRef.current);
  }, [focusCountry, isMobile, mapView, mode, round.targetCode]);

  const value = useMemo<GameMapContextValue>(() => ({
    globeRef,
    setGlobeRef,
    svgRef,
    pathRefs,
    mapTransform,
    zoomBy,
    resetZoom,
    focusCountry,
  }), [mapTransform, zoomBy, resetZoom, focusCountry, setGlobeRef]);

  return <GameMapContext.Provider value={value}>{children}</GameMapContext.Provider>;
}

export function useGameMap(): GameMapContextValue {
  const context = useContext(GameMapContext);
  if (!context) {
    throw new Error('useGameMap must be used within a GameMapProvider');
  }
  return context;
}

export type { CountryQuizPayload };



