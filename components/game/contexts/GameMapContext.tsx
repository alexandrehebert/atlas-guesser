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

interface GameMapContextValue {
  svgRef: RefObject<SVGSVGElement | null>;
  pathRefs: RefObject<Record<string, SVGPathElement | null>>;
  mapTransform: ZoomTransform;
  zoomBy: (factor: number) => void;
  resetZoom: () => void;
  focusCountry?: (countryCode: string) => void;
}

const GameMapContext = createContext<GameMapContextValue | null>(null);

export function GameMapProvider({ children }: { children: ReactNode }) {
  const { mode, round, quiz } = useGame();
  const { isMobile, sidebarOpen } = useGameLayout();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const defaultTransformRef = useRef<ZoomTransform>(DESKTOP_DEFAULT_MAP_TRANSFORM);
  const [mapTransform, setMapTransform] = useState<ZoomTransform>(DESKTOP_DEFAULT_MAP_TRANSFORM);
  const viewBox = quiz.viewBox;
  const focusBoundsByCode = useMemo(() => {
    return new Map(
      quiz.countries
        .filter((country) => country.focusBounds.width > 0 && country.focusBounds.height > 0)
        .map((country) => [country.code, country.focusBounds] as const),
    );
  }, [quiz.countries]);

  const getDefaultMapTransform = useCallback(() => {
    return isMobile ? zoomIdentity : DESKTOP_DEFAULT_MAP_TRANSFORM;
  }, [isMobile]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const svgSelection = select(svgElement);
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        setMapTransform(event.transform);
      });

    zoomBehaviorRef.current = behavior;
    svgSelection.call(behavior);
    svgSelection.call(behavior.transform, defaultTransformRef.current);

    return () => {
      svgSelection.on('.zoom', null);
    };
  }, []);

  useEffect(() => {
    const nextDefaultTransform = getDefaultMapTransform();
    defaultTransformRef.current = nextDefaultTransform;

    if (!svgRef.current || !zoomBehaviorRef.current) return;

    select(svgRef.current)
      .transition()
      .duration(220)
      .call(zoomBehaviorRef.current.transform, nextDefaultTransform);
  }, [getDefaultMapTransform]);

  const focusCountry = useCallback((countryCode: string) => {
    if (!svgRef.current || !zoomBehaviorRef.current || !countryCode) return;

    const pathElement = pathRefs.current[countryCode];
    const bounds = focusBoundsByCode.get(countryCode) || pathElement?.getBBox();
    if (!bounds) return;
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const nextScale = getCountryFocusScale({
      bounds,
      viewBox,
      isMobile,
    });

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
  }, [focusBoundsByCode, isMobile, viewBox.height, viewBox.width, sidebarOpen]);

  useEffect(() => {
    if (MAP_MODES.has(mode)) return;
    focusCountry(round.targetCode);
  }, [focusCountry, mode, round.targetCode]);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svgSelection = select(svgRef.current);
    svgSelection.transition().duration(180).call(zoomBehaviorRef.current.scaleBy, factor);
  }, []);

  const resetZoom = useCallback(() => {
    if (!MAP_MODES.has(mode) && round.targetCode) {
      focusCountry(round.targetCode);
      return;
    }

    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svgSelection = select(svgRef.current);
    svgSelection.transition().duration(220).call(zoomBehaviorRef.current.transform, defaultTransformRef.current);
  }, [focusCountry, mode, round.targetCode]);

  const value = useMemo<GameMapContextValue>(() => ({
    svgRef,
    pathRefs,
    mapTransform,
    zoomBy,
    resetZoom,
    focusCountry,
  }), [mapTransform, zoomBy, resetZoom, focusCountry]);

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
