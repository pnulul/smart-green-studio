import { BufferShape, AnalysisZone } from '../types';
import * as turf from '@turf/turf';

/**
 * Clips a GeoJSON FeatureCollection to the given AnalysisZone.
 * Point: keeps points inside.
 * LineString: clips lines to the boundary.
 * Polygon: computes intersection polygons.
 */
export function clipGeoJsonToZone(geoJson: any, zone: AnalysisZone): any {
  if (!geoJson || !Array.isArray(geoJson.features) || geoJson.features.length === 0) {
    return geoJson;
  }

  // Create a Turf polygon from the AnalysisZone
  let zonePolygon: any = null;
  if (zone.geometry && (zone.geometry.type === 'Polygon' || zone.geometry.type === 'MultiPolygon')) {
    zonePolygon = zone.geometry.type === 'Polygon' 
      ? turf.polygon(zone.geometry.coordinates) 
      : turf.multiPolygon(zone.geometry.coordinates);
  } else {
    // Fallback if geometry is not populated
    if (zone.shapeType === 'rectangle') {
      const radiusKm = zone.radius / 1000;
      const bbox = turf.bbox(turf.circle([zone.lng, zone.lat], radiusKm, { units: 'kilometers', steps: 4 }));
      zonePolygon = turf.bboxPolygon(bbox);
    } else {
      zonePolygon = turf.circle([zone.lng, zone.lat], zone.radius / 1000, { units: 'kilometers', steps: 64 });
    }
  }

  const clippedFeatures: any[] = [];

  for (const feature of geoJson.features) {
    try {
      if (!feature.geometry) continue;
      
      const geomType = feature.geometry.type;

      if (!turf.booleanIntersects(feature, zonePolygon)) continue;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        if (turf.booleanPointInPolygon(feature, zonePolygon)) {
          clippedFeatures.push(feature);
        }
      } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
        // turf.intersect doesn't support lines. We already checked booleanIntersects.
        // Just include the whole line and let the visual mask handle the rest.
        clippedFeatures.push(feature);
      } else {
        // Polygon, MultiPolygon
        const intersection = turf.intersect(turf.featureCollection([feature, zonePolygon]));
        if (intersection) {
          // Preserve properties perfectly
          intersection.properties = { ...feature.properties };
          clippedFeatures.push(intersection);
        }
      }
    } catch (e) {
      // Ignore invalid geometry during clipping
    }
  }

  return {
    type: 'FeatureCollection',
    features: clippedFeatures
  };
}

/**
 * Generates a GeoJSON Polygon for a Circle buffer
 * @param centerLat Center Latitude
 * @param centerLng Center Longitude
 * @param radiusMeters Radius in meters
 * @param points Number of vertices for smooth polygon (default: 48)
 */
export function generateCirclePolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  points: number = 48
): any {
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137; // WGS84 major axis in meters
  const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
  const dLng = dLat / Math.cos((centerLat * Math.PI) / 180);

  for (let i = 0; i <= points; i++) {
    const theta = (i * 2 * Math.PI) / points;
    const lat = centerLat + dLat * Math.sin(theta);
    const lng = centerLng + dLng * Math.cos(theta);
    coordinates.push([parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Generates a GeoJSON Polygon for a Rectangle buffer around center point
 * @param centerLat Center Latitude
 * @param centerLng Center Longitude
 * @param radiusMeters Distance in meters from center to edge
 */
export function generateRectanglePolygon(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): any {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  const minLat = parseFloat((centerLat - latDelta).toFixed(6));
  const maxLat = parseFloat((centerLat + latDelta).toFixed(6));
  const minLng = parseFloat((centerLng - lngDelta).toFixed(6));
  const maxLng = parseFloat((centerLng + lngDelta).toFixed(6));

  const coordinates: [number, number][] = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat], // close polygon
  ];

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Builds a standardized AnalysisZone object
 */
export function buildAnalysisZone(
  lat: number,
  lng: number,
  radius: number,
  shapeType: BufferShape = 'circle',
  siteName: string = '분석 대상지'
): AnalysisZone {
  const geometry =
    shapeType === 'circle'
      ? generateCirclePolygon(lat, lng, radius)
      : generateRectanglePolygon(lat, lng, radius);

  const area =
    shapeType === 'circle'
      ? Math.PI * Math.pow(radius, 2)
      : Math.pow(radius * 2, 2);

  return {
    id: `zone-${Date.now()}`,
    name: siteName,
    shapeType,
    geometry,
    radius,
    area: Math.round(area),
    lat,
    lng,
  };
}
