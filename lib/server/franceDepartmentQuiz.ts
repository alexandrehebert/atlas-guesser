import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoCentroid, geoMercator, geoPath } from 'd3-geo';

const QUIZ_MAP_VIEWBOX = { width: 860, height: 920 };
const MIN_CLICKABLE_DEPARTMENT_SIZE = 2;
const MIN_CLICKABLE_REGION_SIZE = 6;

export interface QuizArea {
  code: string;
  name: string;
  path: string;
  centroid: { x: number; y: number };
  focusBounds: { x: number; y: number; width: number; height: number };
}

export interface FranceAdminQuizPayload {
  departments: QuizArea[];
  regions: QuizArea[];
  ghostEuropePaths: string[];
  viewBox: typeof QUIZ_MAP_VIEWBOX;
}

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureProperties = Record<string, unknown>;

let cachedPayloadPromise: Promise<FranceAdminQuizPayload> | null = null;

async function loadGeoJson(fileName: string): Promise<GeoJSON.FeatureCollection> {
  const filePath = join(process.cwd(), `public/maps/${fileName}`);
  const rawGeoData = await readFile(filePath, 'utf8');
  return JSON.parse(rawGeoData) as GeoJSON.FeatureCollection;
}

function compareAreaCodes(left: string, right: string): number {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);
  const leftIsNumber = Number.isFinite(leftNumber);
  const rightIsNumber = Number.isFinite(rightNumber);

  if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, 'fr');
}

function buildQuizAreas(
  geoData: GeoJSON.FeatureCollection,
  projection: ReturnType<typeof geoMercator>,
  minimumClickableSize: number,
): QuizArea[] {
  const generator = geoPath(projection);
  const areas: QuizArea[] = [];
  const seenCodes = new Set<string>();

  for (const feature of geoData.features || []) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;

    const properties = (feature.properties || {}) as FeatureProperties;
    const code = typeof properties.code === 'string' ? properties.code.trim() : '';
    const name = typeof properties.nom === 'string' ? properties.nom.trim() : '';

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

    if (projectedWidth < minimumClickableSize && projectedHeight < minimumClickableSize) {
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

  areas.sort((left, right) => compareAreaCodes(left.code, right.code));

  return areas;
}

function buildGhostEuropePaths(
  worldGeoData: GeoJSON.FeatureCollection,
  projection: ReturnType<typeof geoMercator>,
): string[] {
  const generator = geoPath(projection);
  const ghostPaths: string[] = [];

  const isFranceFeature = (properties: FeatureProperties): boolean => {
    const isoA2 = typeof properties.ISO_A2 === 'string' ? properties.ISO_A2.toUpperCase() : '';
    const isoA2Eh = typeof properties.ISO_A2_EH === 'string' ? properties.ISO_A2_EH.toUpperCase() : '';
    const name = typeof properties.NAME === 'string' ? properties.NAME.trim().toLowerCase() : '';
    const nameEn = typeof properties.NAME_EN === 'string' ? properties.NAME_EN.trim().toLowerCase() : '';
    const nameFr = typeof properties.NAME_FR === 'string' ? properties.NAME_FR.trim().toLowerCase() : '';
    const admin = typeof properties.ADMIN === 'string' ? properties.ADMIN.trim().toLowerCase() : '';

    if (isoA2 === 'FR' || isoA2Eh === 'FR') {
      return true;
    }

    return [name, nameEn, nameFr, admin].some((value) => value === 'france');
  };

  for (const feature of worldGeoData.features || []) {
    if (!feature || feature.type !== 'Feature' || !feature.geometry) continue;

    const properties = (feature.properties || {}) as FeatureProperties;
    if (isFranceFeature(properties)) {
      continue;
    }

    const centroid = geoCentroid(feature as GeoFeature);
    const lng = centroid?.[0];
    const lat = centroid?.[1];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }

    // Keep western/central Europe + nearby Mediterranean countries around France.
    if (lng < -13 || lng > 24 || lat < 35 || lat > 62) {
      continue;
    }

    const path = generator(feature as GeoFeature);
    if (!path) {
      continue;
    }

    ghostPaths.push(path);
  }

  return ghostPaths;
}

async function buildFranceAdminQuizPayload(): Promise<FranceAdminQuizPayload> {
  const departmentsGeoData = await loadGeoJson('france-departements.geojson');
  const regionsGeoData = await loadGeoJson('france-regions.geojson');
  const worldGeoData = await loadGeoJson('world-countries-110m.geojson');
  const projection = geoMercator();

  projection.fitExtent(
    [[24, 24], [QUIZ_MAP_VIEWBOX.width - 24, QUIZ_MAP_VIEWBOX.height - 24]],
    departmentsGeoData as never,
  );

  const departments = buildQuizAreas(departmentsGeoData, projection, MIN_CLICKABLE_DEPARTMENT_SIZE);
  const regions = buildQuizAreas(regionsGeoData, projection, MIN_CLICKABLE_REGION_SIZE);
  const ghostEuropePaths = buildGhostEuropePaths(worldGeoData, projection);

  return {
    departments,
    regions,
    ghostEuropePaths,
    viewBox: QUIZ_MAP_VIEWBOX,
  };
}

export async function getFranceAdminQuizPayload(): Promise<FranceAdminQuizPayload> {
  if (!cachedPayloadPromise) {
    cachedPayloadPromise = buildFranceAdminQuizPayload();
  }

  return cachedPayloadPromise;
}
