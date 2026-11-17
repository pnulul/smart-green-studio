import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { spatialAnalyzer } from '../../services/spatialAnalyzer';
import { getClippedGeoJson } from '../../utils/indexedDbUtils';

import 'leaflet/dist/leaflet.css';
import { AnalysisContext, DatasetMetadata, DatasetStyle, DatasetDiagnosticInfo } from '../../types';
import { Maximize2, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parseNumericDN, parseYearDN, normalizeEnvironmentalGrade } from '../../utils/dnParser';

interface ThematicAnalysisMapProps {
  dataset: DatasetMetadata;
  geoJson: any | null;
  rasterBuffer?: ArrayBuffer | null;
  rasterPreview?: any | null;
  style: DatasetStyle | null;
  context: AnalysisContext; // Has lat, lng, radius, bufferShape
  sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
  diagnostics?: DatasetDiagnosticInfo | null;
  onRendered?: () => void;
}

export const ThematicAnalysisMap: React.FC<ThematicAnalysisMapProps> = ({
  dataset,
  geoJson,
  rasterPreview,
  rasterBuffer,
  style,
  context,
  sourceMode,
  diagnostics,
  onRendered,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const geoJsonLayer = useRef<L.GeoJSON | null>(null);
  const rasterLayerRef = useRef<any | null>(null);
  const analysisZoneLayer = useRef<L.Layer | null>(null);
  const maskLayer = useRef<L.Polygon | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  const center: L.LatLngExpression = [context.target.lat, context.target.lng];

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false
      });
      mapInstance.current = map;

      // Clean dark-adapted base map with low opacity to emphasize thematic data
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        crossOrigin: true,
        maxZoom: 19,
        opacity: 0.3,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Center update when target changes
  useEffect(() => {
    if (mapInstance.current && analysisZoneLayer.current) {
      try {
        const bounds = (analysisZoneLayer.current as any).getBounds();
        mapInstance.current.fitBounds(bounds, { padding: [20, 20], animate: false });
      } catch (e) {}
    }
  }, [context.target.lat, context.target.lng]);

  // Update Analysis Zone (Circle or Rectangle)
  
  
  useEffect(() => {
    if (!mapInstance.current) return;

    if (analysisZoneLayer.current) {
      mapInstance.current.removeLayer(analysisZoneLayer.current);
    }
    if (maskLayer.current) {
      mapInstance.current.removeLayer(maskLayer.current);
    }

    const { lat, lng, radius, shapeType, geometry } = context.target;
    let newZoneLayer: L.Layer | null = null;
    let holeCoords: L.LatLngExpression[] = [];

    if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      // Use actual analysis geometry directly
      newZoneLayer = L.geoJSON(geometry, {
        style: {
          color: '#f87171',
          weight: 2,
          fillColor: 'transparent',
          dashArray: '6, 6',
        },
        interactive: false
      }).addTo(mapInstance.current);

      // Extract coords for mask hole
      if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
        holeCoords = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
      } else if (geometry.type === 'MultiPolygon' && geometry.coordinates && geometry.coordinates[0] && geometry.coordinates[0][0]) {
        holeCoords = geometry.coordinates[0][0].map((coord: number[]) => [coord[1], coord[0]]);
      }
    } else if (shapeType === 'circle') {
      newZoneLayer = L.circle([lat, lng], {
        radius,
        color: '#f87171',
        weight: 2,
        fillColor: 'transparent',
        dashArray: '6, 6',
      }).addTo(mapInstance.current);

      const earthRadius = 6378137;
      const dLat = (radius / earthRadius) * (180 / Math.PI);
      const dLng = dLat / Math.cos((lat * Math.PI) / 180);
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const theta = (i * 2 * Math.PI) / points;
        holeCoords.push([lat + dLat * Math.sin(theta), lng + dLng * Math.cos(theta)]);
      }
    } else {
      const dLat = radius / 111320;
      const dLng = radius / (111320 * Math.cos((lat * Math.PI) / 180));
      const bounds: L.LatLngBoundsExpression = [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng],
      ];
      newZoneLayer = L.rectangle(bounds, {
        color: '#f87171',
        weight: 2,
        fillColor: 'transparent',
        dashArray: '6, 6',
      }).addTo(mapInstance.current);

      holeCoords = [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng - dLng],
        [lat + dLat, lng + dLng],
        [lat - dLat, lng + dLng],
        [lat - dLat, lng - dLng]
      ];
    }
    
    // Add dark mask outside the analysis zone
    const worldCoords: L.LatLngExpression[] = [
      [-90, -180],
      [90, -180],
      [90, 180],
      [-90, 180],
      [-90, -180]
    ];
    
    maskLayer.current = L.polygon([worldCoords, holeCoords], {
      color: 'transparent',
      fillColor: '#000000',
      fillOpacity: 0.25,
      interactive: false
    }).addTo(mapInstance.current);
    
    analysisZoneLayer.current = newZoneLayer;
    if ('bringToFront' in newZoneLayer) {
      (newZoneLayer as any).bringToFront();
    }
    
    // Always fit bounds to AnalysisZone
    if (newZoneLayer) {
      try {
        const bounds = (newZoneLayer as L.Circle | L.Rectangle).getBounds();
        mapInstance.current.fitBounds(bounds, { padding: [20, 20], animate: false });
      } catch (e) {
        // ignore
      }
    }
  }, [context.target.lat, context.target.lng, context.target.radius, context.target.shapeType]);


  // Render raster if applicable
  useEffect(() => {
    if (!mapInstance.current) return;
    
    // Cleanup previous raster
    if (rasterLayerRef.current) {
      mapInstance.current.removeLayer(rasterLayerRef.current);
      rasterLayerRef.current = null;
    }
    
    if (dataset.dataType !== 'raster' || !rasterPreview) {
      return;
    }
    
    try {
      console.log(`[Map Render]\nDataset: ${dataset.id}\nOriginal clipped raster: ${rasterPreview.originalWidth} x ${rasterPreview.originalHeight}\nOriginal pixels: ${rasterPreview.originalPixels.toLocaleString()}\nPreview: ${rasterPreview.width} x ${rasterPreview.height}\nPreview Blob: ${(rasterPreview.blob.size / 1024).toFixed(1)} KB\nRenderer: ImageOverlay`);
      
      const objectUrl = URL.createObjectURL(rasterPreview.blob);
      
      const [minX, minY, maxX, maxY] = rasterPreview.bbox;
      const bounds = L.latLngBounds([minY, minX], [maxY, maxX]);
      
      const overlay = L.imageOverlay(objectUrl, bounds, {
        opacity: style?.fillOpacity !== undefined ? style.fillOpacity : 0.75,
        interactive: false
      }).addTo(mapInstance.current);
      const img = overlay.getElement();
      if (img) {
        img.style.imageRendering = 'pixelated';
      }
      rasterLayerRef.current = overlay;
      
      setIsRendered(true);
      if (onRendered) onRendered();
      
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
      
    } catch (err) {
      console.error('Failed to render raster overlay', err);
    }
  }, [rasterPreview, style, dataset]);

  // Update GeoJSON Layer with smart styling and interactive tooltips
  useEffect(() => {
    
    if (!mapInstance.current) return;
    
    // Add base buildings layer for overlays (highrise/lowrise only)
    if (dataset.id === '04_highrise' || dataset.id === '05_lowrise') {
      getClippedGeoJson('01_buildings')
        .then(baseGeoJson => {
          if (!mapInstance.current) return;
          if ((mapInstance.current as any).baseBuildingsLayer) {
            mapInstance.current.removeLayer((mapInstance.current as any).baseBuildingsLayer);
          }
          (mapInstance.current as any).baseBuildingsLayer = L.geoJSON(baseGeoJson, {
            style: {
              fillColor: '#e2e2e2',
              color: '#cbd5e1',
              weight: 1,
              fillOpacity: 0.25
            },
            interactive: false
          }).addTo(mapInstance.current);
          
          // Ensure overlay stays on top
          if (geoJsonLayer.current) {
             geoJsonLayer.current.bringToFront();
          }
        })
        .catch(() => {});
    } else {
       if (mapInstance.current && (mapInstance.current as any).baseBuildingsLayer) {
          mapInstance.current.removeLayer((mapInstance.current as any).baseBuildingsLayer);
          (mapInstance.current as any).baseBuildingsLayer = null;
       }
    }

    if (geoJsonLayer.current) {

      mapInstance.current.removeLayer(geoJsonLayer.current);
      geoJsonLayer.current = null;
    }

    if (dataset.dataType === 'raster') return;

    if (geoJson && Array.isArray(geoJson.features) && geoJson.features.length > 0) {
      let featuresToRender = geoJson.features;
      const originalCount = featuresToRender.length;
      
      console.log(`[Map Render]\nDataset: ${dataset.id}\nFeature count: ${originalCount}\nRenderer: Canvas (preferCanvas: true)`);
      
      // Safety limit for vector
      if (originalCount > 15000) {
        console.warn(`[Map Render] Vector features (${originalCount}) exceed safety limit (15000). Limiting render to prevent crash.`);
        featuresToRender = featuresToRender.slice(0, 15000);
      }
      
      const safeGeoJson = { ...geoJson, features: featuresToRender };

      const fieldName = dataset.valueField || style?.field || 'DN';

      const layer = L.geoJSON(safeGeoJson, {
        style: (feature) => {
          if (dataset.id === '17_lst') {
            const val = feature?.properties?.[style?.field || fieldName];
            if (Number(val) === 0) {
              return { fillColor: 'transparent', color: 'transparent', weight: 0, fillOpacity: 0, opacity: 0 };
            }
          }
          
          let fillColor = '#3b82f6';
          let weight = 1;
          let fillOpacity = style?.fillOpacity !== undefined ? style.fillOpacity : 0.65;
          let color = '#1e293b';
          let isPoint = feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint';
          let radius = 6;

          if (dataset.id === '04_highrise') {
            fillColor = '#e5308c';
          } else if (dataset.id === '05_lowrise') {
            fillColor = '#9b59d0';
          } else if (style && style.configured && style.classes && style.classes.length > 0) {
            let val = feature?.properties?.[style.field || fieldName];
            if (dataset.id === '02_building_use') val = feature?.properties?.['building_use'];
            else if (dataset.id === '18_population_grid' || dataset.id === '19_census_population_household') val = feature?.properties?.val ?? feature?.properties?.pop ?? feature?.properties?.POPULATION ?? feature?.properties?.DN ?? 0;
            const matchedClass = spatialAnalyzer.matchStyleClass(val, style.classes, dataset.id);
            if (matchedClass) {
              fillColor = matchedClass.color;
              if (matchedClass.radius !== undefined) radius = matchedClass.radius;
            } else {
              fillColor = '#c4c4c4'; // Fallback per requirement
            }
          }

          let matchedClassObj = null;
          if (dataset.id === '10_roads' && style?.classes?.[0]) {
            matchedClassObj = style.classes[0];
          } else if (style && style.configured && style.classes && style.classes.length > 0) {
            let val = feature?.properties?.[style.field || fieldName];
            if (dataset.id === '02_building_use') val = feature?.properties?.['building_use'];
            else if (dataset.id === '18_population_grid' || dataset.id === '19_census_population_household') val = feature?.properties?.val ?? feature?.properties?.pop ?? feature?.properties?.POPULATION ?? feature?.properties?.DN ?? 0;
            matchedClassObj = spatialAnalyzer.matchStyleClass(val, style.classes, dataset.id);
          }
          if (dataset.geometryType === 'LineString' || dataset.geometryType === 'MultiLineString') {
            fillOpacity = 0;
            weight = matchedClassObj?.weight !== undefined ? matchedClassObj.weight : 3;
            color = fillColor;
            if (matchedClassObj?.opacity !== undefined) {
               // leaflet uses opacity for lines, not fillOpacity
               fillOpacity = 0; 
            }
          }

          return {
            fillColor,
            color,
            weight,
            fillOpacity,
            opacity: matchedClassObj?.opacity !== undefined ? matchedClassObj.opacity : 1,
          };
        },
        pointToLayer: (feature, latlng) => {
          if (dataset.id === '17_lst') {
            const val = feature?.properties?.[style?.field || fieldName];
            if (Number(val) === 0) {
              return L.circleMarker(latlng, { radius: 0, opacity: 0, fillOpacity: 0 });
            }
          }
          
          let fillColor = '#3b82f6';
          let radius = 6;
          let fillOpacity = style?.fillOpacity !== undefined ? style.fillOpacity : 0.8;
          if (style && style.configured && style.classes && style.classes.length > 0) {
            const fieldName = dataset.valueField || style?.field || 'DN';
            let val = feature?.properties?.[style?.field || fieldName];
            if (dataset.id === '02_building_use') val = feature?.properties?.['building_use'];
            else if (dataset.id === '18_population_grid' || dataset.id === '19_census_population_household') val = feature?.properties?.val ?? feature?.properties?.pop ?? feature?.properties?.POPULATION ?? feature?.properties?.DN ?? 0;
            const matchedClass = spatialAnalyzer.matchStyleClass(val, style.classes, dataset.id);
            if (matchedClass) {
              fillColor = matchedClass.color;
              if (matchedClass.radius !== undefined) radius = matchedClass.radius;
            } else {
              fillColor = '#c4c4c4';
            }
          }
          return L.circleMarker(latlng, {
            radius,
            fillColor,
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            fillOpacity
          });
        },
        onEachFeature: (feature, layer) => {
          if (dataset.id === '17_lst') {
             const val = feature?.properties?.[style?.field || fieldName];
             if (Number(val) === 0) return;
          }
          
          const props = feature.properties || {};
          const propEntries = Object.entries(props);
          const title = dataset.nameKo || 'Feature';
          
          let content = `<div style="font-family:sans-serif; min-width:140px; font-size:12px; line-height:1.4; color:#0f172a;">
            <div style="font-weight:700; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin-bottom:4px; color:#0284c7;">${title}</div>`;
          
          if (props.DN !== undefined && dataset.id !== '02_building_use') {
            let displayValue = props.DN;
            let displayLabel = 'DN';
            let unit = '';
            
            if (dataset.id === '17_lst') {
               displayLabel = '지표온도(LST)';
               unit = ' °C';
            } else if (dataset.id === '03_completion_year') {
               displayLabel = '준공연도';
               const parsed = parseYearDN(props.DN);
               displayValue = parsed !== null ? parsed : '미상';
               unit = parsed !== null ? '년' : '';
            } else if (dataset.id === '24_landcover_major' || dataset.id === '25_ecology') {
               displayLabel = '토지피복';
               if (style && style.classes) {
                  const matched = spatialAnalyzer.matchStyleClass(props.DN, style.classes, dataset.id);
                  displayValue = matched ? matched.label : '미분류';
               } else {
                  displayValue = String(props.DN);
               }
               unit = '';
            }
            
            content += `<div style="font-size:13px; font-weight:700; color:#dc2626; margin-bottom:4px;">${displayLabel}: ${displayValue}${unit}</div>`;
          }

          if (dataset.id === '02_building_use') {
             content += `<div style="font-size:13px; font-weight:700; color:#dc2626; margin-bottom:4px;">건축물 용도: ${props.building_use || '미상'}</div>`;
          } else if (false) {
             content += `<div style="font-size:13px; font-weight:700; color:#dc2626; margin-bottom:4px;">건축물 용도: ${props.building_use}</div>`;
          }

          propEntries.slice(0, 6).forEach(([k, v]) => {
            if (k !== 'DN' && !(dataset.id === '02_building_use' && k === 'building_use')) {
              content += `<div><span style="color:#64748b;">${k}:</span> <span style="font-weight:600;">${v}</span></div>`;
            }
          });
          content += `</div>`;

          layer.bindPopup(content);
          
          let tooltipText = title;
          if (dataset.id === '02_building_use') {
             tooltipText = `건축물 용도: ${props.building_use || '미상'}`;
          } else if (props.DN !== undefined && dataset.id !== '02_building_use') {
             if (dataset.id === '17_lst') tooltipText = `${props.DN} °C`;
             else if (dataset.id === '03_completion_year') {
                const parsed = parseYearDN(props.DN);
                tooltipText = parsed !== null ? `${parsed}년` : '미상';
             }
             else tooltipText = `${props.DN}`;
          }
          
          layer.bindTooltip(
            tooltipText,
            { sticky: true, opacity: 0.9, direction: 'top' }
          );
        },
      }).addTo(mapInstance.current);

      geoJsonLayer.current = layer;
      setIsRendered(true);
      if (onRendered) onRendered();
    } else {
      setIsRendered(false);
    }
  }, [geoJson, style, dataset]);

  // Fit to Data Bounds Handler
  const handleFitDataBounds = () => {
    if (analysisZoneLayer.current && mapInstance.current) {
      try {
        const bounds = (analysisZoneLayer.current as L.Circle | L.Rectangle).getBounds();
        if (bounds.isValid()) {
          mapInstance.current.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (err) {
        console.warn('Could not fit bounds:', err);
      }
    }
  };

  // Determine badge
  const hasData = dataset.dataType === 'raster' ? !!rasterPreview && !rasterPreview.isEmpty : !!geoJson && geoJson.features?.length > 0;
  
  let badgeText = 'REAL';
  let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  if (!hasData) {
    badgeText = 'MISSING';
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  } else if (sourceMode === 'REAL') {
    badgeText = 'REAL DATA';
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else {
    badgeText = sourceMode;
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative w-full h-[420px] rounded-lg overflow-hidden border border-[var(--border-hair)] bg-[var(--surface-1)]">
        <div ref={mapRef} className="w-full h-full" />

        {/* Badges and Quick Tools Overlay (Top Left) */}
        <div className="absolute top-3 left-3 z-[400] flex flex-wrap gap-2 items-center">
          {dataset.valueField && (
            <div className="px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md bg-[var(--surface-2)]/80 text-[var(--text-2)] border-[var(--border-hair)]">
              필드: <span className="text-[var(--accent)] font-mono">{dataset.valueField}</span>
            </div>
          )}

          {geoJson?.features?.length > 0 && (
            <div className="px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md bg-[var(--surface-2)]/80 text-[var(--text-2)] border-[var(--border-hair)]">
              피처: <span className="text-[var(--text-1)] font-mono">{geoJson.features.length.toLocaleString()}개</span>
            </div>
          )}
        </div>

        {/* Legend Overlay (Bottom Left) */}
        {style && style.configured && style.classes.length > 0 && hasData && (
          <div className="absolute bottom-6 left-3 z-[400] max-w-[280px] max-h-[160px] overflow-y-auto p-3 bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-hair)] rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
              <h4 className="text-[11px] font-bold text-[var(--text-1)]">
                범례 ({dataset.nameKo})
              </h4>
            </div>
            <div className="flex flex-col gap-1.5">
              {style.classes.filter((cls, idx, arr) => arr.findIndex(c => c.label === cls.label) === idx).map((cls, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm border border-[var(--border-hair)] shadow-sm shrink-0"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span className="text-[10px] text-[var(--text-2)]">{cls.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fallback notice if dataset empty */}
      {!hasData && (
        <div className="card p-4 text-center text-xs text-[var(--text-3)] bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg">
          {sourceMode === 'EMPTY' 
            ? '분석범위 내 유효 데이터가 없습니다.'
            : sourceMode === 'MISSING'
              ? `${dataset.nameKo} 실제 데이터 파일이 없습니다. (/public/data/${dataset.folder}/layer.${dataset.dataType === 'raster' ? 'tif' : 'geojson'}) `
              : '데이터를 분석하거나 표시할 수 없습니다.'}
        </div>
      )}
    </div>
  );
};
