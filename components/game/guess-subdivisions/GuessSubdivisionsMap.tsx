'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Map as MapIcon } from 'lucide-react';
import type { QuizArea } from '~/lib/server/adminSubdivisionQuiz';
import { useSubdivisionsGame } from './contexts/SubdivisionsGameContext';
import { useSubdivisionsGameMap } from './contexts/SubdivisionsGameMapContext';

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
  const {
    quiz,
    activeLevel,
    activeAreas,
    areasByCode,
    gameMode,
    targetArea,
    answer,
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
    const viewport = { x: 0, y: 0, width: quiz.viewBox.width, height: quiz.viewBox.height };
    const padding = 8;
    const gap = 10;

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

      const candidates = [
        { x: anchor.x - labelWidth / 2, y: anchor.y - 44 },
        { x: anchor.x + 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth - 14, y: anchor.y - 16 },
        { x: anchor.x - labelWidth / 2, y: anchor.y + 14 },
      ].map((candidate) =>
        clampRectToViewport({ ...candidate, width: labelWidth, height: labelHeight }, viewport, padding),
      );

      let best = candidates[0];
      let bestScore = Number.POSITIVE_INFINITY;

      for (const candidate of candidates) {
        const overlaps = placedRects.some((rect) => rectsOverlap(candidate, rect, gap));
        const distance = Math.hypot(
          candidate.x + candidate.width / 2 - anchor.x,
          candidate.y + candidate.height / 2 - anchor.y,
        );
        const score = (overlaps ? 1_000_000 : 0) + distance;
        if (score < bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      placedRects.push(best);

      const edgePoint = getEdgePointToward(best, anchor);
      const connectorLength = Math.hypot(edgePoint.x - anchor.x, edgePoint.y - anchor.y);

      return {
        key: code,
        text,
        labelFontSize,
        anchor,
        rect: best,
        showConnector: connectorLength > 14,
        borderColor: isCorrectArea ? 'rgba(125,211,252,0.58)' : 'rgba(253,164,175,0.58)',
        connectorColor: isCorrectArea ? 'rgba(125,211,252,0.88)' : 'rgba(253,164,175,0.88)',
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [answer, targetArea, quiz.viewBox.width, quiz.viewBox.height, areasByCode, mapTransform.x, mapTransform.y, mapTransform.zoom, t, useLargeAnswerLabels]);

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

      {/* Loading overlay */}
      <div
        className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 transition-opacity duration-700 ${mapVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <MapIcon className="animate-spin text-sky-400" size={64} strokeWidth={2.5} />
      </div>

      {/* Area count badge — desktop only, bottom-left watermark */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden sm:block">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45">
          {t(`top_badge.${activeLevelId}`, { count: activeAreas.length })}
        </span>
      </div>

      {/* Data sources watermark — desktop only, bottom-right */}
      <button
        type="button"
        onClick={() => setIsSourcesModalOpen(true)}
        className="absolute bottom-4 right-4 z-10 hidden sm:block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300/45 transition-[color] duration-150 hover:text-slate-100/90 focus-visible:text-slate-100/90"
      >
        {t('sources.open_button')}
      </button>

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
