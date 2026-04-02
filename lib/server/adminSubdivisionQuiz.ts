import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES, type AdminQuizCountrySlug } from '~/lib/adminQuizCountries';

const QUIZ_MAP_VIEWBOX = { width: 860, height: 920 };

export interface QuizArea {
  code: string;
  name: string;
  path: string;
  centroid: { x: number; y: number };
  focusBounds: { x: number; y: number; width: number; height: number };
}

export interface AdminQuizLevel {
  id: string;
  areas: QuizArea[];
}

export interface AdminSubdivisionQuizPayload {
  country: AdminQuizCountrySlug;
  countryCode: string;
  defaultLevelId: string;
  levels: AdminQuizLevel[];
  availableCountries: AdminQuizCountrySlug[];
  ghostEuropePaths: string[];
  ghostFocusedCountryPaths: string[];
  viewBox: typeof QUIZ_MAP_VIEWBOX;
}

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureProperties = Record<string, unknown>;

interface QuizLevelConfig {
  id: string;
  fileName: string;
  minimumClickableSize: number;
  codeProperty: string;
  nameProperty: string;
}

interface CountryConfig {
  countryCode: string;
  countryNames: string[];
  sortLocale: string;
  defaultLevelId: string;
  ghostBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  levels: QuizLevelConfig[];
}

