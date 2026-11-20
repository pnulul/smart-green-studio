import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Store,
  X,
  MapPin,
  Crosshair,
  Info,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import {
  SiteAnalysisData,
  RadiusOption,
  GreenInfraRecommendation,
  OptimalCandidateSite,
  GeoJsonLayerItem,
  CustomGeoJsonItem,
  GeoJsonLayerKey,
  BufferShape,
} from '../types';
import { GeoJsonLayerPanel } from './GeoJsonLayerPanel';

interface CenterMapProps {
  data: SiteAnalysisData;
  radius: RadiusOption;
  multiRadius: boolean;
  bufferShape?: BufferShape;
  geoJsonLayers: GeoJsonLayerItem[];
  onToggleGeoJsonLayer: (key: GeoJsonLayerKey) => void;
  onChangeGeoJsonLayerOpacity: (key: GeoJsonLayerKey, opacity: number) => void;
  customGeoJsonLayers: CustomGeoJsonItem[];
  onAddCustomGeoJsonLayer: (layer: CustomGeoJsonItem) => void;
  onRemoveCustomGeoJsonLayer: (id: string) => void;
  onToggleCustomGeoJsonLayer: (id: string) => void;
  onChangeCustomGeoJsonLayerOpacity: (id: string, opacity: number) => void;
  onSelectCandidateSite?: (candidate: OptimalCandidateSite) => void;
  onSelectGreenInfra?: (gi: GreenInfraRecommendation) => void;
  googleMapsApiKey?: string;
  vworldKey?: string;
  onRunAnalyze?: () => void;
  isLoading?: boolean;
}

