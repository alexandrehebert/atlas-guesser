'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ChevronDown, Map as MapIcon, Minus, Plus, RotateCcw } from 'lucide-react';
import { Link, useRouter } from '~/i18n/navigation';
import type { AdminQuizLevel, AdminSubdivisionQuizPayload, QuizArea } from '~/lib/server/adminSubdivisionQuiz';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const MOBILE_MIN_ZOOM = 0.7;
const MOBILE_MAX_ZOOM = 8;
const ZOOM_STEP = 0.25;
const ZOOM_EPSILON = 0.0001;

interface GuessAdminSubdivisionsGameProps {
  quiz: AdminSubdivisionQuizPayload;
}

type QuizLevelId = string;
type AdminGameMode = 'map-click' | 'highlighted-to-name';

interface ScoreState {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
}

interface AnswerState {
  selectedCode: string;
  correct: boolean;
}

interface MapTransformState {
  zoom: number;
  x: number;
  y: number;
}

interface DragState {
  active: boolean;
  dragging: boolean;
  pointerId: number | null;
  startPoint: { x: number; y: number } | null;
  origin: { x: number; y: number };
}

interface PinchState {
  active: boolean;
  startDistance: number;
  startZoom: number;
  center: { x: number; y: number } | null;
}

function rectsOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
  gap: number,
): boolean {
  return first.x - gap < second.x + second.width
    && first.x + first.width + gap > second.x
    && first.y - gap < second.y + second.height
    && first.y + first.height + gap > second.y;
}

function clampRectToViewport(
  rect: { x: number; y: number; width: number; height: number },
  viewport: { x: number; y: number; width: number; height: number },
  padding: number,
): { x: number; y: number; width: number; height: number } {
  const maxX = viewport.x + viewport.width - rect.width - padding;
  const maxY = viewport.y + viewport.height - rect.height - padding;

  return {
    ...rect,
    x: Math.max(viewport.x + padding, Math.min(rect.x, maxX)),
    y: Math.max(viewport.y + padding, Math.min(rect.y, maxY)),
  };
}

