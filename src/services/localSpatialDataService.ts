import {
  AnalysisZone,
  DatasetMetadata,
  DatasetStyle,
  CatalogItem,
  DatasetDiagnosticInfo,
  LoadedDatasetResult,
  CommonSpatialAnalysisResult,
} from '../types';
import { spatialAnalyzer } from './spatialAnalyzer';
import { publicAssetUrl, datasetAssetUrl, fetchSpatialAsset } from './resourceService';

/**
 * LocalSpatialDataService
 * Unified engine for fetching, parsing, caching, and spatially analyzing
 * the 19 standard datasets from the /public/data/ structure.
 */
class LocalSpatialDataService {
  private cache: Map<string, LoadedDatasetResult> = new Map();
  private catalogCache: CatalogItem[] | null = null;

  /**
   * Fetch catalog.json
   */
  public async getCatalog(): Promise<CatalogItem[]> {
    if (this.catalogCache) return this.catalogCache;
    try {
      const res = await fetch(publicAssetUrl('data/catalog.json'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.catalogCache = data.datasets || [];
      return this.catalogCache!;
    } catch (err) {
      console.error('[LocalSpatialDataService] Failed to load catalog.json:', err);
      return [];
    }
  }

  /**
   * Load dataset (metadata.json, style.json, layer.geojson / layer.tif)
   * Generalizes across all 19 datasets
   */
  public async loadDatasetConfig(datasetId: string): Promise<LoadedDatasetResult> {
    return this.loadDataset(datasetId, true, true);
  }

  public async loadDataset(datasetId: string, forceReload: boolean = false, skipGeoJson: boolean = false): Promise<LoadedDatasetResult> {
    if (!forceReload && this.cache.has(datasetId)) {
      return this.cache.get(datasetId)!;
    }

    const folder = datasetId;
    
    let metadata: DatasetMetadata | null = null;
    let style: DatasetStyle | null = null;
    let geoJson: any | null = null;
    let rasterBuffer: ArrayBuffer | null = null; // Left for type compatibility, unused

    let httpStatus: number | string = 0;
    let parseStatus: 'SUCCESS' | 'EMPTY' | 'INVALID_JSON' | 'NOT_FOUND' = 'NOT_FOUND';
    let featureCount = 0;
    let geometryType = 'Unknown';
    let propertyFields: string[] = [];
    let fieldError: string | null = null;

    const fetchOptions = forceReload ? { cache: "no-store" as RequestCache } : {};

    // 1. Fetch metadata.json
    try {
      const metaRes = await fetch(datasetAssetUrl(folder, 'metadata.json'), fetchOptions);
      if (metaRes.ok) {
        metadata = await metaRes.json();
      }
    } catch (e) {
      console.warn(`[LocalSpatialDataService] Metadata missing for ${folder}`);
    }
    
    // Determine extension based on metadata
    const isRaster = metadata?.dataType === 'raster';
    const url = datasetAssetUrl(folder, `layer.${isRaster ? 'tif' : 'geojson'}`);

    // 2. Fetch style.json
    try {
      const styleRes = await fetch(datasetAssetUrl(folder, 'style.json'), fetchOptions);
      if (styleRes.ok) {
        style = await styleRes.json();
      }
    } catch (e) {
      console.warn(`[LocalSpatialDataService] Style missing for ${folder}`);
    }

    // 3. Fetch layer data
    if (skipGeoJson || isRaster) {
      // Do not fetch tif or geojson if skipGeoJson is true or if it's a raster (Worker handles raster)
      parseStatus = 'SUCCESS';
      httpStatus = 200;
    } else {
      try {
        const gRes = await fetchSpatialAsset(url, fetchOptions);
        httpStatus = gRes.status;
        if (gRes.ok) {
          const text = await gRes.text();
          if (text.trim().startsWith('<')) {
            parseStatus = 'NOT_FOUND';
          } else {
          try {
            geoJson = JSON.parse(text);
            if (geoJson && Array.isArray(geoJson.features)) {
              featureCount = geoJson.features.length;
              if (featureCount > 0) {
                parseStatus = 'SUCCESS';
                const firstFeature = geoJson.features[0];
                geometryType = firstFeature.geometry?.type || 'GeometryCollection';
                propertyFields = firstFeature.properties ? Object.keys(firstFeature.properties) : [];
              } else {
                parseStatus = 'EMPTY';
              }
            } else {
              parseStatus = 'EMPTY';
            }
          } catch (jsonErr) {
            parseStatus = 'INVALID_JSON';
            console.error(`[LocalSpatialDataService] GeoJSON parse error in ${url}:`, jsonErr);
          }
          }
        } else {
          parseStatus = 'NOT_FOUND';
        }
      } catch (netErr) {
        httpStatus = 'NETWORK_ERROR';
        parseStatus = 'NOT_FOUND';
      }
    }

    // 4. Determine Source Mode
    // If skipping GeoJSON or it's a Raster, we wait for actual pipeline to give us status
    let isRealData = false;
    let sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR' = 'MISSING';
    
    if (skipGeoJson || isRaster) {
       // Pipeline will override this later
       sourceMode = 'REAL'; 
    } else {
       if (!geoJson) {
          sourceMode = 'MISSING';
       } else if (featureCount > 0) {
          sourceMode = 'REAL';
          isRealData = true;
       } else {
          sourceMode = 'EMPTY';
       }
    }

    // 5. Value Field Validation
    const valueField = metadata?.valueField || null;
    if (datasetId === '17_lst') {
      if (!valueField) {
        fieldError = 'LST 값 필드가 설정되지 않았습니다.';
      } else if (featureCount > 0 && !propertyFields.includes(valueField)) {
        fieldError = `LST 값 필드("${valueField}")가 GeoJSON properties에 존재하지 않습니다. (발견된 필드: ${propertyFields.join(', ') || '없음'})`;
      }
    }

    const diagnostics: DatasetDiagnosticInfo = {
      datasetId,
      folder,
      url: url,
      httpStatus,
      parseStatus,
      featureCount,
      geometryType,
      propertyFields,
      valueField,
      sourceMode,
      loaded: isRealData,
      rendered: false, // will be marked true when layer is rendered on Leaflet
      fieldError,
      intersectingFeaturesCount: 0,
      calculatedStats: null,
    };

    const result: LoadedDatasetResult = {
      datasetId,
      folder,
      metadata,
      style,
      geoJson,
      rasterBuffer,
      diagnostics,
    };

    this.cache.set(datasetId, result);
    return result;
  }

  /**
   * Performs full multi-dimensional spatial analysis (KPIs, Charts, Breakdowns, Coverage)
   * between the target AnalysisZone and the loaded dataset.
   */
  public runSpatialAnalysis(
    datasetId: string,
    zone: AnalysisZone,
    geoJson: any,
    metadata: DatasetMetadata | null,
    style: DatasetStyle | null
  ): CommonSpatialAnalysisResult {
    const meta: DatasetMetadata = metadata || {
      id: datasetId,
      nameKo: datasetId,
      category: '분석',
      dataType: 'vector',
      sourceMode: (geoJson && geoJson.features?.length > 0) ? 'REAL' : 'MISSING',
      mapFile: 'layer.geojson',
      styleFile: 'style.json',
      description: '도시환경 공간분석 데이터셋',
      valueField: 'DN',
    } as DatasetMetadata;

    return spatialAnalyzer.analyzeGeoJson(datasetId, meta, style, geoJson, zone);
  }

  /**
   * Spatial Analysis between an AnalysisZone and a Dataset (e.g. 17_lst)
   */
  public analyzeDatasetZone(
    datasetId: string,
    zone: AnalysisZone,
    geoJson: any,
    metadata: DatasetMetadata | null
  ): {
    avgLst: number;
    minLst?: number;
    maxLst?: number;
    validFeatureCount: number;
    intersectingCount: number;
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
    datasetId: string;
    valueField: string | null;
    fieldStatus: string;
    fieldError?: string;
  } {
    // If no real GeoJSON features exist, return 0s
    if (!geoJson || !Array.isArray(geoJson.features) || geoJson.features.length === 0) {
      return {
        avgLst: 0,
        minLst: 0,
        maxLst: 0,
        validFeatureCount: 0,
        intersectingCount: 0,
        sourceMode: 'MISSING',
        datasetId,
        valueField: null,
        fieldStatus: 'MISSING',
      };
    }

    const valueField = metadata?.valueField || 'DN';
    const firstFeature = geoJson.features[0];
    const propertyKeys = firstFeature?.properties ? Object.keys(firstFeature.properties) : [];

    // Verify valueField
    if (!valueField || !propertyKeys.includes(valueField)) {
      return {
        avgLst: 0,
        validFeatureCount: 0,
        intersectingCount: 0,
        sourceMode: 'REAL',
        datasetId,
        valueField,
        fieldStatus: 'FIELD_NOT_CONFIGURED',
        fieldError: 'LST 값 필드가 설정되지 않았습니다.',
      };
    }

    // Perform spatial intersection / containment test
    const { lat: centerLat, lng: centerLng, radius, shapeType } = zone;
    const intersectingValues: number[] = [];
    let intersectingCount = 0;

    for (const feature of geoJson.features) {
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;

      const centroid = getFeatureCentroid(coords);
      if (!centroid) continue;

      let isInside = false;

      if (shapeType === 'circle') {
        // Distance in meters
        const dLat = (centroid.lat - centerLat) * 111320;
        const dLng = (centroid.lng - centerLng) * (111320 * Math.cos((centerLat * Math.PI) / 180));
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        // Include if centroid is within radius or buffer margin
        if (dist <= radius * 1.15) {
          isInside = true;
        }
      } else {
        // Rectangle bounds
        const latDelta = radius / 111320;
        const lngDelta = radius / (111320 * Math.cos((centerLat * Math.PI) / 180));
        if (
          centroid.lat >= centerLat - latDelta &&
          centroid.lat <= centerLat + latDelta &&
          centroid.lng >= centerLng - lngDelta &&
          centroid.lng <= centerLng + lngDelta
        ) {
          isInside = true;
        }
      }

      if (isInside) {
        intersectingCount++;
        const rawVal = feature.properties?.[valueField];
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
        if (!isNaN(numVal) && numVal !== 0) {
          intersectingValues.push(numVal);
        }
      }
    }

    // If we found intersecting features within AnalysisZone
    if (intersectingValues.length > 0) {
      const sum = intersectingValues.reduce((a, b) => a + b, 0);
      const avgLst = parseFloat((sum / intersectingValues.length).toFixed(1));
      const minLst = Math.min(...intersectingValues);
      const maxLst = Math.max(...intersectingValues);

      return {
        avgLst,
        minLst,
        maxLst,
        validFeatureCount: intersectingValues.length,
        intersectingCount,
        sourceMode: 'REAL',
        datasetId,
        valueField,
        fieldStatus: 'NORMAL',
      };
    }

    // If no features intersect the specific AnalysisZone (e.g. analysis point is outside current GeoJSON extent)
    // Calculate dataset global statistics so student still sees real dataset value with informative notice
    const allDatasetValues: number[] = [];
    for (const f of geoJson.features) {
      const v = f.properties?.[valueField];
      const num = typeof v === 'number' ? v : parseFloat(v);
      if (!isNaN(num) && num !== 0) {
        allDatasetValues.push(num);
      }
    }

    if (allDatasetValues.length > 0) {
      const sum = allDatasetValues.reduce((a, b) => a + b, 0);
      const globalAvg = parseFloat((sum / allDatasetValues.length).toFixed(1));
      const minLst = Math.min(...allDatasetValues);
      const maxLst = Math.max(...allDatasetValues);

      return {
        avgLst: globalAvg,
        minLst,
        maxLst,
        validFeatureCount: allDatasetValues.length,
        intersectingCount: 0,
        sourceMode: 'REAL',
        datasetId,
        valueField,
        fieldStatus: 'DATASET_EXTENT_REFERENCE',
      };
    }

    return {
      avgLst: 0,
      minLst: 0,
      maxLst: 0,
      validFeatureCount: 0,
      intersectingCount: 0,
      sourceMode: 'MISSING',
      datasetId,
      valueField,
      fieldStatus: 'MISSING',
    };
  }

  /**
   * Clears in-memory cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.catalogCache = null;
  }
}

/**
 * Calculates representative centroid {lat, lng} from arbitrary GeoJSON coordinates
 */
function getFeatureCentroid(coords: any): { lat: number; lng: number } | null {
  let sumLat = 0;
  let sumLng = 0;
  let pointCount = 0;

  function traverse(item: any) {
    if (!Array.isArray(item)) return;
    if (typeof item[0] === 'number' && typeof item[1] === 'number') {
      sumLng += item[0];
      sumLat += item[1];
      pointCount++;
    } else {
      for (const sub of item) {
        traverse(sub);
      }
    }
  }

  traverse(coords);

  if (pointCount === 0) return null;
  return {
    lat: sumLat / pointCount,
    lng: sumLng / pointCount,
  };
}

export const localSpatialDataService = new LocalSpatialDataService();
