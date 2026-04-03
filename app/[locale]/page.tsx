import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import {
  BarChart3,
  Heart,
  Layers3,
  MapPinned,
  Sparkles,
} from 'lucide-react';
import CountryFlag from '~/components/CountryFlag';
import LanguageSwitcher from '~/components/LanguageSwitcher';
import { PwaInstallCallToAction } from '~/components/PwaInstallCallToAction';
import { HeroSection } from '~/components/landing/HeroSection';
import { StatsSection } from '~/components/landing/StatsSection';
import { MapSection } from '~/components/landing/MapSection';
import { LandingMapPreviewNoSSR } from '~/components/landing/LandingMapPreviewNoSSR';
import { LandingGameStartCtas } from '~/components/landing/LandingGameStartCtas';
import { SubdivisionsCountryPreviewList } from '~/components/landing/SubdivisionsCountryPreviewList';
import { MAP_MODES, MODE_ORDER } from '~/components/game/constants';
import { getCountryQuizPayload } from '~/lib/server/countryQuiz';
import { getAdminSubdivisionCatalogStats } from '~/lib/server/adminSubdivisionQuiz';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES } from '~/lib/adminQuizCountries';
import { getAdminQuizCountryShapePreviews } from '~/lib/server/adminQuizCountryShapePreviews';

const LANDING_MAP_VIEWBOX = { width: 420, height: 280 };
const BRAZIL_PREVIEW_VIEWBOX = { width: 420, height: 280 };
const FALLBACK_PARIS_POINT = { x: 228, y: 86 };
const FALLBACK_MADRID_POINT = { x: 186, y: 140 };
const FALLBACK_BRAZIL_PIN_POINT = { x: 226, y: 148 };

interface LandingMapPreviewData {
  paths: string[];
  countryPathsByCode: Record<string, string>;
  countryPathsByName: Record<string, string>;
  parisPoint: { x: number; y: number };
  madridPoint: { x: number; y: number };
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

interface BrazilSubdivisionPreviewData {
  paths: string[];
  ghostWorldPaths: string[];
  highlightedPath?: string;
  highlightPinPoint: { x: number; y: number };
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

async function getLandingMapPreviewData(): Promise<LandingMapPreviewData> {
  try {
    const filePath = join(process.cwd(), 'public/maps/world-countries-110m.geojson');
    const rawGeoData = await readFile(filePath, 'utf8');
    const geoData = JSON.parse(rawGeoData) as { features?: unknown[] };
    const projection = geoNaturalEarth1();

    const franceSpainPortugalFrame = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-15.0, 33.0] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [14.0, 56.0] } },
      ],
    };

    projection.fitExtent(
      [[110, 8], [LANDING_MAP_VIEWBOX.width - 8, LANDING_MAP_VIEWBOX.height - 8]],
      franceSpainPortugalFrame as never,
    );

    const generator = geoPath(projection);
    const countryPathsByCode: Record<string, string> = {};
    const countryPathsByName: Record<string, string> = {};
    const countryPathInViewByCode: Record<string, boolean> = {};
    const countryPathInViewByName: Record<string, boolean> = {};
    const paths = (geoData.features ?? [])
      .map((feature) => {
        const path = generator(feature as never);
        if (!path) return null;
        const properties = (feature as { properties?: Record<string, unknown> }).properties ?? {};
        const countryCode = typeof properties.ISO_A2 === 'string' ? properties.ISO_A2.toUpperCase() : '';
        const nameCandidates = [
          properties.NAME,
          properties.NAME_EN,
          properties.NAME_FR,
          properties.ADMIN,
          properties.SOVEREIGNT,
          properties.BRK_NAME,
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        const centroid = generator.centroid(feature as never);
        const isInPreviewFrame = Number.isFinite(centroid[0])
          && Number.isFinite(centroid[1])
          && centroid[0] >= 0
          && centroid[0] <= LANDING_MAP_VIEWBOX.width
          && centroid[1] >= 0
          && centroid[1] <= LANDING_MAP_VIEWBOX.height;

        if (/^[A-Z]{2}$/.test(countryCode)) {
          if (!countryPathsByCode[countryCode] || (isInPreviewFrame && !countryPathInViewByCode[countryCode])) {
            countryPathsByCode[countryCode] = path;
            countryPathInViewByCode[countryCode] = isInPreviewFrame;
          }
        }

        for (const name of nameCandidates) {
          const normalizedName = name.trim().toLowerCase();
          if (!countryPathsByName[normalizedName] || (isInPreviewFrame && !countryPathInViewByName[normalizedName])) {
            countryPathsByName[normalizedName] = path;
            countryPathInViewByName[normalizedName] = isInPreviewFrame;
          }
        }

        return path;
      })
      .filter((path): path is string => Boolean(path));

    const projectedParis = projection([2.3522, 48.8566]);
    const projectedMadrid = projection([-3.7038, 40.4168]);

    const parisPoint = projectedParis ? { x: projectedParis[0], y: projectedParis[1] } : FALLBACK_PARIS_POINT;
    const madridPoint = projectedMadrid ? { x: projectedMadrid[0], y: projectedMadrid[1] } : FALLBACK_MADRID_POINT;

    return {
      paths,
      countryPathsByCode,
      countryPathsByName,
      parisPoint,
      madridPoint,
    };
  } catch {
    return {
      paths: [],
      countryPathsByCode: {},
      countryPathsByName: {},
      parisPoint: FALLBACK_PARIS_POINT,
      madridPoint: FALLBACK_MADRID_POINT,
    };
  }
}

