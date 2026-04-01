'use client';

import { useTranslations } from 'next-intl';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useGame } from './contexts/GameContext';
import { useGameLayout } from './contexts/GameLayoutContext';
import { useGameMap } from './contexts/GameMapContext';
import { MAP_MODES } from './constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerState, RoundState } from './types';

type LayoutObservedElement = SVGSVGElement | HTMLDivElement | HTMLButtonElement;

function getMarkerPinPath(size: number): string {
  const xOuter = size * 0.95;
  const yMid = size * 0.9;
  const yTop = size * 2.15;
  const xInner = size * 1.15;
  return `M 0 0 C ${-xOuter} ${-yMid} ${-xInner} ${-yTop} 0 ${-yTop} C ${xInner} ${-yTop} ${xOuter} ${-yMid} 0 0 Z`;
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

function rectsOverlapWithGap(
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
    return placedRects.some((placed) => rectsOverlapWithGap(candidate, placed, labelGap))
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
  const tX = dx !== 0 ? (dx > 0 ? hw / dx : -hw / dx) : Infinity;
  const tY = dy !== 0 ? (dy > 0 ? hh / dy : -hh / dy) : Infinity;
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
    return { x: svgPt1.x, y: svgPt1.y, width: svgPt2.x - svgPt1.x, height: svgPt2.y - svgPt1.y };
  } catch {
    return null;
  }
}

function getVisibleViewBoxRect(params: {
  viewBox: { width: number; height: number };
  svgElement: SVGSVGElement | null;
  preserveMode: 'slice' | 'meet';
}): { x: number; y: number; width: number; height: number } {
  const { viewBox, svgElement, preserveMode } = params;
  const fallback = { x: 0, y: 0, width: viewBox.width, height: viewBox.height };

  if (!svgElement) return fallback;

  const screenWidth = svgElement.clientWidth;
  const screenHeight = svgElement.clientHeight;
  if (screenWidth <= 0 || screenHeight <= 0) return fallback;

  if (preserveMode === 'meet') {
    return fallback;
  }

  const scale = Math.max(screenWidth / viewBox.width, screenHeight / viewBox.height);
  const visibleWidth = screenWidth / scale;
  const visibleHeight = screenHeight / scale;

  return {
    x: (viewBox.width - visibleWidth) / 2,
    y: (viewBox.height - visibleHeight) / 2,
    width: visibleWidth,
    height: visibleHeight,
  };
}

function measureSvgTextWidth(params: {
  text: string;
  fontSize: number;
  fontWeight: number;
  svgElement: SVGSVGElement | null;
}): number {
  const { text, fontSize, fontWeight, svgElement } = params;

  if (typeof document !== 'undefined' && svgElement) {
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', '-9999');
    textNode.setAttribute('y', '-9999');
    textNode.setAttribute('visibility', 'hidden');
    textNode.setAttribute('font-size', `${fontSize}`);
    textNode.setAttribute('font-weight', `${fontWeight}`);
    textNode.setAttribute('font-family', 'sans-serif');
    textNode.textContent = text;

    svgElement.appendChild(textNode);
    const measuredWidth = textNode.getComputedTextLength();
    svgElement.removeChild(textNode);

    if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
      return measuredWidth;
    }
  }

  return text.length * fontSize * 0.62;
}

function getStatusClasses(params: {
  countryCode: string;
  round: RoundState;
  answer: AnswerState | null;
  hoveredCode: string | null;
}): string {
  const { countryCode, round, answer, hoveredCode } = params;

  if (answer?.selectedCode === countryCode && answer.correct) {
    return 'fill-emerald-400/85 stroke-emerald-100';
  }

  if (answer?.selectedCode === countryCode && !answer.correct) {
    return 'fill-rose-400/90 stroke-rose-100';
  }

  if (answer && round.targetCode === countryCode) {
    return 'fill-sky-400/90 stroke-sky-100';
  }

  if (!answer && !MAP_MODES.has(round.mode) && round.targetCode === countryCode) {
    return 'fill-amber-300/90 stroke-amber-100';
  }

  if (!answer && hoveredCode === countryCode && MAP_MODES.has(round.mode)) {
    return 'fill-slate-500/95 stroke-slate-100';
  }

  return 'fill-slate-800/84 stroke-slate-400/58';
}

