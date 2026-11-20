
import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { spatialAnalyzer } from '../../services/spatialAnalyzer';
import html2canvas from 'html2canvas';
import { LIGHT_BASEMAP, basemapOptions } from '../../config/maps';
import { createBasemapLayer } from '../../utils/basemapLayer';

export const MiniReportMap: React.FC<{
  datasetId: string;
  geoJson?: any;
  rasterBlob?: Blob;
  bbox?: number[];
  style?: any;
  basemapUrl?: string;
  targetGeometry?: any;
  isExporting?: boolean;
  onReadyForExport?: (datasetId: string, dataUrl?: string | null) => void;
}> = ({ datasetId, geoJson, rasterBlob, bbox, style, basemapUrl, targetGeometry, isExporting, onReadyForExport }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const basemapRef = useRef<L.TileLayer | null>(null);
  const currentBasemapUrlRef = useRef<string>('');
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null);

  const exportMapContainerRef = useRef<HTMLDivElement>(null);
  const exportMapInstance = useRef<L.Map | null>(null);
  const onReadyRef = useRef(onReadyForExport);
  onReadyRef.current = onReadyForExport;
  useEffect(() => () => {
    mapInstance.current?.remove();
    exportMapInstance.current?.remove();
    mapInstance.current = null;
    exportMapInstance.current = null;
    basemapRef.current = null;
    currentBasemapUrlRef.current = '';
  }, []);

  const geoJsonOptions = useMemo(() => {
    return {
      style: (feature: any) => {
        let fieldName = 'DN';
        if (datasetId === '02_building_use') fieldName = 'building_use';
        else if (style?.field) fieldName = style.field;

        if (datasetId === '17_lst') {
           const val = feature?.properties?.[fieldName];
           if (Number(val) === 0) {
             return { fillColor: 'transparent', color: 'transparent', weight: 0, fillOpacity: 0, opacity: 0 };
           }
        }
        
        let fillColor = '#3b82f6';
        let weight = 1;
        let color = '#2563eb';
        let fillOpacity = style?.fillOpacity !== undefined ? style.fillOpacity : 0.6;
        
        let matchedClassObj = null;
        if (style && style.configured && style.classes && style.classes.length > 0) {
          const val = feature?.properties?.[fieldName];
          matchedClassObj = spatialAnalyzer.matchStyleClass(val, style.classes, datasetId);
          if (matchedClassObj) {
            fillColor = matchedClassObj.color;
          } else {
            fillColor = '#c4c4c4'; // Fallback
          }
        }

        if (geoJson?.features?.[0]?.geometry?.type?.includes('Line')) {
           fillOpacity = 0;
           weight = matchedClassObj?.weight !== undefined ? matchedClassObj.weight : 3;
           color = fillColor;
        } else {
           color = fillColor;
        }

        return {
          fillColor,
          color,
          weight,
          fillOpacity,
          opacity: matchedClassObj?.opacity !== undefined ? matchedClassObj.opacity : 1,
        };
      },
      pointToLayer: (feature: any, latlng: any) => {
        let fieldName = 'DN';
        if (datasetId === '02_building_use') fieldName = 'building_use';
        else if (style?.field) fieldName = style.field;

        if (datasetId === '17_lst') {
           const val = feature?.properties?.[fieldName];
           if (Number(val) === 0) {
             return L.circleMarker(latlng, { radius: 0, opacity: 0, fillOpacity: 0 });
           }
        }

        let fillColor = '#3b82f6';
        let radius = 6;

        if (style && style.configured && style.classes && style.classes.length > 0) {
          const val = feature?.properties?.[fieldName];
          const matchedClass = spatialAnalyzer.matchStyleClass(val, style.classes, datasetId);
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
          color: '#1e40af',
          weight: 1,
          opacity: 1,
          fillOpacity: style?.fillOpacity !== undefined ? style.fillOpacity : 0.8
        });
      }
    };
  }, [datasetId, style, geoJson]);

  // Use refs for latest data to prevent re-triggering export effect
  const dataRefs = useRef({ geoJson, rasterBlob, bbox, basemapUrl, targetGeometry, geoJsonOptions });
  useEffect(() => {
    dataRefs.current = { geoJson, rasterBlob, bbox, basemapUrl, targetGeometry, geoJsonOptions };
  }, [geoJson, rasterBlob, bbox, basemapUrl, targetGeometry, geoJsonOptions]);

  // Regular UI Map Rendering
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
      });
      L.control.attribution({ prefix: false }).addTo(mapInstance.current);
      /* Base map added dynamically */
    }

    const map = mapInstance.current;
        
    // Manage Base Map
    const targetBasemapUrl = basemapUrl || LIGHT_BASEMAP.url;
    if (!basemapRef.current || !map.hasLayer(basemapRef.current)) {
      basemapRef.current = createBasemapLayer(targetBasemapUrl, basemapOptions(targetBasemapUrl)).addTo(map);
      currentBasemapUrlRef.current = targetBasemapUrl;
    } else if (currentBasemapUrlRef.current !== targetBasemapUrl) {
      map.removeLayer(basemapRef.current);
      basemapRef.current = createBasemapLayer(targetBasemapUrl, basemapOptions(targetBasemapUrl)).addTo(map);
      currentBasemapUrlRef.current = targetBasemapUrl;
    }

    // Clear previous layers
    map.eachLayer((layer) => {
      if (layer !== basemapRef.current) {
        map.removeLayer(layer);
      }
    });

    let bounds = L.latLngBounds([]);
    let rasterUrl: string | null = null;
    if (geoJson) {
      bounds = L.geoJSON(geoJson, geoJsonOptions).addTo(map).getBounds();
    } else if (rasterBlob && bbox) {
      rasterUrl = URL.createObjectURL(rasterBlob);
      bounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
      L.imageOverlay(rasterUrl, bounds, { alt: '공간분석 결과' }).addTo(map);
    }
    if (targetGeometry) {
      const targetBounds = L.geoJSON(targetGeometry).getBounds();
      if (targetBounds.isValid()) bounds = targetBounds;
    }
    const fitMapBounds = () => {
      if (!mapRef.current?.clientWidth || !mapRef.current.clientHeight) return;
      map.invalidateSize({ pan: false });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], animate: false });
    };

    // Delay slightly to ensure container has sized properly
    const timer = setTimeout(fitMapBounds, 100);
    const observer = new ResizeObserver(fitMapBounds);
    observer.observe(mapRef.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (rasterUrl) URL.revokeObjectURL(rasterUrl);
    };

  }, [geoJson, rasterBlob, bbox, basemapUrl, targetGeometry, geoJsonOptions]);

  // Export Map Rendering
  useEffect(() => {
    if (isExporting && exportMapContainerRef.current) {
      const { geoJson: extGeoJson, rasterBlob: extRaster, bbox: extBbox, basemapUrl: extBasemap, targetGeometry: extTarget, geoJsonOptions: extOptions } = dataRefs.current;
      const container = exportMapContainerRef.current;
      // Leaflet's global 100% dimensions must not shrink the export canvas to the sidebar.
      container.style.setProperty('width', '1600px', 'important');
      container.style.setProperty('height', '1200px', 'important');
      
      const prevAny3d = L.Browser.any3d;
      // @ts-ignore
      L.Browser.any3d = false;
      
      if (!exportMapInstance.current) {
        exportMapInstance.current = L.map(container, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          attributionControl: false,
          preferCanvas: true
        });
      }
      
      const eMap = exportMapInstance.current;
      
      // Clear layers
      eMap.eachLayer((layer) => {
        eMap.removeLayer(layer);
      });
      
      const targetBasemapUrl = extBasemap || LIGHT_BASEMAP.url;
      const tileLayer = createBasemapLayer(targetBasemapUrl, basemapOptions(targetBasemapUrl)).addTo(eMap);
      L.control.attribution({ prefix: false }).addTo(eMap);
      let rasterUrl: string | null = null;
      let imageLoadPromise: Promise<void> = Promise.resolve();
      
      let boundsToFit = L.latLngBounds([]);
      
      if (extGeoJson) {
        const layer = L.geoJSON(extGeoJson, extOptions).addTo(eMap);
        boundsToFit = layer.getBounds();
      } else if (extRaster && extBbox) {
        rasterUrl = URL.createObjectURL(extRaster);
        boundsToFit = L.latLngBounds([extBbox[1], extBbox[0]], [extBbox[3], extBbox[2]]);
        const overlay = L.imageOverlay(rasterUrl, boundsToFit);
        imageLoadPromise = new Promise<void>((resolve, reject) => {
          overlay.once('load', () => resolve());
          overlay.once('error', () => reject(new Error('Analysis image failed to load')));
        });
        overlay.addTo(eMap);
      }
      
      eMap.invalidateSize(true);
      
      if (extTarget) {
         const targetLayer = L.geoJSON(extTarget);
         if (targetLayer.getBounds().isValid()) {
            eMap.fitBounds(targetLayer.getBounds(), { padding: [60, 60], animate: false });
         } else if (boundsToFit.isValid()) {
            eMap.fitBounds(boundsToFit, { padding: [60, 60], animate: false });
         }
      } else if (boundsToFit.isValid()) {
         eMap.fitBounds(boundsToFit, { padding: [60, 60], animate: false });
      }

      // Wait for tiles to load with a 5s fallback timeout
      const tileLoadPromise = new Promise<void>((resolve) => {
        let isResolved = false;
        const done = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };
        tileLayer.on('load', done);
        if (!tileLayer.isLoading()) done();
        setTimeout(done, 10000); // 10초 타임아웃
      });

      let cancelled = false;
      Promise.all([tileLoadPromise, imageLoadPromise]).then(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          if (!exportMapContainerRef.current) {
            // @ts-ignore
            L.Browser.any3d = prevAny3d;
            onReadyRef.current?.(datasetId, null);
            return;
          }
          
          html2canvas(exportMapContainerRef.current, {
            useCORS: true,
            scale: 1, // Container is already exactly 1600x1200 (high res 4:3)
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1600,
            windowHeight: 1200
          }).then(canvas => {
            if (cancelled) return;
            // @ts-ignore
            L.Browser.any3d = prevAny3d;
            const dataUrl = canvas.toDataURL('image/png');
            setStaticImageUrl(dataUrl);
            onReadyRef.current?.(datasetId, dataUrl);
            
            // Cleanup
            if (exportMapInstance.current) {
              exportMapInstance.current.remove();
              exportMapInstance.current = null;
            }
          }).catch(err => {
            if (cancelled) return;
            // @ts-ignore
            L.Browser.any3d = prevAny3d;
            console.error("Map capture error:", err);
            onReadyRef.current?.(datasetId, null);
            if (exportMapInstance.current) {
              exportMapInstance.current.remove();
              exportMapInstance.current = null;
            }
          });
        });
      }).catch(err => {
        if (cancelled) return;
        // @ts-ignore
        L.Browser.any3d = prevAny3d;
        console.error('Map image loading error:', err);
        onReadyRef.current?.(datasetId, null);
      });
      return () => {
        cancelled = true;
        // @ts-ignore
        L.Browser.any3d = prevAny3d;
        if (rasterUrl) URL.revokeObjectURL(rasterUrl);
        if (exportMapInstance.current === eMap) {
          eMap.remove();
          exportMapInstance.current = null;
        }
      };
    } else if (!isExporting) {
      setStaticImageUrl(null);
    }
  }, [isExporting, datasetId]);

  return (
    <div className="w-full h-full bg-slate-100 relative">
      <div 
        ref={mapRef} 
        className="w-full h-full absolute inset-0 z-10" 
        style={{ opacity: staticImageUrl ? 0 : 1, pointerEvents: staticImageUrl ? 'none' : 'auto' }} 
      />
      {staticImageUrl && (
        <img 
          src={staticImageUrl} 
          className="w-full h-full absolute inset-0 object-contain z-20 bg-slate-100" 
          alt="Map Export" 
        />
      )}
      
      {/* Offscreen high-res 4:3 map container for export (avoid fixed position html2canvas bug) */}
      <div 
        ref={exportMapContainerRef}
        className="no-print"
        style={{
          position: 'absolute',
          left: '-20000px',
          top: 0,
          width: '1600px',
          height: '1200px',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