async function getBrazilSubdivisionPreviewData(): Promise<BrazilSubdivisionPreviewData> {
  try {
    const filePath = join(process.cwd(), 'public/maps/brazil-states.geojson');
    const rawGeoData = await readFile(filePath, 'utf8');
    const geoData = JSON.parse(rawGeoData) as { features?: unknown[] };
    const features = (geoData.features ?? []) as never[];

    if (features.length === 0) {
      return {
        paths: [],
        ghostWorldPaths: [],
        highlightPinPoint: FALLBACK_BRAZIL_PIN_POINT,
      };
    }

    const projection = geoMercator();
    projection.fitExtent(
      [[122, 52], [BRAZIL_PREVIEW_VIEWBOX.width - 128, BRAZIL_PREVIEW_VIEWBOX.height - 56]],
      {
        type: 'FeatureCollection',
        features,
      } as never,
    );

    const generator = geoPath(projection);
    const worldFilePath = join(process.cwd(), 'public/maps/world-countries-110m.geojson');
    const rawWorldGeoData = await readFile(worldFilePath, 'utf8');
    const worldGeoData = JSON.parse(rawWorldGeoData) as { features?: unknown[] };
    let highlightedPath: string | undefined;
    let highlightedFeature: never | undefined;

    const paths = features
      .map((feature) => {
        const path = generator(feature);
        if (!path) {
          return null;
        }

        const properties = (feature as { properties?: Record<string, unknown> }).properties ?? {};
        const propertyText = Object.values(properties)
          .filter((value): value is string => typeof value === 'string')
          .join(' ')
          .toLowerCase();

        if (!highlightedPath && /(sao paulo|s\u00e3o paulo)/.test(propertyText)) {
          highlightedPath = path;
          highlightedFeature = feature;
        }

        return path;
      })
      .filter((path): path is string => Boolean(path));

    const ghostWorldPaths = (worldGeoData.features ?? [])
      .map((feature) => generator(feature as never))
      .filter((path): path is string => Boolean(path));

    const highlightedCentroid = highlightedFeature ? generator.centroid(highlightedFeature) : null;

    return {
      paths,
      ghostWorldPaths,
      highlightedPath,
      highlightPinPoint: highlightedCentroid
        ? { x: highlightedCentroid[0], y: highlightedCentroid[1] }
        : FALLBACK_BRAZIL_PIN_POINT,
    };
  } catch {
    return {
      paths: [],
      ghostWorldPaths: [],
      highlightPinPoint: FALLBACK_BRAZIL_PIN_POINT,
    };
  }
}

