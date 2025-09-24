import { LocationCoords } from '@/types/location';

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: Record<string, any>;
}

export interface ProjectArea {
  center: LocationCoords;
  coordinates: LocationCoords[];
  properties: Record<string, any>;
}

export function calculatePolygonCenter(coordinates: number[][]): LocationCoords {
  const points = coordinates;

  let x = 0;
  let y = 0;

  for (const point of points) {
    x += point[0]; // longitude
    y += point[1]; // latitude
  }

  return {
    latitude: y / points.length,
    longitude: x / points.length,
  };
}

export function getFeatureCenter(feature: GeoJSONFeature): LocationCoords {
  const outerRing = feature.geometry.coordinates[0];
  return calculatePolygonCenter(outerRing);
}

export async function loadProjectArea(): Promise<LocationCoords | null> {
  try {
    const feature = require('@/features_area_projeto.json') as GeoJSONFeature;
    return getFeatureCenter(feature);
  } catch (error) {
    console.error('Error loading project area:', error);
    return null;
  }
}

export async function loadFullProjectArea(): Promise<ProjectArea | null> {
  try {
    const feature = require('@/features_area_projeto.json') as GeoJSONFeature;
    const center = getFeatureCenter(feature);
    const outerRing = feature.geometry.coordinates[0];

    // Convert coordinates to LocationCoords format
    const coordinates: LocationCoords[] = outerRing.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));

    return {
      center,
      coordinates,
      properties: feature.properties
    };
  } catch (error) {
    console.error('Error loading full project area:', error);
    return null;
  }
}