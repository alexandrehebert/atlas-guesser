'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Map as MapIcon } from 'lucide-react';
import type { QuizArea } from '~/lib/server/adminSubdivisionQuiz';
import { useGameLayout } from '../contexts/GameLayoutContext';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';
import { useSubdivisionsGameMap } from './contexts/SubdivisionsGameMapContext';
import SubdivisionsGameScore from './SubdivisionsGameScore';

type LayoutObservedElement = SVGSVGElement | HTMLDivElement | HTMLButtonElement;

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

function getRectOverlapArea(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): number {
  const overlapWidth = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
  const overlapHeight = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
  return overlapWidth * overlapHeight;
}

function getRectOutsideArea(
  rect: { x: number; y: number; width: number; height: number },
  viewport: { x: number; y: number; width: number; height: number },
): number {
  const insideArea = getRectOverlapArea(rect, viewport);
  return Math.max(0, rect.width * rect.height - insideArea);
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

function resolveLabelCollision(params: {
  rect: { x: number; y: number; width: number; height: number };
  viewport: { x: number; y: number; width: number; height: number };
  placedRects: Array<{ x: number; y: number; width: number; height: number }>;
  blockedRects: Array<{ x: number; y: number; width: number; height: number }>;
  viewportPadding: number;
  labelGap: number;
}): { x: number; y: number; width: number; height: number } {
  const { rect, viewport, placedRects, blockedRects, viewportPadding, labelGap } = params;
  const clampedRect = clampRectToViewport(rect, viewport, viewportPadding);
  const collides = (candidate: { x: number; y: number; width: number; height: number }) => {
    return placedRects.some((placed) => rectsOverlap(candidate, placed, labelGap))
      || blockedRects.some((blocked) => getRectOverlapArea(candidate, blocked) > 0)
      || getRectOutsideArea(candidate, viewport) > 0;
  };

  if (!collides(clampedRect)) {
    return clampedRect;
  }

  const minX = viewport.x + viewportPadding;
  const maxX = viewport.x + viewport.width - clampedRect.width - viewportPadding;
  const minY = viewport.y + viewportPadding;
  const maxY = viewport.y + viewport.height - clampedRect.height - viewportPadding;
  const stuckLeft = Math.abs(clampedRect.x - minX) < 0.5;
  const stuckRight = Math.abs(clampedRect.x - maxX) < 0.5;
  const stuckTop = Math.abs(clampedRect.y - minY) < 0.5;
  const stuckBottom = Math.abs(clampedRect.y - maxY) < 0.5;

  const candidates: Array<{ x: number; y: number; width: number; height: number }> = [];
  const stepX = Math.max(10, Math.round(clampedRect.width * 0.2));
  const stepY = Math.max(10, Math.round(clampedRect.height * 0.65));

  for (let distance = 1; distance <= 12; distance += 1) {
    const offsetX = stepX * distance;
    const offsetY = stepY * distance;

    if (stuckTop || stuckBottom) {
      candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x + offsetX }, viewport, viewportPadding));
      candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x - offsetX }, viewport, viewportPadding));
    }

    if (stuckLeft || stuckRight) {
      candidates.push(clampRectToViewport({ ...clampedRect, y: clampedRect.y + offsetY }, viewport, viewportPadding));
      candidates.push(clampRectToViewport({ ...clampedRect, y: clampedRect.y - offsetY }, viewport, viewportPadding));
    }

    candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x + offsetX, y: clampedRect.y + offsetY }, viewport, viewportPadding));
    candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x + offsetX, y: clampedRect.y - offsetY }, viewport, viewportPadding));
    candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x - offsetX, y: clampedRect.y + offsetY }, viewport, viewportPadding));
    candidates.push(clampRectToViewport({ ...clampedRect, x: clampedRect.x - offsetX, y: clampedRect.y - offsetY }, viewport, viewportPadding));
  }

  let bestRect = clampedRect;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (collides(candidate)) continue;
    const distance = Math.hypot(candidate.x - clampedRect.x, candidate.y - clampedRect.y);
    if (distance < bestDistance) {
      bestRect = candidate;
      bestDistance = distance;
    }
  }

  return bestRect;
}