export default function GameMap2D({ onInitialZoomEnd }: { onInitialZoomEnd?: () => void }) {
  const t = useTranslations('guesser');
  const { quiz, round, answer, hoveredCode, accent, submitAnswer, setHoveredCode } = useGame();
  const { isMobile, sidebarOpen, sidebarRef, sidebarToggleRef, topBarRef } = useGameLayout();
  const { svgRef, pathRefs, mapTransform } = useGameMap();
  const [nonPlayablePaths, setNonPlayablePaths] = useState<string[]>([]);
  const [layoutPass, setLayoutPass] = useState(0);
  const [showAnswerLabels, setShowAnswerLabels] = useState(false);
  const layoutRefreshFrameRef = useRef<number | null>(null);
  const labelRevealFrameRef = useRef<number | null>(null);
  const pendingLabelRevealPassRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadNonPlayablePaths = async () => {
      try {
        const geoData: GeoJSON.FeatureCollection = await fetch('/maps/world-countries-110m.geojson').then((res) => res.json());
        if (!mounted) return;

        const projection = geoNaturalEarth1();
        projection.fitExtent(
          [[24, 24], [quiz.viewBox.width - 24, quiz.viewBox.height - 24]],
          geoData as never,
        );
        const generator = geoPath(projection);
        const playableCodes = new Set(quiz.countries.map((country) => country.code.toUpperCase()));

        const resolvedPaths: string[] = [];
        for (const feature of geoData.features ?? []) {
          if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;
          const properties = feature.properties as Record<string, unknown> | null;
          const isoA2 = typeof properties?.ISO_A2 === 'string' ? properties.ISO_A2.toUpperCase() : '';
          const isoA2Eh = typeof properties?.ISO_A2_EH === 'string' ? properties.ISO_A2_EH.toUpperCase() : '';
          const featureCode = /^[A-Z]{2}$/.test(isoA2) ? isoA2 : (/^[A-Z]{2}$/.test(isoA2Eh) ? isoA2Eh : '');

          if (featureCode && playableCodes.has(featureCode)) {
            continue;
          }

          const path = generator(feature as GeoJSON.Feature<GeoJSON.Geometry>);
          if (path) {
            resolvedPaths.push(path);
          }
        }

        setNonPlayablePaths(resolvedPaths);
      } catch {
        if (mounted) {
          setNonPlayablePaths([]);
        }
      }
    };

    loadNonPlayablePaths();
    return () => {
      mounted = false;
    };
  }, [quiz.countries, quiz.viewBox.height, quiz.viewBox.width]);

  useEffect(() => {
    return () => {
      if (layoutRefreshFrameRef.current !== null) {
        cancelAnimationFrame(layoutRefreshFrameRef.current);
      }
      if (labelRevealFrameRef.current !== null) {
        cancelAnimationFrame(labelRevealFrameRef.current);
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

  const answerRevealKey = answer
    ? `${answer.selectedCode ?? 'none'}:${round.targetCode ?? 'none'}:${answer.correct ? '1' : '0'}`
    : null;

  useEffect(() => {
    if (!onInitialZoomEnd) return;
    const timeout = setTimeout(onInitialZoomEnd, 350);
    return () => clearTimeout(timeout);
  }, [onInitialZoomEnd]);

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

  useEffect(() => {
    if (!answerRevealKey) {
      setShowAnswerLabels(false);
      pendingLabelRevealPassRef.current = null;
      if (labelRevealFrameRef.current !== null) {
        cancelAnimationFrame(labelRevealFrameRef.current);
        labelRevealFrameRef.current = null;
      }
      return;
    }

    setShowAnswerLabels(false);
    pendingLabelRevealPassRef.current = layoutPass + 1;
    scheduleLayoutRefresh();
  }, [answerRevealKey, scheduleLayoutRefresh]);

  useEffect(() => {
    if (!answer) return;
    if (pendingLabelRevealPassRef.current === null) return;
    if (layoutPass < pendingLabelRevealPassRef.current) return;

    pendingLabelRevealPassRef.current = null;
    labelRevealFrameRef.current = requestAnimationFrame(() => {
      labelRevealFrameRef.current = null;
      setShowAnswerLabels(true);
    });
  }, [answer, layoutPass]);

  const answerMarkers = useMemo(() => {
    if (!answer) return [];

    const markerCountries = Array.from(new Set([answer.selectedCode, round.targetCode].filter(Boolean)))
      .map((code) => quiz.countries.find((item) => item.code === code))
      .filter((country): country is (typeof quiz.countries)[number] => Boolean(country));

    const placedRects: Array<{ x: number; y: number; width: number; height: number }> = [];
    const visibleRect = getVisibleViewBoxRect({
      viewBox: quiz.viewBox,
      svgElement: svgRef.current,
      preserveMode: isMobile ? 'slice' : 'meet',
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

    return markerCountries.map((country) => {
      const isCorrectCountry = country.code === round.targetCode;
      const compactLabel = `${country.capital} · ${country.name}`;
      const labelFontSize = 12.2;
      const labelFontWeight = 600;
      const labelPaddingX = isMobile ? 9 : 8;
      const labelWidth = Math.max(
        24,
        measureSvgTextWidth({
          text: compactLabel,
          fontSize: labelFontSize,
          fontWeight: labelFontWeight,
          svgElement,
        }) + labelPaddingX * 2,
      );
      const labelHeight = 25;
      const scale = mapTransform.k;
      const screenX = mapTransform.x + scale * country.capitalPoint.x;
      const screenY = mapTransform.y + scale * country.capitalPoint.y;

      const countryScreenRect = {
        x: mapTransform.x + scale * country.focusBounds.x,
        y: mapTransform.y + scale * country.focusBounds.y,
        width: scale * country.focusBounds.width,
        height: scale * country.focusBounds.height,
      };

      const countryRight = countryScreenRect.x + countryScreenRect.width;
      const countryBottom = countryScreenRect.y + countryScreenRect.height;

      const labelCandidates = [
        {
          x: Math.max(countryScreenRect.x, Math.min(screenX - labelWidth / 2, countryRight - labelWidth)) - screenX,
          y: countryScreenRect.y - labelHeight - 18 - screenY,
        },
        {
          x: countryRight + 18 - screenX,
          y: Math.max(countryScreenRect.y, Math.min(screenY - labelHeight / 2, countryBottom - labelHeight)) - screenY,
        },
        {
          x: countryScreenRect.x - labelWidth - 18 - screenX,
          y: Math.max(countryScreenRect.y, Math.min(screenY - labelHeight / 2, countryBottom - labelHeight)) - screenY,
        },
        {
          x: Math.max(countryScreenRect.x, Math.min(screenX - labelWidth / 2, countryRight - labelWidth)) - screenX,
          y: countryBottom + 18 - screenY,
        },
        { x: -labelWidth / 2, y: -48 },
        { x: 10, y: -48 },
        { x: -labelWidth - 10, y: -48 },
        { x: -labelWidth / 2, y: 15 },
      ];

      let selectedRect: {
        x: number;
        y: number;
        width: number;
        height: number;
      } = {
        x: labelCandidates[0].x,
        y: labelCandidates[0].y,
        width: labelWidth,
        height: labelHeight,
      };

      let bestScore = Number.POSITIVE_INFINITY;
      const viewportPadding = 6;
      const labelGap = 8;

      for (const [index, candidate] of labelCandidates.entries()) {
        const candidateRectRaw = {
          x: screenX + candidate.x,
          y: screenY + candidate.y,
          width: labelWidth,
          height: labelHeight,
        };

        const maxX = viewportRect.x + viewportRect.width - candidateRectRaw.width - viewportPadding;
        const maxY = viewportRect.y + viewportRect.height - candidateRectRaw.height - viewportPadding;
        const candidateRect = {
          ...candidateRectRaw,
          x: Math.max(viewportRect.x + viewportPadding, Math.min(candidateRectRaw.x, maxX)),
          y: Math.max(viewportRect.y + viewportPadding, Math.min(candidateRectRaw.y, maxY)),
        };

        const overlaps = placedRects.some((placed) => rectsOverlapWithGap(candidateRect, placed, labelGap));

        const countryOverlap = getRectOverlapArea(candidateRect, countryScreenRect);
        const outsideViewport = getRectOutsideArea(candidateRect, viewportRect);
        const blockedOverlap = blockedRects.some((blocked) => getRectOverlapArea(candidateRect, blocked) > 0);
        const distance = Math.hypot((candidateRect.x + candidateRect.width / 2) - screenX, (candidateRect.y + candidateRect.height / 2) - screenY);
        const score = (overlaps ? 1_000_000 : 0) + (blockedOverlap ? 800_000 : 0) + outsideViewport * 100 + countryOverlap * 10 + distance * 0.2 + index * 0.01;

        if (score < bestScore) {
          bestScore = score;
          selectedRect = {
            x: candidateRect.x - screenX,
            y: candidateRect.y - screenY,
            width: labelWidth,
            height: labelHeight,
          };
        }
      }

      const selectedScreenX = screenX + selectedRect.x;
      const selectedScreenY = screenY + selectedRect.y;
      const labelScreenRect = resolveLabelCollision({
        rect: {
          x: selectedScreenX,
          y: selectedScreenY,
          width: selectedRect.width,
          height: selectedRect.height,
        },
        viewport: viewportRect,
        placedRects,
        blockedRects,
        viewportPadding,
        labelGap,
      });

      const finalLabelScreenRect = {
        x: labelScreenRect.x,
        y: labelScreenRect.y,
        width: selectedRect.width,
        height: selectedRect.height,
      };

      const countryArea = Math.max(1, countryScreenRect.width * countryScreenRect.height);
      const visibleCountryArea = getRectOverlapArea(countryScreenRect, viewportRect);
      const mostlyOutsideViewport = visibleCountryArea / countryArea < 0.45;

      placedRects.push({
        x: finalLabelScreenRect.x,
        y: finalLabelScreenRect.y,
        width: finalLabelScreenRect.width,
        height: finalLabelScreenRect.height,
      });

      return {
        country,
        compactLabel,
        isCorrectCountry,
        labelFontSize,
        labelFontWeight,
        labelPaddingX,
        pinScreenPoint: { x: screenX, y: screenY },
        showConnector: mostlyOutsideViewport,
        labelScreenRect: finalLabelScreenRect,
      };
    });
  }, [answer, isMobile, layoutPass, mapTransform.k, mapTransform.x, mapTransform.y, quiz.countries, quiz.viewBox, round.targetCode, sidebarOpen, sidebarRef, sidebarToggleRef, topBarRef, svgRef]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${quiz.viewBox.width} ${quiz.viewBox.height}`}
      className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
    >
      <defs>
        <pattern
          id="quiz-grid"
          width="30"
          height="30"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.k})`}
        >
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={0.75} />
        </pattern>
        <radialGradient id="quiz-grid-fade-gradient" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="white" />
          <stop offset="70%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id="quiz-grid-fade-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={quiz.viewBox.width} height={quiz.viewBox.height}>
          <rect width={quiz.viewBox.width} height={quiz.viewBox.height} fill="url(#quiz-grid-fade-gradient)" />
        </mask>
        <radialGradient id="quiz-map-glow" cx="50%" cy="46%" r="70%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
          <stop offset="62%" stopColor="rgba(15,23,42,0.14)" />
          <stop offset="100%" stopColor="rgba(2,6,23,0)" />
        </radialGradient>
      </defs>

      <rect width={quiz.viewBox.width} height={quiz.viewBox.height} fill="rgba(7,26,49,0.72)" />
      <rect width={quiz.viewBox.width} height={quiz.viewBox.height} fill="url(#quiz-map-glow)" />
      <rect
        width={quiz.viewBox.width}
        height={quiz.viewBox.height}
        fill="url(#quiz-grid)"
        mask="url(#quiz-grid-fade-mask)"
        pointerEvents="none"
      />

      <g transform={`translate(${mapTransform.x},${mapTransform.y}) scale(${mapTransform.k})`}>
        <g pointerEvents="none">
          {nonPlayablePaths.map((path, index) => (
            <path
              key={`non-playable-${index}`}
              d={path}
              className="fill-slate-800/76 stroke-slate-500/62"
              strokeWidth={0.75}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {quiz.countries.map((country) => {
          const isClickable = MAP_MODES.has(round.mode) && !answer;
          return (
            <path
              key={country.code}
              ref={(node) => {
                pathRefs.current[country.code] = node;
              }}
              d={country.path}
              className={`${getStatusClasses({ countryCode: country.code, round, answer, hoveredCode })} outline-none transition-[fill,stroke,filter] duration-200`}
              strokeWidth={country.code === round.targetCode || answer?.selectedCode === country.code ? 1.15 : 0.68}
              vectorEffect="non-scaling-stroke"
              style={{
                filter: country.code === round.targetCode && !answer && !MAP_MODES.has(round.mode)
                  ? `drop-shadow(0 0 16px ${accent})`
                  : 'none',
                outline: 'none',
              }}
              onClick={isClickable ? () => submitAnswer(country.code) : undefined}
              onMouseEnter={isClickable ? () => setHoveredCode(country.code) : undefined}
              onMouseLeave={isClickable ? () => setHoveredCode((current) => (current === country.code ? null : current)) : undefined}
              onFocus={isClickable ? () => setHoveredCode(country.code) : undefined}
              onBlur={isClickable ? () => setHoveredCode((current) => (current === country.code ? null : current)) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : -1}
              aria-label={isClickable ? t('country_button_aria', { country: country.name }) : undefined}
              onKeyDown={isClickable ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  submitAnswer(country.code);
                }
              } : undefined}
            />
          );
        })}

        {answerMarkers.map(({ country, isCorrectCountry }) => {
          const pinColor = isCorrectCountry ? 'rgba(56,189,248,0.98)' : 'rgba(251,113,133,0.98)';
          const fixedScale = 1 / Math.max(mapTransform.k, 0.001);

          return (
            <g key={`capital-pin-${country.code}`} pointerEvents="none" transform={`translate(${country.capitalPoint.x}, ${country.capitalPoint.y})`}>
              <g transform={`scale(${fixedScale})`}>
                <path
                  d={getMarkerPinPath(6.2)}
                  fill={pinColor}
                  stroke="rgba(248,250,252,0.95)"
                  strokeWidth={1.1}
                />
              </g>
            </g>
          );
        })}
      </g>

      <g
        pointerEvents="none"
        style={{
          opacity: showAnswerLabels ? 1 : 0,
          transition: 'opacity 140ms ease-out',
        }}
      >
        {answerMarkers.map(({ country, compactLabel, isCorrectCountry, labelFontSize, labelFontWeight, labelPaddingX, pinScreenPoint, showConnector, labelScreenRect }) => {
          const labelBorderColor = isCorrectCountry ? 'rgba(125,211,252,0.55)' : 'rgba(253,164,175,0.55)';
          const connectorColor = isCorrectCountry ? 'rgba(125,211,252,0.88)' : 'rgba(253,164,175,0.88)';
          const connectorTo = getEdgePointToward(labelScreenRect, pinScreenPoint);
          const connectorPath = getCurvedConnectorPath({ from: pinScreenPoint, to: connectorTo });

          return (
            <g key={`capital-label-${country.code}`}>
              {showConnector ? (
                <path
                  d={connectorPath}
                  fill="none"
                  stroke={connectorColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.62}
                />
              ) : null}
              <rect
                x={labelScreenRect.x}
                y={labelScreenRect.y}
                rx={8.5}
                ry={8.5}
                width={labelScreenRect.width}
                height={labelScreenRect.height}
                fill="rgba(2,6,23,0.72)"
                stroke={labelBorderColor}
                strokeWidth={1.1}
              />
              <text
                x={labelScreenRect.x + labelScreenRect.width / 2}
                y={labelScreenRect.y + labelScreenRect.height / 2 + 0.5}
                dominantBaseline="central"
                textAnchor="middle"
                fill="rgba(226,232,240,0.94)"
                fontSize={labelFontSize}
                fontWeight={labelFontWeight}
              >
                {compactLabel}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
