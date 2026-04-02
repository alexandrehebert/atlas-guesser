'use client';

import { useEffect, useRef } from 'react';
import { useGame } from './contexts/GameContext';
import { useGameLayout } from '../contexts/GameLayoutContext';
import { useGameMap } from '../contexts/GameMapContext';
import { MAP_MODES } from '../constants';

interface GlobeMapProps {
  onInitialZoomEnd?: () => void;
}

interface AnswerLabelDatum {
  code: string;
  lat: number;
  lng: number;
  text: string;
  isCorrectCountry: boolean;
}

// Match the exact status hues used by the 2D SVG map classes.
const COLORS: Record<string, string> = {
  default: 'rgba(30,41,59,0.84)',      // fill-slate-800/84
  hover: 'rgba(100,116,139,0.95)',     // fill-slate-500/95
  target: 'rgba(252,211,77,0.90)',     // fill-amber-300/90
  correct: 'rgba(52,211,153,0.85)',    // fill-emerald-400/85
  incorrect: 'rgba(251,113,133,0.90)', // fill-rose-400/90
  targetRevealed: 'rgba(56,189,248,0.90)', // fill-sky-400/90
};
const NON_PLAYABLE = {
  fill: 'rgba(30,41,59,0.76)',    // close to fill-slate-800 while still muted
  stroke: 'rgba(100,116,139,0.62)',
};
const DEFAULT_ALT = 1.65;
const MOBILE_ALT  = 1.95;
const FOCUS_ALT   = 1.15;
const INITIAL_LNG = -20;
const INITIAL_LAT = 15;
const OCEAN_COLOR = '#071a31';