function domRectToSvgUnits(
  elemRect: DOMRect,
  svgElement: SVGSVGElement,
): { x: number; y: number; width: number; height: number } | null {
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return null;

  try {
    const inv = ctm.inverse();
    const pt1 = svgElement.createSVGPoint();
    pt1.x = elemRect.left;
    pt1.y = elemRect.top;
    const svgPt1 = pt1.matrixTransform(inv);

    const pt2 = svgElement.createSVGPoint();
    pt2.x = elemRect.right;
    pt2.y = elemRect.bottom;
    const svgPt2 = pt2.matrixTransform(inv);

    return {
      x: svgPt1.x,
      y: svgPt1.y,
      width: svgPt2.x - svgPt1.x,
      height: svgPt2.y - svgPt1.y,
    };
  } catch {
    return null;
  }
}

function getVisibleViewBoxRect(params: {
  viewBox: { width: number; height: number };
  svgElement: SVGSVGElement | null;
}): { x: number; y: number; width: number; height: number } {
  const { viewBox, svgElement } = params;
  const fallback = { x: 0, y: 0, width: viewBox.width, height: viewBox.height };

  if (!svgElement) return fallback;

  const screenWidth = svgElement.clientWidth;
  const screenHeight = svgElement.clientHeight;
  if (screenWidth <= 0 || screenHeight <= 0) return fallback;

  return fallback;
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

function getCurvedConnectorPath(params: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}): string {
  const { from, to } = params;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const controlOffset = Math.min(34, Math.max(10, distance * 0.25));
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const controlX = midX;
  const controlY = midY - controlOffset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function getSectionLabelWidth(label: string): number {
  return Math.max(64, Math.ceil(label.length * 7.25) + 28);
}

function shouldRenderSectionBadge(labelKey: string): boolean {
  return labelKey !== 'france_overseas' && labelKey !== 'generic_inset';
}

function getAreaClasses(
  area: QuizArea,
  answer: { selectedCode: string; correct: boolean } | null,
  targetArea: QuizArea | undefined,
  hoveredCode: string | null,
  gameMode: string,
): string {
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
}

export default function GuessSubdivisionsMap() {
  const t = useTranslations('subdivisionsGuesser');
  const { isMobile, sidebarOpen, sidebarRef, sidebarToggleRef, topBarRef } = useGameLayout();
  const {
    quiz,
    activeLevel,
    activeAreas,
    areasByCode,
    gameMode,
    targetArea,
    answer,
    score,
    scoreLoaded,
    clearScore,
    hoveredCode,
    setHoveredCode,
    submitAnswer,
    dataSourceSections,
  } = useSubdivisionsGame();

  const {
    svgRef,
    mapTransform,
    isPanning,
    mapVisible,
    suppressClickRef,
    useLargeAnswerLabels,
  } = useSubdivisionsGameMap();

  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [confirmClearScore, setConfirmClearScore] = useState(false);
  const [layoutPass, setLayoutPass] = useState(0);
  const layoutRefreshFrameRef = useRef<number | null>(null);
  const hasScore = score.correct > 0 || score.total > 0 || score.streak > 0 || score.bestStreak > 0;

  useEffect(() => {
    return () => {
      if (layoutRefreshFrameRef.current !== null) {
        cancelAnimationFrame(layoutRefreshFrameRef.current);
      }
    };
  }, []);

  const scheduleLayoutRefresh = useCallback(() => {
    if (layoutRefreshFrameRef.current !== null) {
      cancelAnimationFrame(layoutRefreshFrameRef.current);
    }

    layoutRefreshFrameRef.current = requestAnimationFrame(() => {
      layoutRefreshFrameRef.current = null;
      setLayoutPass((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    if (!answer) return;

    const observedElements = [svgRef.current, topBarRef.current, sidebarRef.current, sidebarToggleRef.current]
      .filter((element): element is LayoutObservedElement => element !== null);

    const timeoutIds = [
      window.setTimeout(scheduleLayoutRefresh, 0),
      window.setTimeout(scheduleLayoutRefresh, 120),
      window.setTimeout(scheduleLayoutRefresh, 340),
    ];

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && observedElements.length > 0) {
      resizeObserver = new ResizeObserver(() => {
        scheduleLayoutRefresh();
      });

      observedElements.forEach((element) => resizeObserver?.observe(element));
    }

    const handleViewportChange = () => {
      scheduleLayoutRefresh();
    };

    const handleTransitionBoundary = () => {
      scheduleLayoutRefresh();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    observedElements.forEach((element) => {
      element.addEventListener('transitionrun', handleTransitionBoundary);
      element.addEventListener('transitionend', handleTransitionBoundary);
    });

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        scheduleLayoutRefresh();
      }).catch(() => {});
    }

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      observedElements.forEach((element) => {
        element.removeEventListener('transitionrun', handleTransitionBoundary);
        element.removeEventListener('transitionend', handleTransitionBoundary);
      });
    };
  }, [answer, isMobile, scheduleLayoutRefresh, sidebarOpen, sidebarRef, sidebarToggleRef, svgRef, topBarRef]);

  const activeLevelId = activeLevel?.id ?? quiz.defaultLevelId;

  const handleMapClick = (selectedCode: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    submitAnswer(selectedCode);
  };

  const answerLabels = useMemo(() => {
    if (!answer || !targetArea) return [];

    const markerCodes = Array.from(new Set([answer.selectedCode, targetArea.code].filter(Boolean)));
    const placedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    const visibleRect = getVisibleViewBoxRect({
      viewBox: quiz.viewBox,
      svgElement: svgRef.current,
    });
    const svgElement = svgRef.current;
    const screenWidth = svgElement?.clientWidth || 0;
    const screenHeight = svgElement?.clientHeight || 0;
    const unitsPerPxX = screenWidth > 0 ? visibleRect.width / screenWidth : 1;
    const unitsPerPxY = screenHeight > 0 ? visibleRect.height / screenHeight : 1;

    const edgePaddingPx = 8;
    const uiGapPx = 6;

    const topBarSvgRect = svgElement && topBarRef.current
      ? domRectToSvgUnits(topBarRef.current.getBoundingClientRect(), svgElement)
      : null;
    const sidebarSvgRect = svgElement && sidebarRef.current
      ? domRectToSvgUnits(sidebarRef.current.getBoundingClientRect(), svgElement)
      : null;
    const sidebarToggleSvgRect = svgElement && sidebarToggleRef.current
      ? domRectToSvgUnits(sidebarToggleRef.current.getBoundingClientRect(), svgElement)
      : null;

    let safeTop = visibleRect.y + edgePaddingPx * unitsPerPxY;
    let safeBottom = visibleRect.y + visibleRect.height - edgePaddingPx * unitsPerPxY;
    let safeLeft = visibleRect.x + edgePaddingPx * unitsPerPxX;
    let safeRight = visibleRect.x + visibleRect.width - edgePaddingPx * unitsPerPxX;

    if (topBarSvgRect) {
      safeTop = Math.max(safeTop, topBarSvgRect.y + topBarSvgRect.height + uiGapPx * unitsPerPxY);
    }
    if (sidebarSvgRect) {
      if (isMobile) {
        safeBottom = Math.min(safeBottom, sidebarSvgRect.y - uiGapPx * unitsPerPxY);
      } else {
        safeRight = Math.min(safeRight, sidebarSvgRect.x - uiGapPx * unitsPerPxX);
      }
    }
    if (sidebarToggleSvgRect) {
      if (isMobile) {
        safeBottom = Math.min(safeBottom, sidebarToggleSvgRect.y - uiGapPx * unitsPerPxY);
      } else {
        safeRight = Math.min(safeRight, sidebarToggleSvgRect.x - uiGapPx * unitsPerPxX);
      }
    }

    const viewportRect = {
      x: safeLeft,
      y: safeTop,
      width: Math.max(40, safeRight - safeLeft),
      height: Math.max(30, safeBottom - safeTop),
    };

    const blockedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    if (topBarSvgRect) {
      blockedRects.push({
        x: visibleRect.x,
        y: visibleRect.y,
        width: visibleRect.width,
        height: topBarSvgRect.y + topBarSvgRect.height - visibleRect.y,
      });
    }
    if (sidebarSvgRect) {
      if (isMobile) {
        blockedRects.push({
          x: visibleRect.x,
          y: sidebarSvgRect.y,
          width: visibleRect.width,
          height: visibleRect.y + visibleRect.height - sidebarSvgRect.y,
        });
      } else {
        const blockedX = sidebarSvgRect.x;
        blockedRects.push({
          x: blockedX,
          y: visibleRect.y,
          width: visibleRect.x + visibleRect.width - blockedX,
          height: visibleRect.height,
        });
      }
    }
    if (sidebarToggleSvgRect) {
      blockedRects.push({
        x: sidebarToggleSvgRect.x - uiGapPx * unitsPerPxX,
        y: sidebarToggleSvgRect.y - uiGapPx * unitsPerPxY,
        width: sidebarToggleSvgRect.width + uiGapPx * 2 * unitsPerPxX,
        height: sidebarToggleSvgRect.height + uiGapPx * 2 * unitsPerPxY,
      });
    }

    const padding = 6;
    const gap = 8;

    return markerCodes.map((code) => {
      const area = areasByCode.get(code);
      if (!area) return null;

      const isCorrectArea = code === targetArea.code;
      const prefix = isCorrectArea ? t('map_label_correct') : t('map_label_wrong');
      const text = `${prefix} · ${area.name}`;
      const labelFontSize = useLargeAnswerLabels ? 22 : 14;
      const labelWidth = useLargeAnswerLabels
        ? Math.min(460, Math.max(230, text.length * 11.5 + 52))
        : Math.min(280, Math.max(130, text.length * 7.8 + 28));
      const labelHeight = useLargeAnswerLabels ? 54 : 34;

      const anchor = {
        x: mapTransform.x + mapTransform.zoom * area.centroid.x,
        y: mapTransform.y + mapTransform.zoom * area.centroid.y,
      };

      const areaScreenRect = {
        x: mapTransform.x + mapTransform.zoom * area.focusBounds.x,
        y: mapTransform.y + mapTransform.zoom * area.focusBounds.y,
        width: mapTransform.zoom * area.focusBounds.width,
        height: mapTransform.zoom * area.focusBounds.height,
      };

      const areaRight = areaScreenRect.x + areaScreenRect.width;
      const areaBottom = areaScreenRect.y + areaScreenRect.height;

      const seedRects = [
        {
          x: Math.max(areaScreenRect.x, Math.min(anchor.x - labelWidth / 2, areaRight - labelWidth)),
          y: areaScreenRect.y - labelHeight - 18,
        },
        {
          x: areaRight + 18,
          y: Math.max(areaScreenRect.y, Math.min(anchor.y - labelHeight / 2, areaBottom - labelHeight)),
        },
        {
          x: areaScreenRect.x - labelWidth - 18,
          y: Math.max(areaScreenRect.y, Math.min(anchor.y - labelHeight / 2, areaBottom - labelHeight)),
        },
        {
          x: Math.max(areaScreenRect.x, Math.min(anchor.x - labelWidth / 2, areaRight - labelWidth)),
          y: areaBottom + 18,
        },
        { x: anchor.x - labelWidth / 2, y: anchor.y - 44 },
        { x: anchor.x + 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth - 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth / 2, y: anchor.y + 14 },
      ].map((candidate) =>
        clampRectToViewport({ ...candidate, width: labelWidth, height: labelHeight }, viewportRect, padding),
      );

      let best = seedRects[0];
      let bestScore = Number.POSITIVE_INFINITY;

      for (const [index, seedRect] of seedRects.entries()) {
        const candidate = resolveLabelCollision({
          rect: seedRect,
          viewport: viewportRect,
          placedRects,
          blockedRects,
          viewportPadding: padding,
          labelGap: gap,
        });
        const overlaps = placedRects.some((rect) => rectsOverlap(candidate, rect, gap));
        const blockedOverlap = blockedRects.some((blocked) => getRectOverlapArea(candidate, blocked) > 0);
        const outsideViewport = getRectOutsideArea(candidate, viewportRect);
        const areaOverlap = getRectOverlapArea(candidate, areaScreenRect);
        const distance = Math.hypot(
          candidate.x + candidate.width / 2 - anchor.x,
          candidate.y + candidate.height / 2 - anchor.y,
        );
        const score = (overlaps ? 1_000_000 : 0)
          + (blockedOverlap ? 800_000 : 0)
          + outsideViewport * 100
          + areaOverlap * 10
          + distance * 0.2
          + index * 0.01;

        if (score < bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      const areaSize = Math.max(1, areaScreenRect.width * areaScreenRect.height);
      const visibleArea = getRectOverlapArea(areaScreenRect, viewportRect);
      const mostlyOutsideViewport = visibleArea / areaSize < 0.45;

      placedRects.push(best);

      return {
        key: code,
        text,
        labelFontSize,
        anchor,
        rect: best,
        showConnector: mostlyOutsideViewport,
        borderColor: isCorrectArea ? 'rgba(125,211,252,0.58)' : 'rgba(253,164,175,0.58)',
        connectorColor: isCorrectArea ? 'rgba(125,211,252,0.88)' : 'rgba(253,164,175,0.88)',
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [
    answer,
    targetArea,
    quiz.viewBox,
    areasByCode,
    isMobile,
    layoutPass,
    mapTransform.x,
    mapTransform.y,
    mapTransform.zoom,
    sidebarOpen,
    sidebarRef,
    sidebarToggleRef,
    svgRef,
    t,
    topBarRef,
    useLargeAnswerLabels,
  ]);

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${quiz.viewBox.width} ${quiz.viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={`absolute inset-0 h-full w-full select-none transition-opacity duration-300 ${mapVisible ? 'opacity-100' : 'opacity-0'} ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'none' }}
      >
        <g transform={`translate(${mapTransform.x}, ${mapTransform.y}) scale(${mapTransform.zoom})`}>
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
            {activeLevel?.sectionLabels.map((section) => {
              const translatedLabel = t(`section_labels.${section.labelKey}`);
              const renderBadge = shouldRenderSectionBadge(section.labelKey);
              return (
                <g key={`section-label-${section.id}`}>
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
                  {renderBadge ? (
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
                  ) : null}
                </g>
              );
            })}
          </g>

          {activeAreas.map((area) => {
            const isClickable = gameMode === 'map-click' && !answer;
            return (
              <path
                key={area.code}
                d={area.path}
                className={`${getAreaClasses(area, answer, targetArea, hoveredCode, gameMode)} outline-none transition-[fill,stroke] duration-150`}
                strokeWidth={0.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ outline: 'none' }}
                onClick={isClickable ? () => handleMapClick(area.code) : undefined}
                onMouseDown={isClickable ? (event) => { event.preventDefault(); } : undefined}
                onMouseEnter={isClickable ? () => setHoveredCode(area.code) : undefined}
                onMouseLeave={isClickable ? () => setHoveredCode(null) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : -1}
                aria-label={isClickable ? t('area_button_aria', { area: area.name }) : undefined}
                onKeyDown={isClickable ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleMapClick(area.code);
                  }
                } : undefined}
              />
            );
          })}
        </g>

        <g pointerEvents="none">
          {answerLabels.map((label) => {
            const connectorTo = getEdgePointToward(label.rect, label.anchor);
            const connectorPath = getCurvedConnectorPath({ from: label.anchor, to: connectorTo });
            return (
              <g key={`map-label-${label.key}`}>
                {label.showConnector ? (
                  <path
                    d={connectorPath}
                    fill="none"
                    stroke={label.connectorColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.62}
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

      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 transition-opacity duration-700 ${mapVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <MapIcon className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
      </div>

      {/* Area count badge — desktop watermark */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden lg:block">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45">
          {t(`top_badge.${activeLevelId}`, { count: activeAreas.length })}
        </span>
      </div>

      {/* Area count badge — mobile/medium, only when sidebar is collapsed */}
      {!sidebarOpen ? (
        <div className="pointer-events-none absolute bottom-12 left-4 z-30 lg:hidden">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45">
            {t(`top_badge.${activeLevelId}`, { count: activeAreas.length })}
          </span>
        </div>
      ) : null}

      {/* Mobile score badge — visible after score hydration */}
      {scoreLoaded ? (
        <div className="pointer-events-none fixed right-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-40 lg:hidden">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/16 bg-slate-950/86 px-3 py-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.52)] backdrop-blur-md"
            onClick={() => {
              setConfirmClearScore(false);
              setIsScoreModalOpen(true);
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {t('score_correct_label')}
            </span>
            <span className="text-sm font-semibold tabular-nums text-white">
              {score.correct}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-sm font-semibold tabular-nums text-slate-200">
              {score.total}
            </span>
          </button>
        </div>
      ) : null}

      {/* Mobile/medium score details modal */}
      {isScoreModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm"
          onClick={() => {
            setConfirmClearScore(false);
            setIsScoreModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-details-title"
            className="w-full max-w-xl rounded-[1.5rem] border border-white/12 bg-slate-950/96 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200/82">{t('score_section_title')}</p>
                <h2 id="score-details-title" className="mt-2 text-xl font-semibold text-white">{t('score_section_title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmClearScore(false);
                  setIsScoreModalOpen(false);
                }}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {t('sources.close')}
              </button>
            </div>

            <div className="mt-4">
              <SubdivisionsGameScore />
            </div>

            <div className="mt-4">
              {confirmClearScore ? (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-50">
                  <p className="mb-3 text-sm font-medium text-rose-100">{t('clear_scores_confirm')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearScore();
                        setConfirmClearScore(false);
                        setIsScoreModalOpen(false);
                      }}
                      className="flex-1 rounded-lg border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-50 transition hover:border-rose-200/50 hover:bg-rose-500/30"
                    >
                      {t('clear_scores_confirm_cta')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearScore(false)}
                      className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    >
                      {t('clear_scores_cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearScore(true)}
                  disabled={!hasScore}
                  className={`flex w-full items-center justify-center rounded-xl border px-3 py-2 text-sm transition ${hasScore ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-500/15' : 'cursor-not-allowed border-white/10 bg-white/5 text-slate-500'}`}
                >
                  {t('clear_scores')}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Data sources watermark — desktop */}
      <button
        type="button"
        onClick={() => setIsSourcesModalOpen(true)}
        className="absolute bottom-4 right-4 z-10 hidden lg:block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45 transition-[color] duration-150 hover:text-slate-100/90 focus-visible:text-slate-100/90"
      >
        {t('sources.open_button')}
      </button>

      {/* Data sources watermark — mobile/medium, only when sidebar is collapsed */}
      {!sidebarOpen ? (
        <button
          type="button"
          onClick={() => setIsSourcesModalOpen(true)}
          className="absolute bottom-12 right-4 z-30 lg:hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45 transition-[color] duration-150 hover:text-slate-100/90 focus-visible:text-slate-100/90"
        >
          {t('sources.open_button')}
        </button>
      ) : null}

      {/* Sources modal */}
      {isSourcesModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm"
          onClick={() => setIsSourcesModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="geojson-sources-title"
            className="w-full max-w-2xl rounded-[1.75rem] border border-white/12 bg-slate-950/96 p-5 shadow-[0_32px_90px_rgba(2,6,23,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-200/82">{t('sources.open_button')}</p>
                <h2 id="geojson-sources-title" className="mt-2 text-xl font-semibold text-white">{t('sources.modal_title')}</h2>
                <p className="mt-1 text-sm text-slate-300">{t('sources.modal_body')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSourcesModalOpen(false)}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
              >
                {t('sources.close')}
              </button>
            </div>
            <div className="mt-5 max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto pr-1">
              {dataSourceSections.map((section) => (
                <section key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-300">{section.title}</h3>
                  <div className="mt-3 space-y-3">
                    {section.items.map((item) => (
                      <div key={`${section.id}-${item.filePath}`} className="rounded-2xl border border-white/8 bg-slate-900/72 p-3">
                        <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-slate-400">{item.filePath}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">{item.sourceLabel}</p>
                        <p className="mt-1 text-sm text-slate-300">{item.note}</p>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/22 hover:bg-white/10"
                          >
                            {t('sources.open_link')}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
