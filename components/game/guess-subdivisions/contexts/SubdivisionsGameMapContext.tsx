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
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { GameMapContext, type GameMapContextValue } from '../../contexts/GameMapContext';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const MOBILE_MIN_ZOOM = 0.7;
const MOBILE_MAX_ZOOM = 8;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_FACTOR = 0.8;
const ZOOM_EPSILON = 0.0001;

export interface MapTransformState {
  zoom: number;
  x: number;
  y: number;
}

interface SubdivisionsGameMapContextValue {
  svgRef: RefObject<SVGSVGElement | null>;
  mapTransform: MapTransformState;
  isPanning: boolean;
  mapVisible: boolean;
  setMapVisible: (visible: boolean) => void;
  useLargeAnswerLabels: boolean;
  suppressClickRef: RefObject<boolean>;
  isAtMinZoom: boolean;
  isAtMaxZoom: boolean;
  zoomBy: (factor: number) => void;
  resetZoom: () => void;
}

const SubdivisionsGameMapContext = createContext<SubdivisionsGameMapContextValue | null>(null);

interface SubdivisionsGameMapProviderProps {
  viewBoxWidth: number;
  viewBoxHeight: number;
  children: ReactNode;
}

export function SubdivisionsGameMapProvider({ viewBoxWidth, viewBoxHeight, children }: SubdivisionsGameMapProviderProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const mapTransformRef = useRef<MapTransformState>({ zoom: 1, x: 0, y: 0 });
  const suppressClickRef = useRef<boolean>(false);

  const [mapTransform, setMapTransform] = useState<MapTransformState>({ zoom: 1, x: 0, y: 0 });
  const [mapVisible, setMapVisible] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [useLargeAnswerLabels, setUseLargeAnswerLabels] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  const getZoomBounds = useCallback(() => {
    return isSmallViewport
      ? { min: MOBILE_MIN_ZOOM, max: MOBILE_MAX_ZOOM }
      : { min: MIN_ZOOM, max: MAX_ZOOM };
  }, [isSmallViewport]);

  const zoomStateFromD3 = useCallback((t: { k: number; x: number; y: number }): MapTransformState => ({
    zoom: t.k,
    x: t.x,
    y: t.y,
  }), []);

  const d3TransformFromZoomState = useCallback((state: MapTransformState) =>
    zoomIdentity.translate(state.x, state.y).scale(state.zoom),
  []);

  // Track viewport for label sizing and zoom bounds
  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setUseLargeAnswerLabels(window.innerWidth < 760 || isCoarsePointer);
      setIsSmallViewport(window.innerWidth < 640);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Wire d3-zoom onto the SVG element
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const bounds = getZoomBounds();
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([bounds.min, bounds.max])
      .on('start', (event) => {
        const type = event.sourceEvent?.type;
        if (type === 'pointerdown' || type === 'mousedown' || type === 'touchstart') {
          setIsPanning(true);
        }
      })
      .on('zoom', (event) => {
        const next = zoomStateFromD3(event.transform);
        mapTransformRef.current = next;
        setMapTransform(next);
        if (event.sourceEvent) {
          if ((event.sourceEvent as Event & { type?: string }).type?.includes('move')) {
            suppressClickRef.current = true;
          }
        }
      })
      .on('end', () => {
        setIsPanning(false);
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      });

    const preventBrowserPinchZoom = (event: globalThis.WheelEvent) => {
      const atOrAboveMax = mapTransformRef.current.zoom >= bounds.max - 0.001;
      if ((event.ctrlKey || event.metaKey) && event.deltaY < 0 && atOrAboveMax) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event: Event) => {
      if (mapTransformRef.current.zoom >= bounds.max - 0.001) event.preventDefault();
    };

    zoomBehaviorRef.current = behavior;
    const svgSelection = select(svgElement);
    svgSelection.call(behavior);
    svgSelection.call(behavior.transform, d3TransformFromZoomState(mapTransformRef.current));

    svgElement.addEventListener('wheel', preventBrowserPinchZoom, { passive: false });
    svgElement.addEventListener('gesturestart', preventGestureZoom, { passive: false });
    svgElement.addEventListener('gesturechange', preventGestureZoom, { passive: false });
    svgElement.addEventListener('gestureend', preventGestureZoom, { passive: false });

    // Show map once zoom is wired up
    window.requestAnimationFrame(() => setMapVisible(true));

    return () => {
      zoomBehaviorRef.current = null;
      svgElement.removeEventListener('wheel', preventBrowserPinchZoom);
      svgElement.removeEventListener('gesturestart', preventGestureZoom);
      svgElement.removeEventListener('gesturechange', preventGestureZoom);
      svgElement.removeEventListener('gestureend', preventGestureZoom);
      svgSelection.on('.zoom', null);
    };
  // Re-wire when viewport category changes (mobile ↔ desktop zoom bounds change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSmallViewport]);

  const getHomeMapTransform = useCallback((zoomLevel: number): MapTransformState => {
    const bounds = getZoomBounds();
    const clamped = Math.max(bounds.min, Math.min(bounds.max, zoomLevel));
    const cx = viewBoxWidth / 2;
    const cy = viewBoxHeight / 2;
    return { zoom: clamped, x: (1 - clamped) * cx, y: (1 - clamped) * cy };
  }, [getZoomBounds, viewBoxWidth, viewBoxHeight]);

  const zoomBounds = getZoomBounds();
  const isAtMinZoom = mapTransform.zoom <= zoomBounds.min + ZOOM_EPSILON;
  const isAtMaxZoom = mapTransform.zoom >= zoomBounds.max - ZOOM_EPSILON;

  const zoomBy = useCallback((factor: number) => {
    const svgElement = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svgElement || !behavior) return;
    const center = { x: viewBoxWidth / 2, y: viewBoxHeight / 2 };
    select(svgElement)
      .transition()
      .duration(180)
      .call(behavior.scaleBy, factor, [center.x, center.y]);
  }, [viewBoxWidth, viewBoxHeight]);

  const resetZoom = useCallback(() => {
    const svgElement = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    const homeTransform = getHomeMapTransform(1);
    if (!svgElement || !behavior) {
      setMapTransform(homeTransform);
      return;
    }
    select(svgElement)
      .transition()
      .duration(220)
      .call(behavior.transform, d3TransformFromZoomState(homeTransform));
  }, [d3TransformFromZoomState, getHomeMapTransform]);

  // Build the value that GameMapContext expects (so GameZoomControls works unchanged)
  const gameMapValue = useMemo<GameMapContextValue>(() => ({
    globeRef: { current: null },
    setGlobeRef: () => {},
    svgRef: svgRef as RefObject<SVGSVGElement | null>,
    pathRefs: { current: {} },
    mapTransform: zoomIdentity.translate(mapTransform.x, mapTransform.y).scale(mapTransform.zoom),
    zoomBy,
    resetZoom,
    focusCountry: () => {},
  }), [mapTransform, zoomBy, resetZoom]);

  const adminMapValue = useMemo<SubdivisionsGameMapContextValue>(() => ({
    svgRef,
    mapTransform,
    isPanning,
    mapVisible,
    setMapVisible,
    useLargeAnswerLabels,
    suppressClickRef,
    isAtMinZoom,
    isAtMaxZoom,
    zoomBy,
    resetZoom,
  }), [
    mapTransform,
    isPanning,
    mapVisible,
    useLargeAnswerLabels,
    isAtMinZoom,
    isAtMaxZoom,
    zoomBy,
    resetZoom,
  ]);

  return (
    <GameMapContext.Provider value={gameMapValue}>
      <SubdivisionsGameMapContext.Provider value={adminMapValue}>
        {children}
      </SubdivisionsGameMapContext.Provider>
    </GameMapContext.Provider>
  );
}

export function useSubdivisionsGameMap(): SubdivisionsGameMapContextValue {
  const context = useContext(SubdivisionsGameMapContext);
  if (!context) {
    throw new Error('useSubdivisionsGameMap must be used within a SubdivisionsGameMapProvider');
  }
  return context;
}

// Re-export zoom constants for use in sub-components
export { ZOOM_IN_FACTOR, ZOOM_OUT_FACTOR };