export default function GameMap3D({ onInitialZoomEnd }: GlobeMapProps) {
  const { quiz, round, answer, hoveredCode, submitAnswer, setHoveredCode, mode } = useGame();
  const { isMobile } = useGameLayout();
  const { setGlobeRef } = useGameMap();

  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef     = useRef<any>(null);
  const colorMapRef  = useRef<Map<string, string>>(new Map());

  const modeRef   = useRef(mode);
  const answerRef = useRef(answer);
  const submitAnswerRef = useRef(submitAnswer);
  useEffect(() => { modeRef.current   = mode;   }, [mode]);
  useEffect(() => { answerRef.current = answer; }, [answer]);
  useEffect(() => { submitAnswerRef.current = submitAnswer; }, [submitAnswer]);

  // ─── Build answer labels (same content as 2D: "capital · country") ───────
  const answerLabels: AnswerLabelDatum[] = (() => {
    if (!answer) return [];

    const codes = Array.from(new Set([answer.selectedCode, round.targetCode].filter(Boolean)));
    return codes
      .map((code) => {
        const country = quiz.countries.find((item) => item.code === code);
        if (!country) return null;
        return {
          code: country.code,
          lat: country.latlng[0],
          lng: country.latlng[1],
          text: `${country.capital} · ${country.name}`,
          isCorrectCountry: country.code === round.targetCode,
        };
      })
      .filter((item): item is AnswerLabelDatum => item !== null);
  })();

  // ─── Rebuild color map whenever game state changes ─────────────────────────
  useEffect(() => {
    const cm = new Map<string, string>();
    for (const country of quiz.countries) {
      const c = country.code;
      let color = COLORS.default;
      if      (answer?.selectedCode === c && answer.correct)              color = COLORS.correct;
      else if (answer?.selectedCode === c && !answer.correct)             color = COLORS.incorrect;
      else if (answer && round.targetCode === c)                          color = COLORS.targetRevealed;
      else if (!answer && !MAP_MODES.has(mode) && round.targetCode === c) color = COLORS.target;
      else if (!answer && hoveredCode === c)                              color = COLORS.hover;
      cm.set(c, color);
    }
    colorMapRef.current = cm;

    if (globeRef.current) {
      globeRef.current.polygonCapColor(
        (d: any) => (d.properties?.quizCode
          ? colorMapRef.current.get(d.properties.quizCode) ?? COLORS.default
          : NON_PLAYABLE.fill),
      );
      globeRef.current.polygonStrokeColor(
        (d: any) => (d.properties?.quizCode ? 'rgba(203,213,225,0.55)' : NON_PLAYABLE.stroke),
      );
    }
  }, [quiz.countries, round.targetCode, answer, hoveredCode, mode]);

  // ─── Keep globe labels in sync with answer state ───────────────────────────
  useEffect(() => {
    if (!globeRef.current) return;

    globeRef.current
      .htmlElementsData(answerLabels)
      .htmlLat((d: AnswerLabelDatum) => d.lat)
      .htmlLng((d: AnswerLabelDatum) => d.lng)
      .htmlAltitude(() => 0.028)
      .htmlElement((d: AnswerLabelDatum) => {
        const el = document.createElement('div');
        el.textContent = d.text;
        el.style.pointerEvents = 'none';
        el.style.whiteSpace = 'nowrap';
        el.style.padding = '4px 10px';
        el.style.borderRadius = '999px';
        el.style.fontSize = '12px';
        el.style.fontWeight = '600';
        el.style.color = 'rgba(226,232,240,0.94)';
        el.style.background = 'rgba(2,6,23,0.72)';
        el.style.border = d.isCorrectCountry
          ? '1px solid rgba(125,211,252,0.55)'
          : '1px solid rgba(253,164,175,0.55)';
        el.style.boxShadow = '0 6px 16px rgba(2,6,23,0.35)';
        el.style.transform = 'translate(-50%, -120%)';
        return el;
      });
  }, [answerLabels]);

  // ─── Globe initialisation (runs once on the client) ────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;
    const container = containerRef.current;
    const altitude  = isMobile ? MOBILE_ALT : DEFAULT_ALT;
    let removeResizeListener: (() => void) | null = null;

    const init = async () => {
      // Let React paint switch/loading UI before globe setup work starts.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const geoData: GeoJSON.FeatureCollection = await fetch('/maps/world-countries-110m.geojson').then(r => r.json());
      if (!mounted) return;

      const iso2code = new Map<string, string>(quiz.countries.map(c => [c.code, c.code]));

      // Some Natural Earth features (e.g. France, Norway) have ISO_A2 = '-99';
      // fall back to ISO_A2_EH which carries the correct value.
      const features = (geoData.features ?? [])
        .filter(f => f.geometry)
        .map(f => {
          const raw: string = f.properties?.ISO_A2 ?? '';
          const upperRaw = raw.toUpperCase();
          const rawIsValidIso2 = /^[A-Z]{2}$/.test(upperRaw);
          const fallbackIso2: string = (f.properties?.ISO_A2_EH ?? '').toUpperCase();
          const isoKey = rawIsValidIso2 ? upperRaw : fallbackIso2;
          return {
            ...f,
            properties: { ...f.properties, quizCode: iso2code.get(isoKey) ?? null },
          };
        });

      const { default: Globe } = await import('globe.gl');
      if (!mounted || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globe = (Globe as any)({
        animateIn: false,
        waitForGlobeReady: false,
        rendererConfig: { antialias: true, alpha: true },
      })(container);

      globe
        .globeImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mPgldYCAACLAFN4VUZsAAAAAElFTkSuQmCC')
        .backgroundColor('rgba(0,0,0,0)')
        .showGraticules(true)
        .showAtmosphere(true)
        .atmosphereColor('#3b82f6')
        .atmosphereAltitude(0.14)
        .polygonsData(features)
        .polygonGeoJsonGeometry((d: any) => d.geometry)
        .polygonAltitude(0.018)
        .polygonCapColor(
          (d: any) => (d.properties?.quizCode
            ? colorMapRef.current.get(d.properties.quizCode) ?? COLORS.default
            : NON_PLAYABLE.fill),
        )
        .polygonSideColor(() => '#0a1628')
        .polygonStrokeColor((d: any) => (d.properties?.quizCode ? 'rgba(203,213,225,0.55)' : NON_PLAYABLE.stroke))
        .onPolygonHover((d: any) => {
          if (!MAP_MODES.has(modeRef.current)) return;
          setHoveredCode(d?.properties?.quizCode ?? null);
        })
        .onPolygonClick((d: any) => {
          const code: string | null = d?.properties?.quizCode ?? null;
          if (!code || answerRef.current || !MAP_MODES.has(modeRef.current)) return;
          submitAnswerRef.current(code);
        });

      const globeMaterial = globe.globeMaterial?.();
      if (globeMaterial) {
        globeMaterial.color?.set?.(OCEAN_COLOR);
        globeMaterial.emissive?.set?.(OCEAN_COLOR);
        globeMaterial.emissiveIntensity = 0.2;
        globeMaterial.specular?.set?.('#0b1220');
        globeMaterial.shininess = 2;
        globeMaterial.map = null;
        globeMaterial.needsUpdate = true;
      }

      globe.pointOfView({ lat: INITIAL_LAT, lng: INITIAL_LNG, altitude }, 0);
      globe.width(container.clientWidth).height(container.clientHeight);

      const onResize = () => {
        if (containerRef.current) {
          globe.width(containerRef.current.clientWidth).height(containerRef.current.clientHeight);
        }
      };
      window.addEventListener('resize', onResize);

      globeRef.current = globe;
      setGlobeRef(globe);

      setTimeout(() => { if (mounted) onInitialZoomEnd?.(); }, 450);

      removeResizeListener = () => window.removeEventListener('resize', onResize);
    };

    init().catch(console.error);
    return () => {
      mounted = false;
      removeResizeListener?.();

      if (globeRef.current) {
        const globeInstance = globeRef.current as any;
        globeInstance.pauseAnimation?.();
        globeInstance._destructor?.();
      }

      globeRef.current = null;
      setGlobeRef(null);

      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally mount-once

  return (
    <div className="absolute inset-0 z-10">
      <div
        ref={containerRef}
        className="absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(2,6,23,0) 62%, rgba(2,6,23,0.42) 86%, rgba(2,6,23,0.62) 100%)',
        }}
      />
    </div>
  );
}
