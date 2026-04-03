import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geoArea, geoMercator, geoPath } from 'd3-geo';
import {
  ADMIN_QUIZ_COUNTRY_CODES,
  SUPPORTED_ADMIN_QUIZ_COUNTRIES,
  type AdminQuizCountrySlug,
} from '~/lib/adminQuizCountries';

const COUNTRY_PREVIEW_VIEWBOX = { width: 24, height: 24 };
const COUNTRY_PREVIEW_PADDING = 1.75;

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry>;
type FeatureProperties = Record<string, unknown>;

export interface CountryShapePreview {
  path: string;
  viewBox: typeof COUNTRY_PREVIEW_VIEWBOX;
}

let cachedCountryPreviewsPromise: Promise<Record<AdminQuizCountrySlug, CountryShapePreview>> | null = null;

async function loadWorldGeoJson(): Promise<GeoJSON.FeatureCollection> {
  const filePath = join(process.cwd(), 'public/maps/world-countries-110m.geojson');
  const rawGeoData = await readFile(filePath, 'utf8');
  return JSON.parse(rawGeoData) as GeoJSON.FeatureCollection;
}

function getIsoA2(properties: FeatureProperties): string {
  const isoA2 = typeof properties.ISO_A2 === 'string' ? properties.ISO_A2.toUpperCase() : '';
  const isoA2Eh = typeof properties.ISO_A2_EH === 'string' ? properties.ISO_A2_EH.toUpperCase() : '';
  return (isoA2 && isoA2 !== '-99') ? isoA2 : isoA2Eh;
}

function getFeatureFocusGeometry(feature: GeoFeature, generator: ReturnType<typeof geoPath>): GeoFeature {
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
    const polygonArea = Math.max(0, generator.area(polygonFeature));
    totalArea += polygonArea;

    if (polygonArea > largestArea) {
      largestArea = polygonArea;
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
}

function normalizeFeatureOrientation(feature: GeoFeature): GeoFeature {
  const flipPolygon = (coordinates: GeoJSON.Position[][]): GeoJSON.Position[][] => (
    coordinates.map((ring) => [...ring].reverse())
  );

  if (feature.geometry.type === 'Polygon') {
    const area = geoArea(feature as never);
    if (area > Math.PI * 2) {
      return {
        ...feature,
        geometry: {
          type: 'Polygon',
          coordinates: flipPolygon(feature.geometry.coordinates),
        },
      };
    }

    return feature;
  }

  if (feature.geometry.type === 'MultiPolygon') {
    const normalizedPolygons = feature.geometry.coordinates.map((polygon) => {
      const polygonFeature: GeoFeature = {
        type: 'Feature',
        properties: feature.properties,
        geometry: { type: 'Polygon', coordinates: polygon },
      };
      const area = geoArea(polygonFeature as never);
      return area > Math.PI * 2 ? flipPolygon(polygon) : polygon;
    });

    return {
      ...feature,
      geometry: {
        type: 'MultiPolygon',
        coordinates: normalizedPolygons,
      },
    };
  }

  return feature;
}

function normalizeAntimeridianGeometry(feature: GeoFeature, generator: ReturnType<typeof geoPath>): GeoFeature {
  if (feature.geometry.type !== 'MultiPolygon') {
    return feature;
  }

  const polygons = feature.geometry.coordinates;
  const avgLongitudes = polygons.map((polygon) => {
    const ring = polygon[0];
    if (!ring.length) return 0;
    return ring.reduce((sum, coordinate) => sum + (coordinate[0] as number), 0) / ring.length;
  });

  let largestIndex = 0;
  let largestArea = -1;

  for (let index = 0; index < polygons.length; index += 1) {
    const polygonFeature: GeoFeature = {
      type: 'Feature',
      properties: feature.properties,
      geometry: { type: 'Polygon', coordinates: polygons[index] },
    };
    const polygonArea = Math.max(0, generator.area(polygonFeature));
    if (polygonArea > largestArea) {
      largestArea = polygonArea;
      largestIndex = index;
    }
  }

  if (avgLongitudes[largestIndex] <= 90) {
    return feature;
  }

  if (!avgLongitudes.some((longitude) => longitude < -90)) {
    return feature;
  }

  return {
    ...feature,
    geometry: {
      type: 'MultiPolygon',
      coordinates: polygons.map((polygon, index) => {
        if (avgLongitudes[index] >= -90) {
          return polygon;
        }

        return polygon.map((ring) => (
          ring.map((coordinate) => [(coordinate[0] as number) + 360, coordinate[1]] as GeoJSON.Position)
        ));
      }),
    },
  };
}

function buildCountryShapePreview(feature: GeoFeature): CountryShapePreview {
  const orientedFeature = normalizeFeatureOrientation(feature);
  const baseProjection = geoMercator();
  const baseGenerator = geoPath(baseProjection);
  const normalizedFeature = normalizeAntimeridianGeometry(orientedFeature, baseGenerator);
  const previewFeature = getFeatureFocusGeometry(normalizedFeature, baseGenerator);
  const previewProjection = geoMercator();

  previewProjection.fitExtent(
    [
      [COUNTRY_PREVIEW_PADDING, COUNTRY_PREVIEW_PADDING],
      [COUNTRY_PREVIEW_VIEWBOX.width - COUNTRY_PREVIEW_PADDING, COUNTRY_PREVIEW_VIEWBOX.height - COUNTRY_PREVIEW_PADDING],
    ],
    previewFeature as never,
  );

  return {
    path: geoPath(previewProjection)(previewFeature) ?? '',
    viewBox: COUNTRY_PREVIEW_VIEWBOX,
  };
}

export async function getAdminQuizCountryShapePreviews(): Promise<Record<AdminQuizCountrySlug, CountryShapePreview>> {
  if (!cachedCountryPreviewsPromise) {
    cachedCountryPreviewsPromise = loadWorldGeoJson().then((geoData) => {
      const featuresByCode = new Map<string, GeoFeature>();

      for (const feature of geoData.features || []) {
        if (!feature || feature.type !== 'Feature' || !feature.geometry) {
          continue;
        }

        const isoA2 = getIsoA2((feature.properties || {}) as FeatureProperties);
        if (!isoA2 || featuresByCode.has(isoA2)) {
          continue;
        }

        featuresByCode.set(isoA2, feature as GeoFeature);
      }

      return Object.fromEntries(
        SUPPORTED_ADMIN_QUIZ_COUNTRIES.map((country) => {
          const feature = featuresByCode.get(ADMIN_QUIZ_COUNTRY_CODES[country]);
          return [country, feature ? buildCountryShapePreview(feature) : { path: '', viewBox: COUNTRY_PREVIEW_VIEWBOX }];
        }),
      ) as Record<AdminQuizCountrySlug, CountryShapePreview>;
    });
  }

  return cachedCountryPreviewsPromise;
}