const COUNTRY_CONFIGS: Record<AdminQuizCountrySlug, CountryConfig> = {
  france: {
    countryCode: 'FR',
    countryNames: ['france'],
    sortLocale: 'fr',
    defaultLevelId: 'departements',
    ghostBounds: { minLng: -13, maxLng: 24, minLat: 35, maxLat: 62 },
    levels: [
      {
        id: 'departements',
        fileName: 'france-departements.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'nom',
      },
      {
        id: 'regions',
        fileName: 'france-regions.geojson',
        minimumClickableSize: 6,
        codeProperty: 'code',
        nameProperty: 'nom',
      },
    ],
  },
  germany: {
    countryCode: 'DE',
    countryNames: ['germany', 'deutschland'],
    sortLocale: 'de',
    defaultLevelId: 'states',
    ghostBounds: { minLng: -6, maxLng: 25, minLat: 46, maxLat: 61 },
    levels: [
      {
        id: 'states',
        fileName: 'germany-states.geojson',
        minimumClickableSize: 2,
        codeProperty: 'id',
        nameProperty: 'name',
      },
    ],
  },
  spain: {
    countryCode: 'ES',
    countryNames: ['spain', 'españa', 'espana'],
    sortLocale: 'es',
    defaultLevelId: 'communities',
    ghostBounds: { minLng: -20, maxLng: 10, minLat: 27, maxLat: 45 },
    levels: [
      {
        id: 'communities',
        fileName: 'spain-communities.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  italy: {
    countryCode: 'IT',
    countryNames: ['italy', 'italia'],
    sortLocale: 'it',
    defaultLevelId: 'regions',
    ghostBounds: { minLng: 2, maxLng: 22, minLat: 35, maxLat: 50 },
    levels: [
      {
        id: 'regions',
        fileName: 'italy-regions.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  canada: {
    countryCode: 'CA',
    countryNames: ['canada'],
    sortLocale: 'en',
    defaultLevelId: 'provinces',
    ghostBounds: { minLng: -145, maxLng: -48, minLat: 40, maxLat: 85 },
    levels: [
      {
        id: 'provinces',
        fileName: 'canada-provinces.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  usa: {
    countryCode: 'US',
    countryNames: ['united states', 'usa', 'united states of america'],
    sortLocale: 'en',
    defaultLevelId: 'states',
    ghostBounds: { minLng: -130, maxLng: -60, minLat: 17, maxLat: 55 },
    levels: [
      {
        id: 'states',
        fileName: 'usa-states.geojson',
        minimumClickableSize: 1,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
};

const ALWAYS_VISIBLE_GHOST_COUNTRY_CODES = new Set(
  SUPPORTED_ADMIN_QUIZ_COUNTRIES.map((country) => COUNTRY_CONFIGS[country].countryCode),
);

const cachedPayloadPromises: Partial<Record<AdminQuizCountrySlug, Promise<AdminSubdivisionQuizPayload>>> = {};

async function loadGeoJson(fileName: string): Promise<GeoJSON.FeatureCollection> {
  const filePath = join(process.cwd(), `public/maps/${fileName}`);
  const rawGeoData = await readFile(filePath, 'utf8');
  return JSON.parse(rawGeoData) as GeoJSON.FeatureCollection;
}

function compareAreaCodes(left: string, right: string, locale: string): number {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);
  const leftIsNumber = Number.isFinite(leftNumber);
  const rightIsNumber = Number.isFinite(rightNumber);

  if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, locale);
}

function buildQuizAreas(
  geoData: GeoJSON.FeatureCollection,
  projection: ReturnType<typeof geoMercator>,
  levelConfig: QuizLevelConfig,
  sortLocale: string,
): QuizArea[] {
  const generator = geoPath(projection);
  const areas: QuizArea[] = [];
  const seenCodes = new Set<string>();

  for (const feature of geoData.features || []) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;

    const properties = (feature.properties || {}) as FeatureProperties;
    const rawCode = properties[levelConfig.codeProperty];
    const rawName = properties[levelConfig.nameProperty];
    const code = typeof rawCode === 'string' ? rawCode.trim() : '';
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    if (!code || !name || seenCodes.has(code)) {
      continue;
    }

    const path = generator(feature as GeoFeature);
    if (!path) {
      continue;
    }

    const bounds = generator.bounds(feature as GeoFeature);
    const projectedWidth = Math.max(0, bounds[1][0] - bounds[0][0]);
    const projectedHeight = Math.max(0, bounds[1][1] - bounds[0][1]);

    if (projectedWidth < levelConfig.minimumClickableSize && projectedHeight < levelConfig.minimumClickableSize) {
      continue;
    }

    const centroid = generator.centroid(feature as GeoFeature);
    if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) {
      continue;
    }

    seenCodes.add(code);
    areas.push({
      code,
      name,
      path,
      centroid: { x: centroid[0], y: centroid[1] },
      focusBounds: {
        x: bounds[0][0],
        y: bounds[0][1],
        width: projectedWidth,
        height: projectedHeight,
      },
    });
  }

  areas.sort((left, right) => compareAreaCodes(left.code, right.code, sortLocale));

  return areas;
}

function buildGhostEuropePaths(
  worldGeoData: GeoJSON.FeatureCollection,
  projection: ReturnType<typeof geoMercator>,
  config: CountryConfig,
): { neighborPaths: string[]; focusedPaths: string[] } {
  const generator = geoPath(projection);
  const neighborPaths: string[] = [];
  const focusedPaths: string[] = [];

  const getIsoA2 = (properties: FeatureProperties): string => {
    const isoA2 = typeof properties.ISO_A2 === 'string' ? properties.ISO_A2.toUpperCase() : '';
    const isoA2Eh = typeof properties.ISO_A2_EH === 'string' ? properties.ISO_A2_EH.toUpperCase() : '';
    return (isoA2 && isoA2 !== '-99') ? isoA2 : isoA2Eh;
  };

  for (const feature of worldGeoData.features || []) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;

    const properties = (feature.properties || {}) as FeatureProperties;
    const countryIsoA2 = getIsoA2(properties);
    const isAlwaysVisibleCountry = ALWAYS_VISIBLE_GHOST_COUNTRY_CODES.has(countryIsoA2);
    const isFocusedCountry = countryIsoA2 === config.countryCode;

    const centroid = geoCentroid(feature as GeoFeature);
    const lng = centroid?.[0];
    const lat = centroid?.[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }

    if (!isAlwaysVisibleCountry && (
      lng < config.ghostBounds.minLng
      || lng > config.ghostBounds.maxLng
      || lat < config.ghostBounds.minLat
      || lat > config.ghostBounds.maxLat
    )) {
      continue;
    }

    const path = generator(feature as GeoFeature);
    if (!path) {
      continue;
    }

    if (isFocusedCountry) {
      focusedPaths.push(path);
    } else {
      neighborPaths.push(path);
    }
  }

  return { neighborPaths, focusedPaths };
}

async function buildAdminSubdivisionQuizPayload(country: AdminQuizCountrySlug): Promise<AdminSubdivisionQuizPayload> {
  const config = COUNTRY_CONFIGS[country];
  const [worldGeoData, ...levelGeoData] = await Promise.all([
    loadGeoJson('world-countries-110m.geojson'),
    ...config.levels.map((level) => loadGeoJson(level.fileName)),
  ]);

  const projection = geoMercator();
  const primaryGeoData = levelGeoData[0];

  projection.fitExtent(
    [[24, 24], [QUIZ_MAP_VIEWBOX.width - 24, QUIZ_MAP_VIEWBOX.height - 24]],
    primaryGeoData as never,
  );

  const levels = config.levels.map((levelConfig, index) => ({
    id: levelConfig.id,
    areas: buildQuizAreas(levelGeoData[index], projection, levelConfig, config.sortLocale),
  }));

  const { neighborPaths, focusedPaths } = buildGhostEuropePaths(worldGeoData, projection, config);

  return {
    country,
    countryCode: config.countryCode,
    defaultLevelId: config.defaultLevelId,
    levels,
    availableCountries: [...SUPPORTED_ADMIN_QUIZ_COUNTRIES],
    ghostEuropePaths: neighborPaths,
    ghostFocusedCountryPaths: focusedPaths,
    viewBox: QUIZ_MAP_VIEWBOX,
  };
}

export async function getAdminSubdivisionQuizPayload(country: AdminQuizCountrySlug): Promise<AdminSubdivisionQuizPayload> {
  if (!cachedPayloadPromises[country]) {
    cachedPayloadPromises[country] = buildAdminSubdivisionQuizPayload(country);
  }

  return cachedPayloadPromises[country] as Promise<AdminSubdivisionQuizPayload>;
}

export async function getFranceAdminQuizPayload(): Promise<AdminSubdivisionQuizPayload> {
  return getAdminSubdivisionQuizPayload('france');
}