function MetricCard({ label, value, helper, compact = false }: { label: string; value: string; helper: string; compact?: boolean }) {
  return (
    <div
      className={compact
        ? 'rounded-xl border border-white/10 bg-white/5 p-3 shadow-[0_12px_36px_rgba(2,6,23,0.28)] backdrop-blur-sm flex flex-col items-center justify-center text-center'
        : 'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.35)] backdrop-blur-sm flex flex-col items-center justify-center text-center lg:aspect-square lg:rounded-xl lg:p-3'}
    >
      <p className={compact ? 'text-[0.56rem] uppercase tracking-[0.2em] text-slate-400' : 'text-[0.65rem] uppercase tracking-[0.24em] text-slate-400'}>{label}</p>
      <p className={compact ? 'mt-1.5 text-xl font-semibold text-white' : 'mt-2 text-2xl font-semibold text-white lg:mt-1.5 lg:text-xl'}>{value}</p>
      <p className={compact ? 'mt-0.5 text-xs text-slate-400' : 'mt-1 text-sm text-slate-400 lg:text-xs'}>{helper}</p>
    </div>
  );
}

function SectionEyebrow({ icon: Icon, iconSrc, children }: { icon?: typeof Sparkles; iconSrc?: string; children: string }) {
  return (
    <div className="inline-flex self-start items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-300 backdrop-blur-sm">
      {iconSrc ? (
        <Image
          src={iconSrc}
          alt=""
          aria-hidden="true"
          width={47}
          height={47}
          className="-my-[21px] -ml-1 h-[47px] w-[47px] rounded-md drop-shadow-[0_4px_10px_rgba(15,23,42,0.7)]"
        />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 text-amber-300" />
      ) : null}
      {children}
    </div>
  );
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });

  return {
    title: 'Atlas Guesser | ' + t('eyebrow'),
    description: t('hero_description'),
    alternates: {
      canonical: `/${locale}`,
    },
    openGraph: {
      type: 'website',
      siteName: 'Atlas Guesser',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      title: 'Atlas Guesser | ' + t('eyebrow'),
      description: t('hero_description'),
      url: `/${locale}`,
    },
    twitter: {
      card: 'summary',
      title: 'Atlas Guesser | ' + t('eyebrow'),
      description: t('hero_description'),
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  const tGuesser = await getTranslations({ locale, namespace: 'guesser' });
  const tSubdivisions = await getTranslations({ locale, namespace: 'subdivisionsGuesser' });

  const [quiz, adminCatalogStats, landingMap, countryPreviews, brazilSubdivisionPreview] = await Promise.all([
    getCountryQuizPayload(locale),
    getAdminSubdivisionCatalogStats(),
    getLandingMapPreviewData(),
    getAdminQuizCountryShapePreviews(),
    getBrazilSubdivisionPreviewData(),
  ]);
  const playableCountriesCount = quiz.countries.length;
  const gameModeCount = MODE_ORDER.length;
  const mapModeCount = MAP_MODES.size;
  const choiceModeCount = gameModeCount - mapModeCount;
  const francePreviewCountry = quiz.countries.find((country) => country.code.toUpperCase() === 'FR');
  const previewCountry = francePreviewCountry ?? quiz.countries[0];
  const nonPreviewCountries = quiz.countries.filter((country) => country.code !== previewCountry?.code);
  const secondPreviewCountry = nonPreviewCountries[0] ?? quiz.countries[1] ?? previewCountry;
  const thirdPreviewCountry = nonPreviewCountries[1] ?? quiz.countries[2] ?? previewCountry;
  const fourthPreviewCountry = nonPreviewCountries[2] ?? quiz.countries[3] ?? previewCountry;
  const previewCountryNameKey = (previewCountry?.name ?? '').trim().toLowerCase();
  const highlightedCountryPath = previewCountry
    ? landingMap.countryPathsByCode[previewCountry.code.toUpperCase()]
      ?? landingMap.countryPathsByName[previewCountryNameKey]
      ?? landingMap.countryPathsByName.france
      ?? previewCountry.path
    : undefined;
  const previewFlagOptions = [
    secondPreviewCountry,
    previewCountry,
    thirdPreviewCountry,
    fourthPreviewCountry,
  ];
  const previewCountryLabel = 'Paris - France';
  const previewLabelWidth = 98;
  const previewLabelHeight = 25;
  const previewLabelX = landingMap.parisPoint.x - previewLabelWidth / 2 - 14;
  const previewLabelY = landingMap.parisPoint.y + 98;
  const previewLabelRect = {
    x: previewLabelX,
    y: previewLabelY,
    width: previewLabelWidth,
    height: previewLabelHeight,
  };
  const previewPinPoint = { x: landingMap.parisPoint.x, y: landingMap.parisPoint.y };
  const previewConnectorTo = getEdgePointToward(previewLabelRect, previewPinPoint);
  const previewConnectorPath = getCurvedConnectorPath({ from: previewPinPoint, to: previewConnectorTo });
  const statsPreview = MODE_ORDER;
  const worldModes = MODE_ORDER.map((mode) => ({
    mode,
    label: tGuesser(`modes.${mode}`),
    prompt: tGuesser(`mode_moves.${mode}`),
  }));
  const subdivisionCountries = SUPPORTED_ADMIN_QUIZ_COUNTRIES.map((country) => ({
    country,
    label: tSubdivisions(`countries.${country}`),
    preview: countryPreviews[country],
  }));
  const regionsPreviewTitle = locale === 'fr'
    ? 'Explorez les regions comme un pro'
    : 'Explore regions like a pro';
  const regionsPreviewDescription = locale === 'fr'
    ? 'Parcourez les pays disponibles, zoomez sur leurs subdivisions et lancez une partie instantanee depuis cet apercu interactif.'
    : 'Browse available countries, preview their subdivisions, and jump into a live challenge right from this interactive teaser.';
  const countriesCtaLabel = locale === 'fr' ? 'Voir tous les pays' : 'View all countries';
  const countriesModalTitle = locale === 'fr'
    ? 'Catalogue complet des pays jouables'
    : 'Complete playable countries catalog';
  const countriesModalDescription = locale === 'fr'
    ? 'Retrouvez la liste complete des pays disponibles, avec leur drapeau et leur icone SVG.'
    : 'Browse the complete list of available countries, with their flag and SVG icon.';
  const countriesModalListLabel = locale === 'fr' ? 'Catalogue pays' : 'Country catalog';
  const countriesExternalListLabel = locale === 'fr'
    ? 'Voir la liste exhaustive des pays du monde sur countries.hebert.app'
    : 'See the exhaustive list of world countries on countries.hebert.app';
  const countriesSearchPlaceholder = locale === 'fr' ? 'Rechercher un pays ou un code' : 'Search country or code';
  const countriesAvailableLabel = locale === 'fr' ? '{count} pays affiches' : '{count} countries shown';
  const mapCountries = quiz.countries.map((country) => ({
    code: country.code.toUpperCase(),
    name: country.name,
    path: country.path,
    focusBounds: country.focusBounds,
  }));
  const brazilPreviewCountryLabel = tSubdivisions('countries.brazil');
  const currentYear = new Date().getFullYear();

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 12% 14%, rgba(56, 189, 248, 0.18), transparent 32%)',
            'radial-gradient(circle at 86% 18%, rgba(251, 191, 36, 0.16), transparent 26%)',
            'radial-gradient(circle at 50% 78%, rgba(34, 197, 94, 0.10), transparent 28%)',
          ].join(','),
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="flex items-center justify-between opacity-0 animate-fade-in-down">
          <SectionEyebrow iconSrc="/icon.svg">Atlas Guesser</SectionEyebrow>
          <LanguageSwitcher currentLocale={locale} />
        </div>

        <HeroSection
          title={t('hero_title')}
          description={t('hero_description')}
          cta={
            <div className="flex flex-wrap items-center gap-3">
              <LandingGameStartCtas
                worldCtaLabel={t('cta_guesser')}
                subdivisionsCtaLabel={t('cta_subdivisions')}
                modalCloseLabel={t('start_picker_close')}
                worldModalTitle={t('start_world_modal_title')}
                worldModalDescription={t('start_world_modal_description')}
                worldModalListLabel={t('start_world_modal_list_label')}
                subdivisionsModalTitle={t('start_subdivisions_modal_title')}
                subdivisionsModalDescription={t('start_subdivisions_modal_description')}
                subdivisionsModalListLabel={t('start_subdivisions_modal_list_label')}
                countriesCtaLabel={countriesCtaLabel}
                countriesModalTitle={countriesModalTitle}
                countriesModalDescription={countriesModalDescription}
                countriesModalListLabel={countriesModalListLabel}
                countriesExternalListLabel={countriesExternalListLabel}
                countriesSearchPlaceholder={countriesSearchPlaceholder}
                countriesAvailableLabel={countriesAvailableLabel}
                worldModes={worldModes}
                subdivisionCountries={subdivisionCountries}
                mapCountries={mapCountries}
              />
              <PwaInstallCallToAction />
            </div>
          }
          metrics={
            <>
              <MetricCard label={t('metric_trips_label')} value={String(gameModeCount)} helper={t('metric_trips_helper')} />
              <MetricCard label={t('metric_countries_label')} value={String(playableCountriesCount)} helper={t('metric_countries_helper')} />
              <MetricCard label={t('metric_admin_maps_label')} value={String(adminCatalogStats.adminMapsCount)} helper={t('metric_admin_maps_helper')} />
              <MetricCard label={t('metric_total_regions_label')} value={String(adminCatalogStats.totalRegionsCount)} helper={t('metric_total_regions_helper')} />
            </>
          }
        />

        <section className="grid w-full gap-8">
          <MapSection
            eyebrow={<SectionEyebrow icon={BarChart3}>{t('start_subdivisions_modal_list_label')}</SectionEyebrow>}
            heading={regionsPreviewTitle}
            description={regionsPreviewDescription}
            sidebarPosition="right"
            sidebarContent={
              <>
                <div className="border-b border-slate-800 px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">{t('start_subdivisions_modal_list_label')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{t('cta_subdivisions')}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{subdivisionCountries.length} {t('metric_countries_helper')}</p>
                </div>

                <SubdivisionsCountryPreviewList countries={subdivisionCountries} selectedCountry="brazil" />
              </>
            }
          >
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 420 280" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="brazil-preview-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148,163,184,0.10)" strokeWidth="0.7" />
                </pattern>
                <radialGradient id="brazil-preview-glow" cx="50%" cy="45%" r="70%">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.18)" />
                  <stop offset="60%" stopColor="rgba(15,23,42,0.16)" />
                  <stop offset="100%" stopColor="rgba(2,6,23,0)" />
                </radialGradient>
              </defs>

              <rect x="0" y="0" width="420" height="280" fill="rgba(7,26,49,0.74)" />
              <rect x="0" y="0" width="420" height="280" fill="url(#brazil-preview-grid)" />
              <rect x="0" y="0" width="420" height="280" fill="url(#brazil-preview-glow)" />

              <g>
                {brazilSubdivisionPreview.ghostWorldPaths.map((pathValue, index) => (
                  <path
                    key={`landing-brazil-ghost-world-${index}`}
                    d={pathValue}
                    fill="rgba(15,23,42,0.18)"
                    stroke="rgba(125,211,252,0.18)"
                    strokeWidth="0.6"
                  />
                ))}
              </g>

              <g>
                {brazilSubdivisionPreview.paths.map((pathValue, index) => (
                  <path
                    key={`landing-brazil-state-${index}`}
                    d={pathValue}
                    fill="rgba(30,41,59,0.84)"
                    stroke="rgba(148,163,184,0.66)"
                    strokeWidth="0.8"
                  />
                ))}
              </g>

              {brazilSubdivisionPreview.highlightedPath ? (
                <path
                  d={brazilSubdivisionPreview.highlightedPath}
                  fill="rgba(59,130,246,0.8)"
                  stroke="rgba(219,234,254,0.98)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: 'drop-shadow(0 0 14px rgba(59,130,246,0.62))' }}
                />
              ) : null}
            </svg>

            <div className="absolute bottom-3 right-3 z-10 rounded-xl border border-emerald-300/35 bg-slate-950/78 px-3 py-2 text-right shadow-[0_18px_48px_rgba(2,6,23,0.55)] backdrop-blur-sm">
              <p className="mt-1 text-sm font-semibold text-white">{brazilPreviewCountryLabel}</p>
              <p className="mt-1 text-[11px] text-slate-300">{tSubdivisions('mode.states')}</p>
            </div>
          </MapSection>

          <StatsSection
            eyebrow={<SectionEyebrow icon={Layers3}>{t('stats_eyebrow')}</SectionEyebrow>}
            heading={t('stats_heading')}
            description={t('stats_description')}
            content={
              <>
                <div className="mt-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t('stats_top_transports')}</p>
                  <p className="mt-1 text-xs text-slate-500">{t('stats_available_modes_summary', { count: gameModeCount, countries: playableCountriesCount })}</p>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {statsPreview.map((mode, index) => {
                    const modeLabel = tGuesser(`modes.${mode}`);
                    const modeQuestion = tGuesser(`mode_moves.${mode}`);

                    return (
                      <div key={mode} className="flex min-h-[56px] flex-col justify-center rounded-xl border border-slate-800/90 bg-slate-900/55 px-2.5 py-1.5 opacity-0 animate-fade-in-up sm:block sm:min-h-0 sm:space-y-2 sm:p-2.5" style={{ animationDelay: `${140 + index * 70}ms` }}>
                        <div className="text-center text-[13px] leading-5 text-slate-200 sm:text-left sm:text-sm sm:leading-6">
                          <span className="sm:hidden">{modeQuestion}</span>
                          <span className="hidden truncate sm:inline">{modeLabel}</span>
                        </div>
                        <p className="hidden text-[11px] leading-4 text-slate-400 sm:block">{modeQuestion}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            }
          />

          <MapSection
            eyebrow={<SectionEyebrow icon={MapPinned}>{t('map_eyebrow')}</SectionEyebrow>}
            heading={t('map_heading')}
            description={t('map_description')}
            sidebarContent={
              <>
                <div className="border-b border-slate-800 px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Atlas Guesser</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{t('detail_preview_card')}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{t('preview_live_mode', { mode: tGuesser('modes.country-to-flag') })}</p>
                </div>

                <div className="p-2.5">
                  <div className="rounded-lg border border-amber-400/70 bg-amber-500/12 p-2.5">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">{tGuesser('prompt_country_flag_eyebrow')}</p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-100">{tGuesser('mode_moves.country-to-flag')}</p>
                    </div>

                    <div className="mt-2 rounded-md border border-slate-700/70 bg-slate-950/60 p-2">
                      <ul className="mt-1.5 space-y-1.5">
                        {previewFlagOptions.map((countryOption, index) => {
                          const isCorrect = countryOption?.code === previewCountry?.code;
                          return (
                            <li key={`preview-flag-option-${countryOption?.code ?? index}`} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-1 ${isCorrect ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700/70 bg-slate-900/55'}`}>
                              <span className="text-[10px] text-slate-200">{String.fromCharCode(65 + index)}</span>
                              <div className="flex items-center gap-2">
                                <CountryFlag country={countryOption?.name ?? 'France'} size="sm" />
                                <span className="hidden text-[10px] text-slate-100 sm:inline">{countryOption?.name ?? 'N/A'}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            }
          >
            <LandingMapPreviewNoSSR
              paths={landingMap.paths}
              highlightedCountryPath={highlightedCountryPath}
              previewConnectorPath={previewConnectorPath}
              previewPinPoint={previewPinPoint}
              previewLabelX={previewLabelX}
              previewLabelY={previewLabelY}
              previewLabelWidth={previewLabelWidth}
              previewLabelHeight={previewLabelHeight}
              previewCountryLabel={previewCountryLabel}
            />
          </MapSection>
        </section>

        <div className="opacity-0 animate-fade-in-up">
          <footer className="py-6 text-center">
            <p className="flex items-center justify-center gap-2 text-sm text-slate-300">
              {t('footer_made_with')}
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              {t('footer_by')}
            </p>
            <p className="mt-2 text-xs text-slate-500">{t('footer_copyright', { year: currentYear })}</p>
          </footer>
        </div>
      </div>
    </main>
  );
}