function getEdgePointToward(
  rect: { x: number; y: number; width: number; height: number },
  target: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const hw = rect.width / 2;
  const hh = rect.height / 2;
  const tX = dx !== 0 ? (dx > 0 ? hw / dx : -hw / dx) : Number.POSITIVE_INFINITY;
  const tY = dy !== 0 ? (dy > 0 ? hh / dy : -hh / dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(tX, tY);
  return { x: cx + t * dx, y: cy + t * dy };
}

function getSectionLabelWidth(label: string): number {
  return Math.max(64, Math.ceil(label.length * 7.25) + 28);
}

function createDefaultScore(): ScoreState {
  return { correct: 0, total: 0, streak: 0, bestStreak: 0 };
}

function pickNextTarget(areas: QuizArea[], previousCode: string | null): string {
  if (!areas.length) return '';
  const pool = previousCode && areas.length > 1
    ? areas.filter((item) => item.code !== previousCode)
    : areas;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex]?.code ?? areas[0].code;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

function createOptionCodes(areas: QuizArea[], targetCode: string, randomize: boolean): string[] {
  if (!areas.length || !targetCode) return [];

  const optionCount = Math.min(4, areas.length);
  const distractors = areas.filter((area) => area.code !== targetCode);
  const selectedDistractors = (randomize ? shuffle(distractors) : distractors).slice(0, optionCount - 1);
  const base = [targetCode, ...selectedDistractors.map((area) => area.code)];
  return randomize ? shuffle(base) : base;
}

function getDefaultLevel(quiz: AdminSubdivisionQuizPayload): AdminQuizLevel | undefined {
  return quiz.levels.find((level) => level.id === quiz.defaultLevelId) ?? quiz.levels[0];
}

export default function GuessAdminSubdivisionsGame({ quiz }: GuessAdminSubdivisionsGameProps) {
  const t = useTranslations('subdivisionsGuesser');
  const router = useRouter();
  const defaultLevel = getDefaultLevel(quiz);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const topControlsRef = useRef<HTMLDivElement | null>(null);
  const mobileQuestionRef = useRef<HTMLDivElement | null>(null);
  const mobileScoreRef = useRef<HTMLDivElement | null>(null);
  const countryDropdownRef = useRef<HTMLDivElement | null>(null);
  const homeOffsetYRef = useRef(0);
  const hasUserMovedMapRef = useRef(false);
  const [quizLevelId, setQuizLevelId] = useState<QuizLevelId>(() => defaultLevel?.id ?? '');
  const [gameMode, setGameMode] = useState<AdminGameMode>('map-click');
  const [targetCode, setTargetCode] = useState(() => defaultLevel?.areas[0]?.code ?? '');
  const [optionCodes, setOptionCodes] = useState<string[]>(() => createOptionCodes(defaultLevel?.areas ?? [], defaultLevel?.areas[0]?.code ?? '', false));
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [score, setScore] = useState<ScoreState>(createDefaultScore);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [mapTransform, setMapTransform] = useState<MapTransformState>({ zoom: 1, x: 0, y: 0 });
  const [mapVisible, setMapVisible] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [useLargeAnswerLabels, setUseLargeAnswerLabels] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const dragStateRef = useRef<DragState>({
    active: false,
    dragging: false,
    pointerId: null,
    startPoint: null,
    origin: { x: 0, y: 0 },
  });
  const mapTransformRef = useRef<MapTransformState>({ zoom: 1, x: 0, y: 0 });
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStateRef = useRef<PinchState>({
    active: false,
    startDistance: 0,
    startZoom: 1,
    center: null,
  });
  const suppressClickRef = useRef(false);

  const activeLevel = quiz.levels.find((level) => level.id === quizLevelId) ?? defaultLevel;
  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;
  const activeAreas = activeLevel?.areas ?? [];
  const countryName = t(`countries.${quiz.country}`);
  const hasMultipleLevels = quiz.levels.length > 1;

  const areasByCode = useMemo(
    () => new Map(activeAreas.map((area) => [area.code, area])),
    [activeAreas],
  );

  useEffect(() => {
    mapTransformRef.current = mapTransform;
  }, [mapTransform]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const preventBrowserPinchZoom = (event: globalThis.WheelEvent) => {
      // Trackpad pinch is exposed as ctrl/cmd + wheel in Chromium/WebKit.
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };

    svgElement.addEventListener('wheel', preventBrowserPinchZoom, { passive: false });
    svgElement.addEventListener('gesturestart', preventGestureZoom, { passive: false });
    svgElement.addEventListener('gesturechange', preventGestureZoom, { passive: false });
    svgElement.addEventListener('gestureend', preventGestureZoom, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', preventBrowserPinchZoom);
      svgElement.removeEventListener('gesturestart', preventGestureZoom);
      svgElement.removeEventListener('gesturechange', preventGestureZoom);
      svgElement.removeEventListener('gestureend', preventGestureZoom);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setUseLargeAnswerLabels(window.innerWidth < 760 || isCoarsePointer);
      setIsSmallViewport(window.innerWidth < 640);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  useLayoutEffect(() => {
    const computeMobileHomeOffset = (options: { forceApply?: boolean } = {}) => {
      const { forceApply = false } = options;
      if (typeof window === 'undefined') return;

      if (window.innerWidth >= 640) {
        homeOffsetYRef.current = 0;
        if (forceApply) {
          setMapTransform((current) => ({
            zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom)),
            x: 0,
            y: 0,
          }));
          hasUserMovedMapRef.current = false;
        }
        if (!mapVisible) {
          setMapVisible(true);
        }
        return;
      }

      const svgElement = svgRef.current;
      const topRect = topControlsRef.current?.getBoundingClientRect();
      const questionRect = mobileQuestionRef.current?.getBoundingClientRect();
      const scoreRect = mobileScoreRef.current?.getBoundingClientRect();

      if (!svgElement || !topRect || !questionRect || !scoreRect) {
        if (!mapVisible) {
          setMapVisible(true);
        }
        return;
      }

      const mapRect = svgElement.getBoundingClientRect();
      const safeTop = topRect.bottom + 10;
      const safeBottom = Math.min(questionRect.top, scoreRect.top) - 10;
      if (!Number.isFinite(safeTop) || !Number.isFinite(safeBottom) || safeBottom <= safeTop) {
        if (!mapVisible) {
          setMapVisible(true);
        }
        return;
      }

      const desiredCenterScreenY = (safeTop + safeBottom) / 2;
      const currentCenterScreenY = mapRect.top + mapRect.height / 2;
      const deltaScreenY = desiredCenterScreenY - currentCenterScreenY;

      if (Math.abs(deltaScreenY) < 1) {
        homeOffsetYRef.current = 0;
      } else {
        const ctm = svgElement.getScreenCTM();
        if (!ctm) {
          if (!mapVisible) {
            setMapVisible(true);
          }
          return;
        }

        const pointA = svgElement.createSVGPoint();
        pointA.x = mapRect.left + mapRect.width / 2;
        pointA.y = currentCenterScreenY;

        const pointB = svgElement.createSVGPoint();
        pointB.x = pointA.x;
        pointB.y = currentCenterScreenY + deltaScreenY;

        try {
          const svgA = pointA.matrixTransform(ctm.inverse());
          const svgB = pointB.matrixTransform(ctm.inverse());
          homeOffsetYRef.current = svgB.y - svgA.y;
        } catch {
          homeOffsetYRef.current = 0;
        }
      }

      setMapTransform((current) => {
        if (hasUserMovedMapRef.current && !forceApply) {
          return current;
        }

        return {
          zoom: 1,
          x: 0,
          y: homeOffsetYRef.current,
        };
      });

      if (!mapVisible) {
        window.requestAnimationFrame(() => {
          setMapVisible(true);
        });
      }
    };

    const handleViewportChange = () => {
      computeMobileHomeOffset({ forceApply: true });
    };

    computeMobileHomeOffset();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [mapVisible]);

  const targetArea = areasByCode.get(targetCode) ?? activeAreas[0];
  const isChoiceMode = gameMode === 'highlighted-to-name';
  const promptAreaLabel = isChoiceMode ? '' : (targetArea?.name ?? '');
  const promptBodyLabel = isChoiceMode
    ? t(`prompt_body_choices.${activeLevelId}`, { countryName })
    : t(`prompt_body.${activeLevelId}`, { countryName });

  const switchQuizLevel = (nextLevelId: QuizLevelId) => {
    if (nextLevelId === quizLevelId) {
      return;
    }

    const nextLevel = quiz.levels.find((level) => level.id === nextLevelId);
    if (!nextLevel) {
      return;
    }

    const nextAreas = nextLevel.areas;
    const nextTargetCode = pickNextTarget(nextAreas, null);
    setQuizLevelId(nextLevelId);
    setTargetCode(nextTargetCode);
    setOptionCodes(createOptionCodes(nextAreas, nextTargetCode, true));
    setAnswer(null);
    setHoveredCode(null);
  };

  const switchGameMode = (nextMode: AdminGameMode) => {
    if (nextMode === gameMode) return;
    setGameMode(nextMode);
    setAnswer(null);
    setHoveredCode(null);
  };

  const handleSubmit = (selectedCode: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!targetArea || answer) return;

    const isCorrect = selectedCode === targetArea.code;
    setAnswer({ selectedCode, correct: isCorrect });

    setScore((current) => {
      const nextStreak = isCorrect ? current.streak + 1 : 0;
      return {
        correct: current.correct + (isCorrect ? 1 : 0),
        total: current.total + 1,
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
      };
    });
  };

  const handleNextRound = () => {
    if (!targetArea) return;
    const nextTargetCode = pickNextTarget(activeAreas, targetArea.code);
    setTargetCode(nextTargetCode);
    setOptionCodes(createOptionCodes(activeAreas, nextTargetCode, true));
    setAnswer(null);
    setHoveredCode(null);
  };

  const getZoomBounds = () => {
    if (isSmallViewport) {
      return { min: MOBILE_MIN_ZOOM, max: MOBILE_MAX_ZOOM };
    }

    return { min: MIN_ZOOM, max: MAX_ZOOM };
  };

  const clampZoom = (value: number) => {
    const bounds = getZoomBounds();
    return Math.max(bounds.min, Math.min(bounds.max, value));
  };

  const zoomAtPoint = (
    nextZoomRaw: number,
    point: { x: number; y: number },
    options: { recenterOnMin?: boolean } = {},
  ) => {
    setMapTransform((current) => {
      const nextZoom = clampZoom(nextZoomRaw);
      const bounds = getZoomBounds();

      if (options.recenterOnMin && nextZoom === bounds.min) {
        return {
          zoom: bounds.min,
          x: 0,
          y: homeOffsetYRef.current,
        };
      }

      if (nextZoom === current.zoom) {
        return current;
      }

      const ratio = nextZoom / current.zoom;
      return {
        zoom: nextZoom,
        x: (1 - ratio) * point.x + ratio * current.x,
        y: (1 - ratio) * point.y + ratio * current.y,
      };
    });
  };

  const getMapCenterPoint = () => ({
    x: quiz.viewBox.width / 2,
    y: quiz.viewBox.height / 2,
  });

  const zoomBounds = getZoomBounds();
  const isAtMinZoom = mapTransform.zoom <= zoomBounds.min + ZOOM_EPSILON;
  const isAtMaxZoom = mapTransform.zoom >= zoomBounds.max - ZOOM_EPSILON;

  const handleZoomIn = () => {
    if (isAtMaxZoom) {
      return;
    }

    const center = getMapCenterPoint();
    hasUserMovedMapRef.current = true;
    zoomAtPoint(mapTransform.zoom + ZOOM_STEP, center);
  };

  const handleZoomOut = () => {
    if (isAtMinZoom) {
      return;
    }

    const center = getMapCenterPoint();
    hasUserMovedMapRef.current = true;
    zoomAtPoint(mapTransform.zoom - ZOOM_STEP, center, { recenterOnMin: true });
  };

  const handleResetZoom = () => {
    hasUserMovedMapRef.current = false;
    setMapTransform({ zoom: 1, x: 0, y: homeOffsetYRef.current });
  };

  const handleWheelZoom = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const svgElement = svgRef.current;
    const ctm = svgElement?.getScreenCTM();
    if (!svgElement || !ctm) {
      return;
    }

    const pointer = svgElement.createSVGPoint();
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    let svgPoint: { x: number; y: number } | null = null;
    try {
      const transformed = pointer.matrixTransform(ctm.inverse());
      svgPoint = { x: transformed.x, y: transformed.y };
    } catch {
      svgPoint = null;
    }

    if (!svgPoint) {
      return;
    }

    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    hasUserMovedMapRef.current = true;
    zoomAtPoint(mapTransform.zoom + delta, svgPoint, { recenterOnMin: delta < 0 });
  };

  const getSvgPointFromClient = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svgElement = svgRef.current;
    const ctm = svgElement?.getScreenCTM();
    if (!svgElement || !ctm) {
      return null;
    }

    const pointer = svgElement.createSVGPoint();
    pointer.x = clientX;
    pointer.y = clientY;

    try {
      const point = pointer.matrixTransform(ctm.inverse());
      return { x: point.x, y: point.y };
    } catch {
      return null;
    }
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const first = pointers[0];
      const second = pointers[1];
      const startDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const centerClientX = (first.clientX + second.clientX) / 2;
      const centerClientY = (first.clientY + second.clientY) / 2;

      pinchStateRef.current = {
        active: startDistance > 0,
        startDistance,
        startZoom: mapTransformRef.current.zoom,
        center: getSvgPointFromClient(centerClientX, centerClientY),
      };

      dragStateRef.current = {
        active: false,
        dragging: false,
        pointerId: null,
        startPoint: null,
        origin: { x: 0, y: 0 },
      };

      setIsPanning(false);
      suppressClickRef.current = true;
      hasUserMovedMapRef.current = true;
      return;
    }

    const point = getSvgPointFromClient(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    dragStateRef.current = {
      active: true,
      dragging: false,
      pointerId: event.pointerId,
      startPoint: point,
      origin: { x: mapTransformRef.current.x, y: mapTransformRef.current.y },
    };

    setIsPanning(false);
    suppressClickRef.current = false;
    hasUserMovedMapRef.current = true;
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const activePointer = activePointersRef.current.get(event.pointerId);
    if (activePointer) {
      activePointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    }

    if (pinchStateRef.current.active && activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const first = pointers[0];
      const second = pointers[1];
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      if (distance <= 0 || pinchStateRef.current.startDistance <= 0) {
        return;
      }

      const scale = distance / pinchStateRef.current.startDistance;
      const centerClientX = (first.clientX + second.clientX) / 2;
      const centerClientY = (first.clientY + second.clientY) / 2;
      const center = getSvgPointFromClient(centerClientX, centerClientY)
        ?? pinchStateRef.current.center
        ?? getMapCenterPoint();
      hasUserMovedMapRef.current = true;
      zoomAtPoint(pinchStateRef.current.startZoom * scale, center, { recenterOnMin: scale < 1 });
      suppressClickRef.current = true;
      setIsPanning(false);
      return;
    }

    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId || !dragState.startPoint) {
      return;
    }

    const point = getSvgPointFromClient(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const dx = point.x - dragState.startPoint.x;
    const dy = point.y - dragState.startPoint.y;

    if (!dragState.dragging) {
      if (Math.hypot(dx, dy) < 6) {
        return;
      }

      dragStateRef.current = {
        ...dragState,
        dragging: true,
      };
      setIsPanning(true);
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    setMapTransform((current) => ({
      ...current,
      x: dragState.origin.x + dx,
      y: dragState.origin.y + dy,
    }));
  };

  const endPointerPan = (event: PointerEvent<SVGSVGElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = {
        active: false,
        startDistance: 0,
        startZoom: mapTransformRef.current.zoom,
        center: null,
      };
    }

    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const wasDragging = dragState.dragging;

    dragStateRef.current = {
      active: false,
      dragging: false,
      pointerId: null,
      startPoint: null,
      origin: { x: 0, y: 0 },
    };

    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (wasDragging) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const getAreaClasses = (area: QuizArea): string => {
    if (answer?.selectedCode === area.code && answer.correct) {
      return 'fill-emerald-400/85 stroke-emerald-100';
    }

    if (answer?.selectedCode === area.code && !answer.correct) {
      return 'fill-rose-400/90 stroke-rose-100';
    }

    if (answer && targetArea?.code === area.code) {
      return 'fill-sky-400/90 stroke-sky-100';
    }

    if (!answer && gameMode === 'highlighted-to-name' && targetArea?.code === area.code) {
      return 'fill-amber-300/90 stroke-amber-100';
    }

    if (!answer && hoveredCode === area.code) {
      return 'fill-slate-500/95 stroke-slate-100';
    }

    return 'fill-slate-800/84 stroke-slate-400/58';
  };

  const answerLabels = useMemo(() => {
    if (!answer || !targetArea) return [];

    const markerCodes = Array.from(new Set([answer.selectedCode, targetArea.code].filter(Boolean)));
    const placedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    const viewport = { x: 0, y: 0, width: quiz.viewBox.width, height: quiz.viewBox.height };
    const padding = 8;
    const gap = 10;

    return markerCodes.map((code) => {
      const area = areasByCode.get(code);
      if (!area) return null;

      const isCorrectArea = code === targetArea.code;
      const prefix = isCorrectArea ? t('map_label_correct') : t('map_label_wrong');
      const text = `${prefix} · ${area.name}`;
      const labelFontSize = useLargeAnswerLabels ? 18 : 12;
      const labelWidth = useLargeAnswerLabels
        ? Math.min(420, Math.max(210, text.length * 10.2 + 44))
        : Math.min(250, Math.max(110, text.length * 6.7 + 22));
      const labelHeight = useLargeAnswerLabels ? 46 : 28;

      const anchor = {
        x: mapTransform.x + mapTransform.zoom * area.centroid.x,
        y: mapTransform.y + mapTransform.zoom * area.centroid.y,
      };

      const candidates = [
        { x: anchor.x - labelWidth / 2, y: anchor.y - 44 },
        { x: anchor.x + 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth - 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth / 2, y: anchor.y + 14 },
      ].map((candidate) => clampRectToViewport({ ...candidate, width: labelWidth, height: labelHeight }, viewport, padding));

      let best = candidates[0];
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const overlaps = placedRects.some((rect) => rectsOverlap(candidate, rect, gap));
        const distance = Math.hypot(candidate.x + candidate.width / 2 - anchor.x, candidate.y + candidate.height / 2 - anchor.y);
        const score = (overlaps ? 1_000_000 : 0) + distance;
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      placedRects.push(best);

      const edgePoint = getEdgePointToward(best, anchor);
      const connectorLength = Math.hypot(edgePoint.x - anchor.x, edgePoint.y - anchor.y);
      const showConnector = connectorLength > 14;

      return {
        key: code,
        text,
        labelFontSize,
        anchor,
        rect: best,
        showConnector,
        borderColor: isCorrectArea ? 'rgba(125,211,252,0.58)' : 'rgba(253,164,175,0.58)',
        connectorColor: isCorrectArea ? 'rgba(125,211,252,0.88)' : 'rgba(253,164,175,0.88)',
      };
    }).filter((item): item is {
      key: string;
      text: string;
      labelFontSize: number;
      anchor: { x: number; y: number };
      rect: { x: number; y: number; width: number; height: number };
      showConnector: boolean;
      borderColor: string;
      connectorColor: string;
    } => Boolean(item));
  }, [answer, targetArea, quiz.viewBox.width, quiz.viewBox.height, areasByCode, mapTransform.x, mapTransform.y, mapTransform.zoom, t, useLargeAnswerLabels]);

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 14% 16%, rgba(45,212,191,0.24), transparent 34%)',
            'radial-gradient(circle at 86% 18%, rgba(251,191,36,0.20), transparent 30%)',
            'radial-gradient(circle at 52% 82%, rgba(14,165,233,0.18), transparent 35%)',
            'linear-gradient(180deg, rgba(2,6,23,0.94) 0%, rgba(15,23,42,0.96) 48%, rgba(2,6,23,0.98) 100%)',
          ].join(','),
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div ref={topControlsRef} className="pointer-events-none absolute left-4 right-4 top-4 z-30 flex items-start justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
        <Link
          href="/"
          aria-label="Go to landing page"
          className="pointer-events-auto group inline-flex h-8 items-center gap-1 overflow-visible rounded-full border border-white/10 bg-white/5 pl-0 pr-3 shadow-lg backdrop-blur-sm transition-[background-color,border-color,box-shadow] duration-200 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_20px_rgba(2,6,23,0.45)] focus-visible:bg-white/10 focus-visible:border-white/20"
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
        </Link>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div ref={countryDropdownRef} className="relative">
            <div className="rounded-2xl border border-white/12 bg-slate-950/80 p-1">
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-white/10"
              >
                {t(`countries.${quiz.country}`)}
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isCountryDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 min-w-full overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 py-1 shadow-[0_20px_60px_rgba(2,6,23,0.6)] backdrop-blur-md">
                {quiz.availableCountries.map((country) => {
                  const isActiveCountry = country === quiz.country;
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => {
                        setIsCountryDropdownOpen(false);
                        if (!isActiveCountry) {
                          setIsNavigating(true);
                          router.push(`/subdivisions/${country}`);
                        }
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.13em] transition ${isActiveCountry ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                    >
                      {t(`countries.${country}`)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {hasMultipleLevels ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/80 p-1">
              {quiz.levels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => switchQuizLevel(level.id)}
                  className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${quizLevelId === level.id ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {t(`mode.${level.id}`)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/12 bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
            {t(`top_badge.${activeLevelId}`, { count: activeAreas.length })}
          </div>
        </div>
      </div>

      <div ref={mobileQuestionRef} className="absolute bottom-3 left-3 right-3 z-30 rounded-3xl border border-white/12 bg-slate-950/88 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:hidden">
        <div className="absolute -top-12 right-0 flex w-fit items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/88 p-1 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:hidden">
          <button
            type="button"
            onClick={() => switchGameMode('map-click')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'map-click' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            {t('game_mode_map_click')}
          </button>
          <button
            type="button"
            onClick={() => switchGameMode('highlighted-to-name')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'highlighted-to-name' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            {t('game_mode_highlighted_to_name')}
          </button>
        </div>

        <div className="absolute -top-14 left-0 flex items-center gap-1 rounded-2xl border border-white/12 bg-slate-950/88 px-1.5 py-1.5 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:hidden">
          <button
            type="button"
            onClick={handleZoomOut}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            aria-label={t('zoom_out')}
            disabled={isAtMinZoom}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            aria-label={t('reset_view')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-white/30 hover:bg-white/10"
            aria-label={t('zoom_in')}
            disabled={isAtMaxZoom}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-rose-100">{t(`prompt_eyebrow.${activeLevelId}`)}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{promptAreaLabel}</p>
        <p className="mt-1 text-sm text-slate-300">{promptBodyLabel}</p>

        {gameMode === 'highlighted-to-name' ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {optionCodes.map((code) => {
              const optionArea = areasByCode.get(code);
              const isCorrectChoice = code === targetArea?.code;
              const isSelected = answer?.selectedCode === code;
              const baseClasses = 'rounded-xl border px-3 py-2 text-left text-sm transition';
              let stateClasses = 'border-white/10 bg-slate-900/70 text-slate-100 hover:border-white/20 hover:bg-slate-800/70';

              if (answer && isCorrectChoice) {
                stateClasses = 'border-emerald-200/60 bg-emerald-500/25 text-emerald-50';
              } else if (answer && isSelected && !isCorrectChoice) {
                stateClasses = 'border-rose-200/60 bg-rose-500/25 text-rose-50';
              }

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSubmit(code)}
                  disabled={Boolean(answer)}
                  className={`${baseClasses} ${stateClasses}`}
                >
                  {optionArea?.name ?? code}
                </button>
              );
            })}
          </div>
        ) : null}

        {!answer ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
            {gameMode === 'highlighted-to-name' ? t('instruction_choices') : t('instruction_map')}
          </p>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
            <p>
              {answer.correct
                ? t('result_correct', { areaName: targetArea?.name ?? '' })
                : t('result_wrong', { areaName: targetArea?.name ?? '' })}
            </p>
            <button
              type="button"
              onClick={handleNextRound}
              className="mt-3 inline-flex w-full justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/20"
            >
              {t('next_round')}
            </button>
          </div>
        )}
      </div>

      <div ref={mobileScoreRef} className="absolute bottom-3 left-3 z-20 rounded-3xl border border-white/12 bg-slate-950/88 px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_correct_label')}</p>
            <p className="text-xl font-semibold text-white">{score.correct}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_total_label')}</p>
            <p className="text-xl font-semibold text-white">{score.total}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_streak_label')}</p>
            <p className="text-xl font-semibold text-white">{score.streak}</p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_best_streak')}</p>
            <p className="text-xl font-semibold text-white">{score.bestStreak}</p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-5 z-30 hidden w-[min(92vw,26rem)] flex-col gap-3 sm:flex">
        <div className="pointer-events-auto flex w-fit self-start items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/88 p-1 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => switchGameMode('map-click')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'map-click' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            {t('game_mode_map_click')}
          </button>
          <button
            type="button"
            onClick={() => switchGameMode('highlighted-to-name')}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition ${gameMode === 'highlighted-to-name' ? 'bg-white/18 text-white' : 'text-slate-300 hover:bg-white/10'}`}
          >
            {t('game_mode_highlighted_to_name')}
          </button>
        </div>

        {answer ? (
          <div className="pointer-events-auto rounded-3xl border border-white/12 bg-slate-950/88 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-100">{t('result_label')}</p>
            <p className="mt-2 text-sm text-slate-200">
              {answer.correct
                ? t('result_correct', { areaName: targetArea?.name ?? '' })
                : t('result_wrong', { areaName: targetArea?.name ?? '' })}
            </p>
            <button
              type="button"
              onClick={handleNextRound}
              className="mt-3 inline-flex rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-white/20"
            >
              {t('next_round')}
            </button>
          </div>
        ) : null}

        <div className="pointer-events-auto rounded-3xl border border-white/12 bg-slate-950/88 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.18em] text-rose-100">{t(`prompt_eyebrow.${activeLevelId}`)}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{promptAreaLabel}</p>
          <p className="mt-1 text-sm text-slate-300">{promptBodyLabel}</p>

          {gameMode === 'highlighted-to-name' ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {optionCodes.map((code) => {
                const optionArea = areasByCode.get(code);
                const isCorrectChoice = code === targetArea?.code;
                const isSelected = answer?.selectedCode === code;
                const baseClasses = 'rounded-xl border px-3 py-2 text-left text-sm transition';
                let stateClasses = 'border-white/10 bg-slate-900/70 text-slate-100 hover:border-white/20 hover:bg-slate-800/70';

                if (answer && isCorrectChoice) {
                  stateClasses = 'border-emerald-200/60 bg-emerald-500/25 text-emerald-50';
                } else if (answer && isSelected && !isCorrectChoice) {
                  stateClasses = 'border-rose-200/60 bg-rose-500/25 text-rose-50';
                }

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSubmit(code)}
                    disabled={Boolean(answer)}
                    className={`${baseClasses} ${stateClasses}`}
                  >
                    {optionArea?.name ?? code}
                  </button>
                );
              })}
            </div>
          ) : null}

          {!answer ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
              {gameMode === 'highlighted-to-name' ? t('instruction_choices') : t('instruction_map')}
            </p>
          ) : null}
        </div>

        <div className="pointer-events-auto rounded-3xl border border-white/12 bg-slate-950/88 px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_correct_label')}</p>
              <p className="text-xl font-semibold text-white">{score.correct}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_total_label')}</p>
              <p className="text-xl font-semibold text-white">{score.total}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_streak_label')}</p>
              <p className="text-xl font-semibold text-white">{score.streak}</p>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">{t('score_best_streak')}</p>
              <p className="text-xl font-semibold text-white">{score.bestStreak}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-30 hidden items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/88 px-2 py-2 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-md sm:bottom-5 sm:right-5 sm:flex">
        <button
          type="button"
          onClick={handleZoomOut}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${isAtMinZoom
            ? 'cursor-not-allowed border-white/8 bg-white/[0.03] text-slate-500 opacity-55'
            : 'border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'}`}
          aria-label={t('zoom_out')}
          disabled={isAtMinZoom}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-white/30 hover:bg-white/10"
          aria-label={t('reset_view')}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${isAtMaxZoom
            ? 'cursor-not-allowed border-white/8 bg-white/[0.03] text-slate-500 opacity-55'
            : 'border-white/15 bg-white/5 text-slate-100 hover:border-white/30 hover:bg-white/10'}`}
          aria-label={t('zoom_in')}
          disabled={isAtMaxZoom}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${quiz.viewBox.width} ${quiz.viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`absolute inset-0 h-full w-full select-none transition-opacity duration-300 ${mapVisible ? 'opacity-100' : 'opacity-0'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none' }}
        onWheel={handleWheelZoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerPan}
        onPointerCancel={endPointerPan}
      >
        <g
          transform={`translate(${mapTransform.x}, ${mapTransform.y}) scale(${mapTransform.zoom})`}
        >
          <g pointerEvents="none">
            {quiz.ghostFocusedCountryPaths.map((path, index) => (
              <path
                key={`ghost-focused-${index}`}
                d={path}
                className="fill-slate-700/8 stroke-slate-500/18"
                strokeWidth={0.7}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {quiz.ghostEuropePaths.map((path, index) => (
              <path
                key={`ghost-europe-${index}`}
                d={path}
                className="fill-slate-700/18 stroke-slate-500/40"
                strokeWidth={0.7}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {activeLevel?.sectionLabels.map((section) => (
              <g key={`section-label-${section.id}`}>
                {(() => {
                  const translatedLabel = t(`section_labels.${section.labelKey}`);

                  return (
                    <>
                <rect
                  x={section.bounds.x}
                  y={section.bounds.y}
                  width={section.bounds.width}
                  height={section.bounds.height}
                  rx={14}
                  ry={14}
                  fill="rgba(148,163,184,0.06)"
                  stroke="rgba(226,232,240,0.26)"
                  strokeWidth={1}
                  strokeDasharray="6 5"
                  vectorEffect="non-scaling-stroke"
                />
                <foreignObject
                  x={section.bounds.x + 10}
                  y={section.bounds.y - 16}
                  width={getSectionLabelWidth(translatedLabel)}
                  height={32}
                >
                  <div
                    className="flex h-full items-center rounded-full border border-slate-500 px-3 text-[12px] font-semibold tracking-[0.06em] text-slate-100 shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
                    style={{ backgroundColor: 'rgb(30 41 59)' }}
                  >
                    {translatedLabel}
                  </div>
                </foreignObject>
                    </>
                  );
                })()}
              </g>
            ))}
          </g>

          {activeAreas.map((area) => {
            const isClickable = gameMode === 'map-click' && !answer;
            return (
              <path
                key={area.code}
                d={area.path}
                className={`${getAreaClasses(area)} outline-none transition-[fill,stroke] duration-150`}
                strokeWidth={0.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ outline: 'none' }}
                onClick={isClickable ? () => handleSubmit(area.code) : undefined}
                onMouseDown={isClickable ? (event) => {
                  // Keep keyboard focus behavior, but avoid browser mouse focus rectangle on SVG paths.
                  event.preventDefault();
                } : undefined}
                onMouseEnter={isClickable ? () => setHoveredCode(area.code) : undefined}
                onMouseLeave={isClickable ? () => setHoveredCode((current) => (current === area.code ? null : current)) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : -1}
                aria-label={isClickable ? t('area_button_aria', { area: area.name }) : undefined}
                onKeyDown={isClickable ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSubmit(area.code);
                  }
                } : undefined}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {answerLabels.map((label) => {
            const connectorTo = getEdgePointToward(label.rect, label.anchor);
            return (
              <g key={`map-label-${label.key}`}>
                {label.showConnector ? (
                  <line
                    x1={label.anchor.x}
                    y1={label.anchor.y}
                    x2={connectorTo.x}
                    y2={connectorTo.y}
                    stroke={label.connectorColor}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                ) : null}
                <rect
                  x={label.rect.x}
                  y={label.rect.y}
                  width={label.rect.width}
                  height={label.rect.height}
                  rx={8}
                  ry={8}
                  fill="rgba(2,6,23,0.75)"
                  stroke={label.borderColor}
                  strokeWidth={1.1}
                />
                <text
                  x={label.rect.x + label.rect.width / 2}
                  y={label.rect.y + label.rect.height / 2 + 0.5}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fill="rgba(226,232,240,0.95)"
                  fontSize={label.labelFontSize}
                  fontWeight={useLargeAnswerLabels ? 700 : 600}
                >
                  {label.text}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div
        className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/82 transition-opacity duration-500 ${mapVisible && !isNavigating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <MapIcon className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
      </div>
    </div>
  );
}