export const CenterMap: React.FC<CenterMapProps> = ({
  data,
  radius,
  multiRadius,
  bufferShape = 'circle',
  geoJsonLayers,
  onToggleGeoJsonLayer,
  onChangeGeoJsonLayerOpacity,
  customGeoJsonLayers,
  onAddCustomGeoJsonLayer,
  onRemoveCustomGeoJsonLayer,
  onToggleCustomGeoJsonLayer,
  onChangeCustomGeoJsonLayerOpacity,
  onSelectCandidateSite,
  googleMapsApiKey,
  onRunAnalyze,
  isLoading = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer }>({});
  const dynamicGeoJsonLayersRef = useRef<{ [key: string]: L.GeoJSON | L.LayerGroup }>({});
  const bufferLayerRef = useRef<L.FeatureGroup | null>(null);
  const poiMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  const [activeBaseLayer, setActiveBaseLayer] = useState<
    'dark' | 'voyager' | 'osm' | 'googleRoad' | 'googleSat' | 'terrain'
  >('googleSat');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showPoiDrawer, setShowPoiDrawer] = useState(false);
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<string>('ALL');

  // Initialize Leaflet Map with robust OSM / Carto / Google basemaps
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [data.lat, data.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      preferCanvas: true,
    });

    // 1. CartoDB Dark Matter (High-contrast Dark OSM Basemap)
    const layerDark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    );

    // 2. CartoDB Voyager (High-resolution Clean Basemap)
    const layerVoyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 20,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    );

    // 3. OpenStreetMap Standard Tile Layer
    const layerOsm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { crossOrigin: true,
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
    });

    // 4. Google Maps Standard Roadmap (Used when API key or public preview is available)
    const layerGoogleRoad = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      { maxZoom: 20, attribution: '&copy; Google Maps' }
    );

    // 5. Google Maps Satellite / Hybrid
    const layerGoogleSat = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      { maxZoom: 20, attribution: '&copy; Google Satellite' }
    );

    // 6. OpenTopoMap (Terrain)
    const layerTerrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { crossOrigin: true,
      maxZoom: 17,
      subdomains: ['a', 'b', 'c'],
      opacity: 0.85,
      attribution: '&copy; OpenTopoMap',
    });

    baseLayersRef.current = {
      dark: layerDark,
      voyager: layerVoyager,
      osm: layerOsm,
      googleRoad: layerGoogleRoad,
      googleSat: layerGoogleSat,
      terrain: layerTerrain,
    };

    layerGoogleSat.addTo(map);
    setActiveBaseLayer('googleSat');

    L.control
      .attribution({
        position: 'bottomright',
        prefix:
          '<span class="text-[9px] text-[var(--text-3)] font-mono">Smart Green Studio &copy; OSM &copy; CARTO &copy; Google Maps</span>',
      })
      .addTo(map);

    mapInstanceRef.current = map;

    const timers = [50, 150, 300, 600, 1200, 2000].map((delay) =>
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, delay)
    );

    const handleWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view on site coordinates / radius changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const targetZoom = radius <= 300 ? 16 : radius <= 500 ? 15 : radius <= 1000 ? 14 : 13;
    
    // Use flyTo for smoother transition and to avoid grey tiles when jumping large distances
    map.flyTo([data.lat, data.lng], targetZoom, { duration: 0.6 });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [data.lat, data.lng, radius]);

  // Switch Base Layer
  const changeBaseLayer = (
    type: 'dark' | 'voyager' | 'osm' | 'googleRoad' | 'googleSat' | 'terrain'
  ) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(baseLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    const targetLayer = baseLayersRef.current[type];
    if (targetLayer) {
      targetLayer.addTo(map);
      setActiveBaseLayer(type);
      setTimeout(() => map.invalidateSize(), 50);
    }
  };

  // Fly to a specific POI on map
  const handleFlyToPoi = (poiLat: number, poiLng: number, poiName: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([poiLat, poiLng], 17, { duration: 0.8 });
    const marker = poiMarkersRef.current[poiName];
    if (marker) {
      setTimeout(() => marker.openPopup(), 900);
    }
  };

  // Filtered POI list
  const filteredPois = data.pois
    ? selectedPoiCategory === 'ALL'
      ? data.pois
      : data.pois.filter((p) => p.category === selectedPoiCategory)
    : [];

  // Render Target Center Marker, Multi-Buffer Rings, and POI Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (bufferLayerRef.current) {
      if (map.hasLayer(bufferLayerRef.current)) map.removeLayer(bufferLayerRef.current);
      bufferLayerRef.current.clearLayers();
    }

    const bGroup = L.featureGroup();
    poiMarkersRef.current = {};

    // 1. Target Center Marker with distinct pulse ring
    const centerIcon = L.divIcon({
      className: 'custom-center-pin',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <div class="absolute w-9 h-9 rounded-full bg-[var(--accent)]/30 animate-ping"></div>
          <div class="relative w-8 h-8 rounded-full bg-[#0A0E13] border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shadow-xl">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M2 12h20" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const centerMarker = L.marker([data.lat, data.lng], {
      icon: centerIcon,
      zIndexOffset: 1000,
    }).addTo(bGroup);

    centerMarker.bindPopup(`
      <div class="p-1.5 text-[var(--text-1)] min-w-[220px]">
        <div class="flex items-center gap-1.5 pb-1.5 border-b border-[var(--border-hair)]">
          <span class="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          <span class="font-bold text-xs text-[var(--text-1)]">${data.siteName}</span>
        </div>
        <div class="text-[11px] text-[var(--text-2)] mt-2 leading-relaxed">${data.address}</div>
        <div class="mt-2 text-[10px] text-[var(--text-3)] flex items-center justify-between bg-[var(--surface-1)] p-1.5 rounded border border-[var(--border-hair)]">
          <span>좌표</span>
          <span class="font-mono text-[var(--accent)] font-medium">${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}</span>
        </div>
        <div class="mt-2 text-[10px] text-[var(--text-2)] bg-[var(--surface-2)] p-1.5 rounded border border-[var(--border-hair)] flex justify-between items-center">
          <span>분석 영역 (${bufferShape === 'rectangle' ? '사각형' : '원형'}):</span>
          <b class="text-[var(--text-1)] font-mono">${radius}m</b>
        </div>
      </div>
    `);

    // 2. Buffer Zones (Circle or Rectangle with single-hue opacities)
    const getRectangleBounds = (centerLat: number, centerLng: number, distMeters: number) => {
      const latDelta = distMeters / 111320;
      const lngDelta = distMeters / (111320 * Math.cos(centerLat * (Math.PI / 180)));
      return L.latLngBounds(
        [centerLat - latDelta, centerLng - lngDelta],
        [centerLat + latDelta, centerLng + lngDelta]
      );
    };

    if (multiRadius) {
      const radii: number[] = [250, 500, 1000, 1500, 2000];
      const opacities = [0.2, 0.14, 0.08, 0.04, 0.02];
      radii.forEach((r, idx) => {
        const isCurrent = r === radius;
        if (bufferShape === 'rectangle') {
          L.rectangle(getRectangleBounds(data.lat, data.lng, r), {
            color: '#35C6E8',
            weight: isCurrent ? 2.5 : 1,
            dashArray: isCurrent ? undefined : '4, 4',
            fillColor: '#35C6E8',
            fillOpacity: isCurrent ? 0.15 : opacities[idx] || 0.05,
          }).addTo(bGroup);
        } else {
          L.circle([data.lat, data.lng], {
            radius: r,
            color: '#35C6E8',
            weight: isCurrent ? 2.5 : 1,
            dashArray: isCurrent ? undefined : '4, 4',
            fillColor: '#35C6E8',
            fillOpacity: isCurrent ? 0.15 : opacities[idx] || 0.05,
          }).addTo(bGroup);
        }
      });
    } else {
      if (bufferShape === 'rectangle') {
        L.rectangle(getRectangleBounds(data.lat, data.lng, radius), {
          color: '#35C6E8',
          weight: 2,
          fillColor: '#35C6E8',
          fillOpacity: 0.12,
          dashArray: '4, 4',
        }).addTo(bGroup);
      } else {
        L.circle([data.lat, data.lng], {
          radius: radius,
          color: '#35C6E8',
          weight: 2,
          fillColor: '#35C6E8',
          fillOpacity: 0.12,
          dashArray: '4, 4',
        }).addTo(bGroup);
      }
    }

    // 3. POI Markers on Dark Map
    if (data.pois && data.pois.length > 0) {
      data.pois.forEach((poi) => {
        const categoryColor =
          poi.category === '식생·공원'
            ? '#35C6E8'
            : poi.category === '대중교통'
            ? 'rgba(53,198,232,0.68)'
            : poi.category === '교육·공공'
            ? 'rgba(53,198,232,0.42)'
            : 'rgba(53,198,232,0.24)';

        const poiCategoryLetter =
          poi.category === '식생·공원'
            ? 'G'
            : poi.category === '대중교통'
            ? 'T'
            : poi.category === '교육·공공'
            ? 'P'
            : 'C';

        const poiIcon = L.divIcon({
          className: 'custom-poi-marker',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
              <div class="w-5 h-5 rounded-full border border-white/80 flex items-center justify-center text-white text-[9px] font-bold shadow-md" style="background-color: ${categoryColor};">
                ${poiCategoryLetter}
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const pMarker = L.marker([poi.lat, poi.lng], { icon: poiIcon });
        pMarker.bindPopup(`
          <div class="p-1 text-[var(--text-1)] min-w-[210px]">
            <div class="flex items-center justify-between pb-1.5 border-b border-[var(--border-hair)]">
              <span class="font-bold text-xs text-[var(--text-1)]">${poi.name}</span>
              <span class="text-[9px] font-medium px-1.5 py-0.5 rounded text-[var(--text-1)] bg-[var(--surface-2)] border border-[var(--border-hair)]">
                ${poi.category}
              </span>
            </div>
            <div class="text-[11px] text-[var(--text-2)] mt-2">${poi.interpretation}</div>
            <div class="mt-2 flex items-center justify-between text-[10px] text-[var(--text-3)] bg-[var(--surface-1)] p-1.5 rounded border border-[var(--border-hair)]">
              <span>중심 이격거리</span>
              <span class="font-medium text-[var(--accent)]">${poi.distanceMeters}m (도보 ${poi.walkingMinutes}분)</span>
            </div>
          </div>
        `);

        pMarker.addTo(bGroup);
        poiMarkersRef.current[poi.name] = pMarker;
      });
    }

    // 4. Candidate Priority Sites on Map
    if (data.candidateSites && data.candidateSites.length > 0) {
      data.candidateSites.forEach((cand) => {
        const candIcon = L.divIcon({
          className: 'custom-cand-marker',
          html: `
            <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
              <div class="w-6 h-6 rounded-md bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--accent)] flex items-center justify-center text-[10px] font-bold shadow-lg">
                #${cand.rank}
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const cMarker = L.marker([cand.lat, cand.lng], { icon: candIcon, zIndexOffset: 900 });
        cMarker.bindPopup(`
          <div class="p-1 text-[var(--text-1)] min-w-[230px]">
            <div class="flex items-center justify-between pb-1.5 border-b border-[var(--border-hair)]">
              <span class="font-bold text-xs text-[var(--accent)]">우선 대상지 #${cand.rank}</span>
              <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-hair)]">
                적합도 ${cand.overallScore ?? 85}점
              </span>
            </div>
            <div class="font-bold text-xs text-[var(--text-1)] mt-1.5">${cand.name ?? '후보 대상지'}</div>
            <div class="text-[11px] text-[var(--text-2)] mt-1">${cand.approxAddress ?? ''}</div>
            <div class="mt-2 p-1.5 rounded bg-[var(--surface-1)] border border-[var(--border-hair)] text-[10px] text-[var(--text-2)] space-y-0.5">
              <div class="flex justify-between">
                <span class="text-[var(--text-3)]">권장 인프라:</span>
                <span class="font-medium text-[var(--text-1)]">${cand.typeLabel ?? '그린인프라'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--text-3)]">가용 면적:</span>
                <span class="font-medium text-[var(--text-1)]">${(cand.targetAreaM2 ?? 0).toLocaleString()} ㎡</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[var(--text-3)]">우선 사유:</span>
                <span class="font-normal text-[var(--text-2)]">${cand.suitabilityRationale ?? ''}</span>
              </div>
            </div>
          </div>
        `);

        cMarker.on('click', () => {
          if (onSelectCandidateSite) onSelectCandidateSite(cand);
        });

        cMarker.addTo(bGroup);
      });
    }

    bGroup.addTo(map);
    bufferLayerRef.current = bGroup;
  }, [data, radius, multiRadius, bufferShape]);

  // Render Dynamic GIS Layers (Built-in + Custom)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(dynamicGeoJsonLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    dynamicGeoJsonLayersRef.current = {};

    // 1. Built-in GeoJSON Layers
    geoJsonLayers.forEach((layerItem) => {
      if (!layerItem.visible || !layerItem.geoJsonData) return;

      const gLayer = L.geoJSON(layerItem.geoJsonData, {
        style: (feature) => {
          const p = feature?.properties || {};
          let fillColor = '#35C6E8';
          let weight = 1.5;
          let fillOpacity = layerItem.opacity;

          if (layerItem.key === 'heatIslandGrid') {
            const risk = p.heatRisk || p.risk;
            if (risk === 'HIGH') fillColor = '#E9743A';
            else if (risk === 'MEDIUM') fillColor = 'rgba(53,198,232,0.68)';
            else fillColor = 'rgba(53,198,232,0.24)';
          } else if (layerItem.key === 'candidateSites') {
            if (p.greenRoofFeasible) fillColor = '#35C6E8';
            else fillColor = 'rgba(255,255,255,0.18)';
          } else if (layerItem.key === 'landUseZonation') {
            if (p.isPublicOwned) fillColor = '#35C6E8';
            else fillColor = 'rgba(255,255,255,0.18)';
          }

          return {
            color: fillColor,
            weight: weight,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            dashArray: layerItem.key === 'candidateSites' ? '3, 3' : undefined,
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          let popupContent = `
            <div class="p-1 text-[var(--text-1)] min-w-[200px]">
              <div class="font-bold text-xs pb-1 border-b border-[var(--border-hair)] flex items-center justify-between">
                <span>${p.name || p.zoneName || p.bldName || p.pnu || layerItem.label}</span>
                <span class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-hair)]">
                  ${layerItem.category}
                </span>
              </div>
          `;

          if (p.areaM2 || p.area) {
            popupContent += `
              <div class="text-[11px] text-[var(--text-2)] mt-1.5 flex justify-between">
                <span class="text-[var(--text-3)]">면적:</span>
                <span class="font-medium text-[var(--text-1)]">${(p.areaM2 || p.area || 0).toLocaleString()} ㎡</span>
              </div>
            `;
          }

          if (p.suitabilityRationale) {
            popupContent += `
              <div class="text-[10.5px] text-[var(--text-2)] mt-1.5 bg-[var(--surface-1)] p-1.5 rounded border border-[var(--border-hair)]">
                ${p.suitabilityRationale}
              </div>
            `;
          }

          popupContent += `</div>`;
          layer.bindPopup(popupContent);

          if (p.id && (layerItem.key === 'candidateSites' || p.rank)) {
            layer.on('click', () => {
              const matched = data.candidateSites?.find((c) => c.id === p.id);
              if (matched && onSelectCandidateSite) {
                onSelectCandidateSite(matched);
              }
            });
          }
        },
      });

      gLayer.addTo(map);
      dynamicGeoJsonLayersRef.current[layerItem.key] = gLayer;
    });

    // 2. Custom Uploaded GeoJSON Layers
    customGeoJsonLayers.forEach((cItem) => {
      if (!cItem.visible || !cItem.data) return;

      const cLayer = L.geoJSON(cItem.data, {
        style: (feature) => {
          const c = '#35C6E8';
          return {
            color: c,
            weight: feature?.geometry?.type === 'LineString' ? 2.5 : 1.5,
            fillColor: c,
            fillOpacity: cItem.opacity,
          };
        },
        pointToLayer: (feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: 5,
            fillColor: '#35C6E8',
            color: 'rgba(255,255,255,0.7)',
            weight: 1.5,
            opacity: 1,
            fillOpacity: cItem.opacity,
          });
        },
      });

      cLayer.addTo(map);
      dynamicGeoJsonLayersRef.current[cItem.id] = cLayer;
    });
  }, [geoJsonLayers, customGeoJsonLayers, data]);

  const hasGoogleKey = Boolean(googleMapsApiKey && googleMapsApiKey.trim().length > 5);

  return (
    <div
      className="relative w-full h-full min-h-[460px] bg-[var(--bg-void)] overflow-hidden border-b border-[var(--border-hair)]"
      id="map-container"
    >
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0"
        style={{ minHeight: '100%', width: '100%' }}
      />

      {/* Top Left: Map Labeling Overlay (Identical style & position to ThematicAnalysisMap) */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2 max-w-[calc(100%-140px)] sm:max-w-[calc(100%-240px)] no-print">
        {/* Row 1: Thematic & Status Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <div
            className="px-2.5 py-1 text-xs font-bold rounded-md border backdrop-blur-md flex items-center gap-1.5 shadow-sm transition-all bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              {data.siteName || '선택 대상지'}
            </span>
          </div>

          <div className="px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md bg-[var(--surface-2)]/85 text-[var(--text-2)] border-[var(--border-hair)] flex items-center gap-1 shadow-sm">
            <span>좌표:</span>
            <span className="text-[var(--accent)] font-mono">
              {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
            </span>
          </div>

          <div className="px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md bg-[var(--surface-2)]/85 text-[var(--text-2)] border-[var(--border-hair)] flex items-center gap-1 shadow-sm">
            <span>분석범위:</span>
            <span className="text-[var(--text-1)] font-mono">
              {radius}m ({bufferShape === 'rectangle' ? '구형' : '원형'})
            </span>
          </div>

          {data.address && (
            <div className="hidden md:flex px-2.5 py-1 text-xs font-semibold rounded-md border backdrop-blur-md bg-[var(--surface-2)]/85 text-[var(--text-2)] border-[var(--border-hair)] items-center gap-1 max-w-[240px] shadow-sm">
              <MapPin className="w-3 h-3 text-[var(--accent)] shrink-0" />
              <span className="text-[var(--text-1)] truncate">{data.address}</span>
            </div>
          )}
        </div>

        {/* Row 2: Basemap Switcher (배경지도) */}
        <div className="flex items-center bg-[var(--bg-panel)]/95 backdrop-blur-md rounded-xl p-1 border border-[var(--border-hair)] gap-1 w-fit shadow-md">
          <span className="text-[10px] font-bold text-[var(--text-3)] px-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[var(--accent)]" />
            배경지도:
          </span>
          <button
            type="button"
            id="basemap-dark-btn"
            onClick={() => changeBaseLayer('dark')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors ${
              activeBaseLayer === 'dark'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
            title="고대비 다크 OSM 베이스맵"
          >
            OSM 다크
          </button>
          <button
            type="button"
            id="basemap-voyager-btn"
            onClick={() => changeBaseLayer('voyager')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors ${
              activeBaseLayer === 'voyager'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
            title="OpenStreetMap 기반 고해상도 베이스맵"
          >
            OSM 보야저
          </button>
          <button
            type="button"
            id="basemap-osm-btn"
            onClick={() => changeBaseLayer('osm')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors ${
              activeBaseLayer === 'osm'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
            title="OpenStreetMap 공식 타일"
          >
            OSM 표준
          </button>
          <button
            type="button"
            id="basemap-road-btn"
            onClick={() => changeBaseLayer('googleRoad')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
              activeBaseLayer === 'googleRoad'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
            title={hasGoogleKey ? 'Google Maps 도로망 타일' : 'Google 도로'}
          >
            <span>Google 도로</span>
          </button>
          <button
            type="button"
            id="basemap-sat-btn"
            onClick={() => changeBaseLayer('googleSat')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
              activeBaseLayer === 'googleSat'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
            title={hasGoogleKey ? 'Google Maps 위성/하이브리드' : '항공/위성'}
          >
            <span>항공/위성</span>
          </button>
          <button
            type="button"
            id="basemap-terrain-btn"
            onClick={() => changeBaseLayer('terrain')}
            className={`px-2 py-0.5 text-xs font-medium rounded-lg transition-colors ${
              activeBaseLayer === 'terrain'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)] font-bold'
                : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)]'
            }`}
          >
            지형 등고
          </button>
        </div>
      </div>

      {/* Top Right: Actions & Tools */}
      <div className="absolute top-3.5 right-3.5 z-[400] flex flex-col gap-2 items-end no-print">
        <div className="flex items-center gap-1.5">
          {/* Fit to Target Bounds Button - identical to ThematicAnalysisMap's '데이터 영역 맞춤' */}
          <button
            type="button"
            id="fit-bounds-btn"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (!map) return;
              if (bufferLayerRef.current) {
                try {
                  const bounds = bufferLayerRef.current.getBounds();
                  if (bounds && bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [40, 40], animate: true });
                    return;
                  }
                } catch {
                  // ignore
                }
              }
              const targetZoom = radius <= 300 ? 16 : radius <= 500 ? 15 : radius <= 1000 ? 14 : 13;
              map.setView([data.lat, data.lng], targetZoom, { animate: true });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors bg-[var(--bg-panel)] text-[var(--text-2)] border-[var(--border-hair)] hover:bg-[var(--surface-1)] hover:text-[var(--text-1)] shadow-md"
            title="대상지 버퍼 영역에 지도 맞추기"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">대상지 맞춤</span>
          </button>

          <button
            type="button"
            id="toggle-poi-drawer-btn"
            onClick={() => setShowPoiDrawer(!showPoiDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showPoiDrawer
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--bg-panel)] text-[var(--text-2)] border-[var(--border-hair)] hover:bg-[var(--surface-1)] hover:text-[var(--text-1)]'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>OSM POI ({data.pois?.length || 0})</span>
          </button>

          <button
            type="button"
            id="toggle-layer-panel-btn"
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showLayerPanel
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--bg-panel)] text-[var(--text-2)] border-[var(--border-hair)] hover:bg-[var(--surface-1)] hover:text-[var(--text-1)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>
              GIS 레이어 ({geoJsonLayers.filter((l) => l.visible).length + customGeoJsonLayers.filter((c) => c.visible).length})
            </span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-[var(--bg-panel)] rounded-xl border border-[var(--border-hair)] overflow-hidden">
          <button
            type="button"
            id="zoom-in-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] transition-colors border-b border-[var(--border-hair)]"
            title="확대"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="zoom-out-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] transition-colors"
            title="축소"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* POI Inspector Drawer Modal / Card */}
      {showPoiDrawer && (
        <div className="absolute top-14 right-3.5 z-[500] w-80 sm:w-96 max-h-[390px] bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-hair)] flex flex-col overflow-hidden no-print shadow-2xl">
          <div className="p-3 bg-[var(--bg-panel)] border-b border-[var(--border-hair)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-bold text-xs text-[var(--text-1)]">OSM 시설 & POI 분석 인벤토리</span>
            </div>
            <button
              data-usage-action="poi-close"
              type="button"
              onClick={() => setShowPoiDrawer(false)}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="p-2 bg-[var(--bg-panel)] border-b border-[var(--border-hair)] flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {['ALL', '대중교통', '식생·공원', '교육·공공', '상업·생활'].map((cat) => (
              <button
                data-usage-action="poi-filter"
                key={cat}
                type="button"
                onClick={() => setSelectedPoiCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedPoiCategory === cat
                    ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
                    : 'bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] border border-[var(--border-hair)]'
                }`}
              >
                {cat === 'ALL' ? `전체 (${data.pois?.length || 0})` : cat}
              </button>
            ))}
          </div>

          {/* POI List Table */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar max-h-[270px]">
            {filteredPois.length > 0 ? (
              filteredPois.map((p, idx) => (
                <button
                  data-usage-action="poi-select"
                  key={`${p.name}-${idx}`}
                  type="button"
                  onClick={() => handleFlyToPoi(p.lat, p.lng, p.name)}
                  className="w-full text-left p-2 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] cursor-pointer transition-colors flex items-center justify-between text-xs group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: p.color?.startsWith('--')
                            ? `var(${p.color})`
                            : p.color || '#35C6E8',
                        }}
                      />
                      <span className="font-semibold text-[var(--text-1)] truncate group-hover:text-[var(--accent)]">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-3)] block truncate mt-0.5">
                      {p.interpretation}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-[var(--accent)]">
                      {p.distanceMeters}m
                    </span>
                    <span className="text-[10px] text-[var(--text-3)] block">
                      도보 {p.walkingMinutes}분
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[var(--text-3)]">
                해당 카테고리의 POI 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layer Control Floating Drawer Panel */}
      {showLayerPanel && (
        <div className="absolute top-14 right-3.5 z-[500] no-print">
          <GeoJsonLayerPanel
            layers={geoJsonLayers}
            onToggleLayer={onToggleGeoJsonLayer}
            onChangeLayerOpacity={onChangeGeoJsonLayerOpacity}
            customLayers={customGeoJsonLayers}
            onAddCustomLayer={onAddCustomGeoJsonLayer}
            onRemoveCustomLayer={onRemoveCustomGeoJsonLayer}
            onToggleCustomLayer={onToggleCustomGeoJsonLayer}
            onChangeCustomLayerOpacity={onChangeCustomGeoJsonLayerOpacity}
            onClose={() => setShowLayerPanel(false)}
          />
        </div>
      )}

      {/* Bottom Status Info Bar */}
      <div className="absolute bottom-3.5 left-3.5 z-[400] hidden sm:flex items-center gap-2.5 bg-[var(--bg-panel)]/90 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-[var(--border-hair)] text-xs text-[var(--text-2)] shadow-lg">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
        <span className="font-bold text-[var(--text-1)]">{data.siteName}</span>
        <span className="text-[var(--text-3)]">|</span>
        <span className="font-mono text-[var(--accent)] text-[11px]">
          {data.lat.toFixed(5)}, {data.lng.toFixed(5)} ({bufferShape === 'rectangle' ? '사각형' : '원형'} {radius}m)
        </span>
        {onRunAnalyze && (
          <button
            data-usage-action="run-analysis-main-btn"
            type="button"
            onClick={onRunAnalyze}
            disabled={isLoading}
            className="ml-2 px-2.5 py-0.5 bg-[var(--accent)] hover:opacity-90 text-[#080B0F] rounded-lg text-[11px] font-bold transition-opacity"
          >
            {isLoading ? '분석 중...' : '종합분석 실행'}
          </button>
        )}
      </div>
    </div>
  );
};
