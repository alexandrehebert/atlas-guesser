import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoMercator, geoPath } from 'd3-geo';
import { SUPPORTED_ADMIN_QUIZ_COUNTRIES, type AdminQuizCountrySlug } from '~/lib/adminQuizCountries';

const QUIZ_MAP_VIEWBOX = { width: 860, height: 920 };

export interface QuizArea {
  code: string;
  name: string;
  path: string;
  centroid: { x: number; y: number };
  focusBounds: { x: number; y: number; width: number; height: number };
  sectionBounds: { x: number; y: number; width: number; height: number };
}

export interface QuizSectionLabel {
  id: string;
  labelKey: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface AdminQuizLevel {
  id: string;
  areas: QuizArea[];
  sectionLabels: QuizSectionLabel[];
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

export interface AdminSubdivisionCatalogStats {
  adminMapsCount: number;
  totalRegionsCount: number;
}

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureProperties = Record<string, unknown>;

interface GeoBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

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
  levels: QuizLevelConfig[];
}

interface FranceOverseasConfig {
  sourceCode: string;
  departmentCode: string;
  name: string;
}

interface FranceInsetBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COUNTRY_CONFIGS: Record<AdminQuizCountrySlug, CountryConfig> = {
  france: {
    countryCode: 'FR',
    countryNames: ['france'],
    sortLocale: 'fr',
    defaultLevelId: 'regions',
    levels: [
      {
        id: 'regions',
        fileName: 'france-regions.geojson',
        minimumClickableSize: 6,
        codeProperty: 'code',
        nameProperty: 'nom',
      },
      {
        id: 'departements',
        fileName: 'france-departements.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'nom',
      },
    ],
  },
  germany: {
    countryCode: 'DE',
    countryNames: ['germany', 'deutschland'],
    sortLocale: 'de',
    defaultLevelId: 'laender',
    levels: [
      {
        id: 'laender',
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
  brazil: {
    countryCode: 'BR',
    countryNames: ['brazil', 'brasil'],
    sortLocale: 'pt',
    defaultLevelId: 'states',
    levels: [
      {
        id: 'states',
        fileName: 'brazil-states.geojson',
        minimumClickableSize: 1,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  china: {
    countryCode: 'CN',
    countryNames: ['china', 'zhongguo', '中国'],
    sortLocale: 'zh',
    defaultLevelId: 'provinces',
    levels: [
      {
        id: 'provinces',
        fileName: 'china-provinces.geojson',
        minimumClickableSize: 1,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  india: {
    countryCode: 'IN',
    countryNames: ['india', 'bharat'],
    sortLocale: 'en',
    defaultLevelId: 'states',
    levels: [
      {
        id: 'states',
        fileName: 'india-states.geojson',
        minimumClickableSize: 1,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  russia: {
    countryCode: 'RU',
    countryNames: ['russia', 'russian federation', 'rossiya'],
    sortLocale: 'en',
    defaultLevelId: 'federal_districts',
    levels: [
      {
        id: 'federal_districts',
        fileName: 'russia-federal-districts.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'name',
      },
      {
        id: 'subjects',
        fileName: 'russia-subjects.geojson',
        minimumClickableSize: 1,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
  australia: {
    countryCode: 'AU',
    countryNames: ['australia'],
    sortLocale: 'en',
    defaultLevelId: 'states',
    levels: [
      {
        id: 'states',
        fileName: 'australia-states.geojson',
        minimumClickableSize: 2,
        codeProperty: 'code',
        nameProperty: 'name',
      },
    ],
  },
};

const cachedPayloadPromises: Partial<Record<AdminQuizCountrySlug, Promise<AdminSubdivisionQuizPayload>>> = {};
let cachedCatalogStatsPromise: Promise<AdminSubdivisionCatalogStats> | null = null;

const FRANCE_OVERSEAS_FILE_NAME = 'france-overseas.geojson';

const FRANCE_OVERSEAS_CONFIGS: FranceOverseasConfig[] = [
  { sourceCode: '01', departmentCode: '971', name: 'Guadeloupe' },
  { sourceCode: '02', departmentCode: '972', name: 'Martinique' },
  { sourceCode: '03', departmentCode: '973', name: 'Guyane' },
  { sourceCode: '04', departmentCode: '974', name: 'La Réunion' },
  { sourceCode: '06', departmentCode: '976', name: 'Mayotte' },
];

const FRANCE_OVERSEAS_BY_SOURCE_CODE = new Map(
  FRANCE_OVERSEAS_CONFIGS.map((config) => [config.sourceCode, config]),
);

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

function visitGeometryCoordinates(
  coordinates: GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][] | GeoJSON.Position[][][][],
  visitor: (position: GeoJSON.Position) => void,
): void {
  for (const item of coordinates) {
    if (!Array.isArray(item)) continue;
    if (typeof item[0] === 'number') {
      visitor(item as GeoJSON.Position);
      continue;
    }

    visitGeometryCoordinates(
      item as GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][],
      visitor,
    );
  }
}

function getGeometryBounds(geometry: GeoJSON.Geometry): GeoBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includePosition = (position: GeoJSON.Position) => {
    const [x, y] = position;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    visitGeometryCoordinates(geometry.coordinates, includePosition);
  } else {
    return null;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function getFeatureCollectionBounds(geoData: GeoJSON.FeatureCollection): GeoBounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const feature of geoData.features || []) {
    if (!feature?.geometry) continue;
    const bounds = getGeometryBounds(feature.geometry);
    if (!bounds) continue;

    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function transformCoordinates(
  coordinates: GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][] | GeoJSON.Position[][][][],
  transform: (position: GeoJSON.Position) => GeoJSON.Position,
): GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][] | GeoJSON.Position[][][][] {
  return coordinates.map((item) => {
    if (!Array.isArray(item)) {
      return item;
    }

    if (typeof item[0] === 'number') {
      return transform(item as GeoJSON.Position);
    }

    return transformCoordinates(
      item as GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][],
      transform,
    );
  }) as GeoJSON.Position[] | GeoJSON.Position[][] | GeoJSON.Position[][][] | GeoJSON.Position[][][][];
}

function remapGeometryToInset(geometry: GeoJSON.Geometry, target: FranceInsetBox): GeoJSON.Geometry {
  const bounds = getGeometryBounds(geometry);
  if (!bounds || bounds.width === 0 || bounds.height === 0) {
    return geometry;
  }

  const scale = Math.min(target.width / bounds.width, target.height / bounds.height);
  const offsetX = target.x + (target.width - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = target.y + (target.height - bounds.height * scale) / 2 - bounds.minY * scale;

  const transformPosition = (position: GeoJSON.Position): GeoJSON.Position => {
    const [x, y, ...rest] = position;
    return [x * scale + offsetX, y * scale + offsetY, ...rest];
  };

  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: transformCoordinates(geometry.coordinates, transformPosition) as GeoJSON.Position[][],
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: transformCoordinates(geometry.coordinates, transformPosition) as GeoJSON.Position[][][],
    };
  }

  return geometry;
}

function createFranceOverseasInsetLayout(bounds: GeoBounds): Map<string, FranceInsetBox> {
  const rowHeight = Math.max(bounds.height * 0.18, 1.75);
  const rowY = bounds.minY - rowHeight - 0.55;

  return new Map<string, FranceInsetBox>([
    ['03', { x: bounds.minX + 0.15, y: rowY - 0.1, width: 4.8, height: rowHeight * 1.18 }],
    ['01', { x: bounds.minX + 5.35, y: rowY + 0.22, width: 1.65, height: rowHeight * 0.66 }],
    ['02', { x: bounds.minX + 7.25, y: rowY + 0.22, width: 1.5, height: rowHeight * 0.66 }],
    ['04', { x: bounds.minX + 9.1, y: rowY + 0.22, width: 1.7, height: rowHeight * 0.66 }],
    ['06', { x: bounds.minX + 11.05, y: rowY + 0.22, width: 1.55, height: rowHeight * 0.66 }],
  ]);
}

function buildFranceOverseasFeatures(
  overseasGeoData: GeoJSON.FeatureCollection,
  levelId: string,
  insetLayout: Map<string, FranceInsetBox>,
): GeoFeature[] {
  const features: GeoFeature[] = [];

  for (const feature of overseasGeoData.features || []) {
    if (!feature?.geometry) continue;

    const properties = (feature.properties || {}) as FeatureProperties;
    const sourceCode = typeof properties.code === 'string' ? properties.code : '';
    const config = FRANCE_OVERSEAS_BY_SOURCE_CODE.get(sourceCode);
    const inset = insetLayout.get(sourceCode);

    if (!config || !inset) {
      continue;
    }

    features.push({
      type: 'Feature',
      properties: {
        code: levelId === 'departements' ? config.departmentCode : config.sourceCode,
        nom: config.name,
      },
      geometry: remapGeometryToInset(feature.geometry, inset),
    });
  }

  return features;
}

function mergeGeoFeatures(
  geoData: GeoJSON.FeatureCollection,
  features: GeoFeature[],
): GeoJSON.FeatureCollection {
  return {
    ...geoData,
    features: [...(geoData.features || []), ...features],
  };
}

function getUnionBounds(rects: AreaRect[]): AreaRect | null {
  if (!rects.length) {
    return null;
  }

  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function padRect(rect: AreaRect, paddingX: number, paddingY: number): AreaRect {
  return {
    x: rect.x - paddingX,
    y: rect.y - paddingY,
    width: rect.width + paddingX * 2,
    height: rect.height + paddingY * 2,
  };
}

function buildSectionLabelFromCodes(
  areas: QuizArea[],
  params: {
    id: string;
    labelKey: string;
    codes: string[];
    paddingX?: number;
    paddingY?: number;
  },
): QuizSectionLabel | null {
  const rects = areas
    .filter((area) => params.codes.includes(area.code))
    .map((area) => area.sectionBounds);
  const unionBounds = getUnionBounds(rects);

  if (!unionBounds) {
    return null;
  }

  return {
    id: params.id,
    labelKey: params.labelKey,
    bounds: padRect(unionBounds, params.paddingX ?? 12, params.paddingY ?? 16),
  };
}

function buildSectionLabels(country: AdminQuizCountrySlug, levelId: string, areas: QuizArea[]): QuizSectionLabel[] {
  if (country === 'france') {
    const overseasCodes = levelId === 'departements'
      ? ['971', '972', '973', '974', '976']
      : ['01', '02', '03', '04', '06'];
    const overseasLabel = buildSectionLabelFromCodes(areas, {
      id: 'france-overseas',
      labelKey: 'france_overseas',
      codes: overseasCodes,
      paddingX: 18,
      paddingY: 22,
    });

    return overseasLabel ? [overseasLabel] : [];
  }

  if (country === 'usa' && levelId === 'states') {
    return [
      buildSectionLabelFromCodes(areas, {
        id: 'usa-alaska',
        labelKey: 'generic_inset',
        codes: ['AK'],
        paddingX: 14,
        paddingY: 18,
      }),
      buildSectionLabelFromCodes(areas, {
        id: 'usa-hawaii',
        labelKey: 'generic_inset',
        codes: ['HI'],
        paddingX: 14,
        paddingY: 18,
      }),
    ].filter((label): label is QuizSectionLabel => Boolean(label));
  }

  return [];
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

  const getFeatureFocusGeometry = (feature: GeoFeature): GeoFeature => {
    if (feature.geometry.type !== 'MultiPolygon') {
      return feature;
    }

    const polygons = feature.geometry.coordinates;
    if (!polygons.length) {
      return feature;
    }

    let totalArea = 0;
    let largestArea = -1;
    let largestPolygon: GeoJSON.Position[][] | null = null;
    let largestBounds: [[number, number], [number, number]] | null = null;

    for (const polygon of polygons) {
      const polygonFeature: GeoFeature = {
        type: 'Feature',
        properties: feature.properties,
        geometry: { type: 'Polygon', coordinates: polygon },
      };
      const area = Math.max(0, generator.area(polygonFeature));
      totalArea += area;

      if (area > largestArea) {
        largestArea = area;
        largestPolygon = polygon;
        largestBounds = generator.bounds(polygonFeature);
      }
    }

    if (!largestPolygon || !largestBounds || totalArea <= 0) {
      return feature;
    }

    const fullBounds = generator.bounds(feature);
    const fullWidth = Math.max(0, fullBounds[1][0] - fullBounds[0][0]);
    const fullHeight = Math.max(0, fullBounds[1][1] - fullBounds[0][1]);
    const largestWidth = Math.max(0, largestBounds[1][0] - largestBounds[0][0]);
    const largestHeight = Math.max(0, largestBounds[1][1] - largestBounds[0][1]);
    const fullMaxDimension = Math.max(fullWidth, fullHeight);
    const largestMaxDimension = Math.max(largestWidth, largestHeight);
    const isMuchMoreSpreadThanLargest = largestMaxDimension > 0 && fullMaxDimension / largestMaxDimension > 2.5;
    const leftOffset = Math.max(0, largestBounds[0][0] - fullBounds[0][0]);
    const rightOffset = Math.max(0, fullBounds[1][0] - largestBounds[1][0]);
    const maxHorizontalOffset = Math.max(leftOffset, rightOffset);
    const hasDateLineOutlier = fullMaxDimension > 0 && maxHorizontalOffset / fullMaxDimension > 0.18;
    const largestAreaShare = largestArea / totalArea;

    if ((!isMuchMoreSpreadThanLargest && !hasDateLineOutlier) || largestAreaShare < 0.55) {
      return feature;
    }

    return {
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: largestPolygon },
    };
  };

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

    const rawFeature = feature as GeoFeature;
    const focusFeature = getFeatureFocusGeometry(rawFeature);
    const path = generator(rawFeature);
    if (!path) {
      continue;
    }

    const bounds = generator.bounds(focusFeature);
    const projectedWidth = Math.max(0, bounds[1][0] - bounds[0][0]);
    const projectedHeight = Math.max(0, bounds[1][1] - bounds[0][1]);
    const fullBounds = generator.bounds(rawFeature);
    const fullProjectedWidth = Math.max(0, fullBounds[1][0] - fullBounds[0][0]);
    const fullProjectedHeight = Math.max(0, fullBounds[1][1] - fullBounds[0][1]);

    if (projectedWidth < levelConfig.minimumClickableSize && projectedHeight < levelConfig.minimumClickableSize) {
      continue;
    }

    const centroid = generator.centroid(focusFeature);
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
      sectionBounds: {
        x: fullBounds[0][0],
        y: fullBounds[0][1],
        width: fullProjectedWidth,
        height: fullProjectedHeight,
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
    const isFocusedCountry = countryIsoA2 === config.countryCode;

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
  const includeFranceOverseas = country === 'france';
  const [worldGeoData, ...loadedGeoData] = await Promise.all([
    loadGeoJson('world-countries-110m.geojson'),
    ...config.levels.map((level) => loadGeoJson(level.fileName)),
    ...(includeFranceOverseas ? [loadGeoJson(FRANCE_OVERSEAS_FILE_NAME)] : []),
  ]);

  const franceOverseasGeoData = includeFranceOverseas
    ? loadedGeoData[loadedGeoData.length - 1]
    : null;
  const levelGeoData = includeFranceOverseas
    ? loadedGeoData.slice(0, config.levels.length)
    : loadedGeoData;

  const metropolitanBounds = includeFranceOverseas ? getFeatureCollectionBounds(levelGeoData[0]) : null;
  const franceInsetLayout = metropolitanBounds ? createFranceOverseasInsetLayout(metropolitanBounds) : null;

  const preparedLevelGeoData = config.levels.map((levelConfig, index) => {
    if (!includeFranceOverseas || !franceOverseasGeoData || !franceInsetLayout) {
      return levelGeoData[index];
    }

    return mergeGeoFeatures(
      levelGeoData[index],
      buildFranceOverseasFeatures(franceOverseasGeoData, levelConfig.id, franceInsetLayout),
    );
  });

  const projection = geoMercator();
  const primaryGeoData = preparedLevelGeoData[0];

  projection.fitExtent(
    [[24, 24], [QUIZ_MAP_VIEWBOX.width - 24, QUIZ_MAP_VIEWBOX.height - 24]],
    primaryGeoData as never,
  );

  const levels = config.levels.map((levelConfig, index) => {
    const areas = buildQuizAreas(preparedLevelGeoData[index], projection, levelConfig, config.sortLocale);

    return {
      id: levelConfig.id,
      areas,
      sectionLabels: buildSectionLabels(country, levelConfig.id, areas),
    };
  });

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

export async function getAdminSubdivisionCatalogStats(): Promise<AdminSubdivisionCatalogStats> {
  if (!cachedCatalogStatsPromise) {
    cachedCatalogStatsPromise = Promise.all(
      SUPPORTED_ADMIN_QUIZ_COUNTRIES.map((country) => getAdminSubdivisionQuizPayload(country)),
    ).then((payloads) => {
      const totalRegionsCount = payloads.reduce((acc, payload) => {
        const defaultLevel = payload.levels.find((level) => level.id === payload.defaultLevelId) ?? payload.levels[0];
        return acc + (defaultLevel?.areas.length ?? 0);
      }, 0);

      return {
        adminMapsCount: payloads.length,
        totalRegionsCount,
      };
    });
  }

  return cachedCatalogStatsPromise;
}
