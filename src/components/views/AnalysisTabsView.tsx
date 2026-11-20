import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AnalysisContext,
  AnalysisTab,
  DatasetMetadata,
  DatasetStyle,
  CatalogItem,
  DatasetDiagnosticInfo,
  LoadedDatasetResult,
  CommonSpatialAnalysisResult
} from '../../types';
import { loggerService } from '../../services/loggerService';
import { StudentAuthSession } from '../../types';
import { ThematicAnalysisMap } from './ThematicAnalysisMap';
import { ThematicAnalysisResult } from './ThematicAnalysisResult';
import { localSpatialDataService } from '../../services/localSpatialDataService';
import { datasetAssetUrl } from '../../services/resourceService';
import { spatialAnalyzer } from '../../services/spatialAnalyzer';
import { clipGeoJsonToZone } from '../../utils/geometryUtils';
import { saveClippedGeoJson, getClippedGeoJson, getClippedGeoJsonBlob, clearClippedGeoJsonStore, saveClippedRaster, getClippedRaster, clearClippedRasterStore, saveMapPreview, getMapPreview, clearMapPreviewStore } from '../../utils/indexedDbUtils';
import { generateGeoTiffBlob } from '../../utils/geotiffUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { parseNumericDN, parseYearDN, normalizeEnvironmentalGrade } from '../../utils/dnParser';
import {
  Terminal,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  Download,
  Loader2,
  Play
} from 'lucide-react';

interface AnalysisTabsViewProps {
  session?: StudentAuthSession | null;
  context: AnalysisContext;
  analysisRequest?: number;
  onRunningChange?: (running: boolean) => void;
  onUpdateClimateContext?: (climateData: Partial<AnalysisContext['climate']>) => void;
  onAnalysisResultsChange?: (results: Record<string, CommonSpatialAnalysisResult & { status: string; errorMessage?: string; }>) => void;
}

export const TAB_DATASETS: Record<AnalysisTab, string[]> = {
  종합: [],
  지형환경: ['20_elevation', '21_slope', '22_aspect'],
  '토지이용·계획': ['06_zoning', '08_district_zone'],
  '녹지·생태환경': ['23_park_green', '24_landcover_major', '25_ecology'],
  도시환경: [
    '01_buildings',
    '02_building_use',
    '03_completion_year',
    '04_highrise',
    '05_lowrise',
    '10_roads',
    '11_transit',
    '18_population_grid'
  ],
  기후환경: ['17_lst'],
  수문환경: ['26_river', '27_drainage_grade']
};

export const TAB_DEFAULT_DATASET: Record<AnalysisTab, string> = {
  종합: '',
  지형환경: '20_elevation',
  '토지이용·계획': '06_zoning',
  '녹지·생태환경': '23_park_green',
  도시환경: '01_buildings',
  기후환경: '17_lst',
  수문환경: '26_river'
};

const PIPELINE_DATASETS = [
  '20_elevation',
  '21_slope',
  '22_aspect',
  '06_zoning',
  '08_district_zone',
  '23_park_green',
  '24_landcover_major',
  '25_ecology',
  '01_buildings',
  '02_building_use',
  '03_completion_year',
  '04_highrise',
  '05_lowrise',
  '10_roads',
  '11_transit',
  '18_population_grid',
  '17_lst',
  '26_river',
  '27_drainage_grade'
];

export const AnalysisTabsView: React.FC<AnalysisTabsViewProps> = ({ context, analysisRequest = 0, onRunningChange, onUpdateClimateContext, onAnalysisResultsChange, session }) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('종합');
  const [activeDatasetFolder, setActiveDatasetFolder] = useState<string>('');

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [currentResult, setCurrentResult] = useState<LoadedDatasetResult | null>(null);
  const [clippedGeoJson, setClippedGeoJson] = useState<any | null>(null);
  const [currentRasterPreview, setCurrentRasterPreview] = useState<any | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isRenderedOnMap, setIsRenderedOnMap] = useState<boolean>(false);

  // Pipeline states
  const [pipelineState, setPipelineState] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'NEED_REANALYZE'>('IDLE');
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [pipelineCurrentIndex, setPipelineCurrentIndex] = useState<number>(0);
  const [pipelineCurrentTaskLabel, setPipelineCurrentTaskLabel] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [pipelineResults, setPipelineResults] = useState<Record<string, CommonSpatialAnalysisResult & { status: string, errorMessage?: string }>>({});

  useEffect(() => {
    if (onAnalysisResultsChange) {
      onAnalysisResultsChange(pipelineResults);
    }
  }, [pipelineResults, onAnalysisResultsChange]);
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, 'WAITING' | 'LOADING' | 'CLIPPING' | 'CALCULATING' | 'SAVING' | 'COMPLETED' | 'ERROR'>>({});
  
  const cancelPipelineRef = useRef<boolean>(false);
  const workerCancelRef = useRef<(() => void) | null>(null);
  const pipelineRunningRef = useRef(false);
  useEffect(() => { onRunningChange?.(pipelineState === 'RUNNING'); }, [pipelineState, onRunningChange]);
  const lastTargetId = useRef<string>(context.target.id);

  useEffect(() => () => {
    cancelPipelineRef.current = true;
    workerCancelRef.current?.();
  }, []);

  const tabs: AnalysisTab[] = ['종합', '지형환경', '토지이용·계획', '녹지·생태환경', '도시환경', '기후환경', '수문환경'];

  // Load catalog on mount
  useEffect(() => {
    localSpatialDataService.getCatalog().then(setCatalog);
  }, []);

  // Watch for AnalysisZone changes
  useEffect(() => {
    if (context.target.id !== lastTargetId.current) {
      setPipelineResults({});
      if (pipelineState === 'COMPLETED' || pipelineState === 'RUNNING') {
        setPipelineState('NEED_REANALYZE');
        cancelPipelineRef.current = true;
        workerCancelRef.current?.();
      }
      lastTargetId.current = context.target.id;
    }
  }, [context.target, pipelineState]);

  const handleTabChange = (tab: AnalysisTab) => {
    setActiveTab(tab);
    if (tab !== '종합') {
      const defaultFolder = TAB_DEFAULT_DATASET[tab] || '';
      setActiveDatasetFolder(defaultFolder);
    } else {
      setActiveDatasetFolder('');
    }
  };

  const getCatalogItem = (folder: string) => catalog.find((c) => c.folder === folder);

  const runAnalysisPipeline = async () => {
    if (pipelineRunningRef.current) return;
    pipelineRunningRef.current = true;
    try {
    setPipelineState('RUNNING');
    setPipelineProgress(0);
    setPipelineCurrentIndex(0);
    setPipelineResults({});
    cancelPipelineRef.current = false;
    
    // Clear old indexedDB data
    await clearClippedGeoJsonStore();
    await clearClippedRasterStore();
    await clearMapPreviewStore();

    const newStatus: Record<string, any> = {};
    PIPELINE_DATASETS.forEach(id => newStatus[id] = 'WAITING');
    setPipelineStatus({...newStatus});

    let completedCount = 0;
    const resultsAcc: Record<string, any> = {};

    for (let i = 0; i < PIPELINE_DATASETS.length; i++) {
      if (cancelPipelineRef.current) {
        break;
      }

      const datasetId = PIPELINE_DATASETS[i];
      const cItem = getCatalogItem(datasetId);
      const __startTime = Date.now();
      loggerService.log(session?.studentId || 'unknown', 'DATASET_ANALYSIS_START', `Dataset: ${cItem ? cItem.nameKo : datasetId}`, {
        stage: 'analysis',
        dataset_id: datasetId,
        dataset_name: cItem ? cItem.nameKo : datasetId,
        site_name: context.target.siteName,
        status: 'start'
      });
      const label = cItem ? cItem.nameKo : datasetId;
      
      setPipelineCurrentIndex(i);
      setAnalysisProgress(`분석 중... (${i + 1}/${PIPELINE_DATASETS.length}) ${datasetId}`);
      
      try {
        // 1. Loading
        newStatus[datasetId] = 'LOADING';
        setPipelineStatus({...newStatus});
        setPipelineCurrentTaskLabel(`${label} 데이터 불러오는 중...`);
        
        // Wait for event loop to update UI
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // bypass cache for memory optimization
        // Use loadDatasetConfig to get metadata first, so we know if it's raster or vector
        const res = await localSpatialDataService.loadDatasetConfig(datasetId);
        if (cancelPipelineRef.current) break;
        
        const isRaster = res.metadata?.dataType === 'raster';
        let clipped = null;
        let rasterResult = null;
        
        if (isRaster) {
           // 2. Clipping Raster
           newStatus[datasetId] = 'CLIPPING';
           setPipelineStatus({...newStatus});
           setPipelineCurrentTaskLabel(`${label} 래스터 경계 자르는 중...`);
           await new Promise(resolve => setTimeout(resolve, 50));
           
           try {
             rasterResult = await new Promise((resolve, reject) => {
               const worker = new Worker(new URL('../../workers/geoRasterClipperWorker.ts', import.meta.url), { type: 'module' });
               workerCancelRef.current = () => {
                 worker.terminate();
                 reject(new Error('분석 취소'));
               };
               (window as any).__currentClipperWorker = worker;
               
               worker.onmessage = (e) => {
                 if (e.data.type === 'SUCCESS') {
                   worker.terminate();
                   (window as any).__currentClipperWorker = null;
                   resolve(e.data.payload);
                 } else if (e.data.type === 'ERROR') {
                   worker.terminate();
                   (window as any).__currentClipperWorker = null;
                   reject(new Error(e.data.error));
                 } else if (e.data.type === 'PROGRESS') {
                   setPipelineCurrentTaskLabel(`${label} ${e.data.payload.message}`);
                 }
               };
               worker.onerror = (err) => {
                 worker.terminate();
                 (window as any).__currentClipperWorker = null;
                 reject(err);
               };
               worker.postMessage({
                 type: 'START',
                 payload: { url: datasetAssetUrl(datasetId, 'layer.tif'), zone: context.target, noDataValues: res.metadata?.noDataValues || [] }
               });
             });
             res.diagnostics = {
               ...res.diagnostics,
               sourceMode: 'REAL',
               parseStatus: 'SUCCESS',
               geometryType: 'Raster',
               ...(rasterResult.workerDiagnostics ? { calculatedStats: rasterResult.workerDiagnostics } : {})
             };
           } catch (err) {
             if (err.message && err.message.includes('404')) {
    console.warn(`Raster not found (expected for unuploaded datasets): ${datasetId}`);
  } else {
    console.error(`Failed to clip raster for ${datasetId}`, err);
  }
             
             let sourceMode: 'REAL' | 'ERROR' | 'MISSING' | 'EMPTY' = 'ERROR';
             if (err.message && err.message.includes('404')) {
                sourceMode = 'MISSING';
             } else if (err.message && err.message.includes('isEmpty')) {
                sourceMode = 'EMPTY';
             }
             
             res.diagnostics = {
               ...res.diagnostics,
               sourceMode,
               parseStatus: 'NOT_FOUND',
               fieldError: err.message
             };
             rasterResult = null;
           }
        } else {
           // Stream and clip in a Worker instead of parsing 200+ MB on the UI thread.
           newStatus[datasetId] = 'CLIPPING';
           setPipelineStatus({...newStatus});
           setPipelineCurrentTaskLabel(`${label} 벡터 경계 자르는 중...`);
           await new Promise(resolve => setTimeout(resolve, 50));

           const streamed = await new Promise<{ geoJson: any; featureCount: number }>((resolve, reject) => {
             const worker = new Worker(new URL('../../workers/geoJsonClipperWorker.ts', import.meta.url), { type: 'module' });
             const cleanup = () => { worker.terminate(); workerCancelRef.current = null; };
             workerCancelRef.current = () => { cleanup(); reject(new Error('분석 취소')); };
             worker.onmessage = (event) => {
               if (event.data.type === 'SUCCESS') { cleanup(); resolve(event.data.payload); }
               else if (event.data.type === 'ERROR') { cleanup(); reject(new Error(event.data.error)); }
               else if (event.data.type === 'PROGRESS') {
                 setPipelineCurrentTaskLabel(`${label} ${event.data.payload.featuresProcessed.toLocaleString()}개 도형 확인 중...`);
               }
             };
             worker.onerror = (error) => { cleanup(); reject(new Error(error.message)); };
             worker.postMessage({ type: 'START', payload: { url: datasetAssetUrl(datasetId, 'layer.geojson'), zone: context.target } });
           });
           const beforeClipCount = streamed.featureCount;
           clipped = streamed.geoJson;
           const afterClipCount = clipped?.features?.length || 0;
           res.diagnostics = { ...res.diagnostics, sourceMode: beforeClipCount ? 'REAL' : 'EMPTY',
             parseStatus: 'SUCCESS', httpStatus: 200, featureCount: beforeClipCount,
             geometryType: clipped?.features?.[0]?.geometry?.type || res.metadata?.geometryType || 'Unknown',
             propertyFields: Object.keys(clipped?.features?.[0]?.properties || {}), loaded: true };
           
           if (res.diagnostics) {
             res.diagnostics.featureCountBeforeClip = beforeClipCount;
             res.diagnostics.featureCountAfterClip = afterClipCount;
             
             if (afterClipCount > 0 && clipped) {
                const dnSamples = [];
                for (let i = 0; i < Math.min(10, afterClipCount); i++) {
                   const f = clipped.features[i];
                   if (f && f.properties) {
                      const rawVal = f.properties[res.metadata?.valueField || 'DN'] ?? f.properties['DN'] ?? f.properties['type'];
                      if (rawVal !== undefined) dnSamples.push(rawVal);
                   }
                }
                res.diagnostics.dnSampleValues = [...new Set(dnSamples)];
                let normalized = [...res.diagnostics.dnSampleValues];
                if (datasetId === '24_landcover_major' || datasetId === '25_ecology') {
                   normalized = normalized.map(parseNumericDN);
                } else if (datasetId === '03_completion_year') {
                   normalized = normalized.map(parseYearDN);
                }
                res.diagnostics.normalizedDnSample = normalized;
             }
           }
        }
        
        if (cancelPipelineRef.current) break;

        // 3. Calculating
        newStatus[datasetId] = 'CALCULATING';
        setPipelineStatus({...newStatus});
        setPipelineCurrentTaskLabel(`${label} 분석 중...`);
        await new Promise(resolve => setTimeout(resolve, 50));

        let analysisResult;
        
        // If raster worker failed, skip analysis
        if (isRaster && !rasterResult) {
           analysisResult = {
             datasetId,
             datasetName: res.metadata?.nameKo || '',
             category: res.metadata?.category || '',
             sourceMode: res.diagnostics?.sourceMode || 'ERROR',
             geometryType: 'Raster',
             coverage: { analysisZoneArea: 0, validDataArea: 0, coverageRatio: 0 },
             kpis: [],
             distribution: [],
             totalValidFeatures: 0,
             diagnostics: res.diagnostics,
             summaryText: '데이터를 분석할 수 없습니다.'
           };
        } else if (isRaster) {
           analysisResult = spatialAnalyzer.analyzeRaster(
             datasetId,
             res.metadata,
             res.style,
             rasterResult,
             context.target
           );
        } else {
           analysisResult = localSpatialDataService.runSpatialAnalysis(
             datasetId,
             context.target,
             clipped,
             res.metadata,
             res.style
           );
        }
        analysisResult.diagnostics = res.diagnostics;

        if (datasetId === '17_lst' && onUpdateClimateContext) {
          const values = Array.from(rasterResult?.values || []) as number[];
          const valid = values.filter(Number.isFinite);
          onUpdateClimateContext({
            avgLst: valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0,
            minLst: valid.length ? valid.reduce((a, b) => Math.min(a, b), Infinity) : undefined,
            maxLst: valid.length ? valid.reduce((a, b) => Math.max(a, b), -Infinity) : undefined,
            validFeatureCount: valid.length, sourceMode: valid.length ? 'REAL' : 'EMPTY', datasetId: '17_lst',
          });
        }

        // 4. Save to IndexedDB
        if (clipped || rasterResult) {
          newStatus[datasetId] = 'SAVING';
          setPipelineStatus({...newStatus});
          setPipelineCurrentTaskLabel(`${label} 결과 저장 중...`);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (isRaster && rasterResult && !rasterResult.isEmpty) {
            await saveClippedRaster(datasetId, rasterResult);
            
            // --- GENERATE MAP PREVIEW ---
            try {
              setPipelineCurrentTaskLabel(`${label} 지도 프리뷰 생성 중...`);
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const MAX_PREVIEW_SIZE = 2048;
              let outWidth = rasterResult.width;
              let outHeight = rasterResult.height;
              let scale = 1;
              if (outWidth > MAX_PREVIEW_SIZE || outHeight > MAX_PREVIEW_SIZE) {
                scale = Math.min(MAX_PREVIEW_SIZE / outWidth, MAX_PREVIEW_SIZE / outHeight);
                outWidth = Math.floor(outWidth * scale);
                outHeight = Math.floor(outHeight * scale);
              }

              const canvas = document.createElement('canvas');
              canvas.width = outWidth;
              canvas.height = outHeight;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                const imgData = ctx.createImageData(outWidth, outHeight);
                const noDataValue = rasterResult.noDataValue;
                const values = rasterResult.values;
                const origWidth = rasterResult.width;

                const hexToRgb = (hex) => {
                  let h = hex.replace('#', '');
                  if (h.length === 3) h = h.split('').map(c => c + c).join('');
                  return {
                    r: parseInt(h.substring(0, 2), 16) || 0,
                    g: parseInt(h.substring(2, 4), 16) || 0,
                    b: parseInt(h.substring(4, 6), 16) || 0
                  };
                };

                for (let y = 0; y < outHeight; y++) {
                  const origY = Math.floor(y / scale);
                  for (let x = 0; x < outWidth; x++) {
                    const origX = Math.floor(x / scale);
                    const origIdx = origY * origWidth + origX;
                    const val = values[origIdx];
                    
                    const pixelIdx = (y * outWidth + x) * 4;
                    if (Number.isNaN(val) || val === noDataValue) {
                      imgData.data[pixelIdx + 3] = 0;
                      continue;
                    }
                    
                    let color = '#c4c4c4';
                    if (res.style && res.style.classes) {
                      const matched = spatialAnalyzer.matchStyleClass(val, res.style.classes, datasetId);
                      if (matched && matched.color) color = matched.color;
                    }
                    
                    const rgb = hexToRgb(color);
                    imgData.data[pixelIdx] = rgb.r;
                    imgData.data[pixelIdx + 1] = rgb.g;
                    imgData.data[pixelIdx + 2] = rgb.b;
                    imgData.data[pixelIdx + 3] = 255;
                  }
                }
                ctx.putImageData(imgData, 0, 0);

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const previewData = {
                  blob,
                  bbox: rasterResult.bbox,
                  width: outWidth,
                  height: outHeight,
                  originalWidth: rasterResult.width,
                  originalHeight: rasterResult.height,
                  originalPixels: rasterResult.width * rasterResult.height,
                };
                await saveMapPreview(datasetId, previewData);
              }
            } catch (err) {
              console.error('Failed to generate map preview for', datasetId, err);
            }
          } else if (clipped) {
            await saveClippedGeoJson(datasetId, clipped);
          }
          
          // CRITICAL MEMORY OPTIMIZATION:
          // Immediately nullify references to large object
          clipped = null;
          rasterResult = null;
        }

        // Store result in memory (without GeoJSON)
        resultsAcc[datasetId] = {
          ...analysisResult,
          status: ['ERROR', 'MISSING'].includes(analysisResult.sourceMode) ? 'error' : 'success'
        };

        loggerService.log(session?.studentId || 'unknown', 'DATASET_ANALYSIS_COMPLETE', `Dataset completed: ${label}`, {
          stage: 'analysis',
          dataset_id: datasetId,
          dataset_name: label,
          site_name: context.target.siteName,
          status: 'success',
          duration_ms: Date.now() - __startTime
        });
        
        setPipelineResults({...resultsAcc});
        
        newStatus[datasetId] = resultsAcc[datasetId].status === 'success' ? 'COMPLETED' : 'ERROR';
        setPipelineStatus({...newStatus});
        
        completedCount++;
        setPipelineProgress(Math.floor((completedCount / PIPELINE_DATASETS.length) * 100));

      } catch (err) {
        if (cancelPipelineRef.current) break;
        console.error(`Error analyzing ${datasetId}:`, err);
        loggerService.log(session?.studentId || 'unknown', 'DATASET_ANALYSIS_ERROR', `Dataset error: ${err.message || String(err).substring(0, 50)}`, {
          stage: 'analysis',
          dataset_id: datasetId,
          dataset_name: label,
          site_name: context.target.siteName,
          status: 'error',
          duration_ms: Date.now() - __startTime
        });
        resultsAcc[datasetId] = { status: 'error', errorMessage: String(err) };
        setPipelineResults({...resultsAcc});
        newStatus[datasetId] = 'ERROR';
        setPipelineStatus({...newStatus});
        completedCount++;
        setPipelineProgress(Math.floor((completedCount / PIPELINE_DATASETS.length) * 100));
      } finally {
        workerCancelRef.current = null;
        // Clear memory
        localSpatialDataService.clearCache();
      }
      
      // 브라우저 메인 스레드가 숨 쉴 틈을 만들어줌 (응답없음 방지)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!cancelPipelineRef.current) {
      setPipelineProgress(100);
      setPipelineState('COMPLETED');
      setAnalysisProgress('분석 완료');
      setPipelineCurrentTaskLabel('공간 특성 종합 분석이 완료되었습니다.');
      // Switch to overall tab automatically
      setActiveTab('종합');
      setActiveDatasetFolder('');
    } else {
      setPipelineState('IDLE');
      setAnalysisProgress('분석 취소됨');
    }
    } catch {
      setPipelineState('IDLE');
      setAnalysisProgress('브라우저 저장소를 확인한 후 다시 실행해 주세요.');
    } finally {
      pipelineRunningRef.current = false;
    }
  };

  const lastRequestRef = useRef(0);
  useEffect(() => {
    if (analysisRequest > lastRequestRef.current) {
      lastRequestRef.current = analysisRequest;
      void runAnalysisPipeline();
    }
  }, [analysisRequest]);

  const cancelPipeline = () => {
    cancelPipelineRef.current = true;
    workerCancelRef.current?.();
    if ((window as any).__currentClipperWorker) {
      (window as any).__currentClipperWorker.postMessage({ type: 'CANCEL' });
      (window as any).__currentClipperWorker.terminate();
      (window as any).__currentClipperWorker = null;
    }
  };

  // Load dataset whenever activeDatasetFolder changes in COMPLETED state
  useEffect(() => {
    if (pipelineState !== 'COMPLETED' || !activeDatasetFolder) {
      setCurrentResult(null);
      setClippedGeoJson(null);
      setCurrentRasterPreview(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);
    setIsRenderedOnMap(false);
    
    // CRITICAL MEMORY OPTIMIZATION:
    // Explicitly release previous large GeoJSON object from RAM
    setClippedGeoJson(null);
    setCurrentResult(null);
    setCurrentRasterPreview(null);

    // Load from IndexedDB and metadata from service
    (async () => {
      try {
        const config = await localSpatialDataService.loadDatasetConfig(activeDatasetFolder);
        if (!isMounted) return;

        const memoryOptimizedResult = { ...config, geoJson: null };
        setCurrentResult(memoryOptimizedResult);

        if (config.metadata?.dataType === 'raster') {
          const preview = await getMapPreview(activeDatasetFolder);
          if (!isMounted) return;
          setCurrentRasterPreview(preview);
          setClippedGeoJson(null);
        } else {
          const geojson = await getClippedGeoJson(activeDatasetFolder);
          if (!isMounted) return;
          setClippedGeoJson(geojson);
          setCurrentRasterPreview(null);
        }
        setIsLoading(false);
        localSpatialDataService.clearCache();
      } catch (err) {
        if (!isMounted) return;
        console.error('Error loading clipped dataset:', err);
        setIsLoading(false);
        setLoadError(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeDatasetFolder, pipelineState]);

  const handleDownloadSingleGeoJson = async () => {
    if (!activeDatasetFolder) return;
    
    // Check if it's raster
    const isRaster = currentResult?.metadata?.dataType === 'raster';
    
    if (isRaster) {
      const rasterData = await getClippedRaster(activeDatasetFolder);
      if (rasterData) {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const blob = await generateGeoTiffBlob(activeDatasetFolder, rasterData);
        saveAs(blob, `smartgreen_${activeDatasetFolder}_raster_window_${today}.tif`);
      }
      return;
    }
    
    // Download directly from IDB Blob without holding massive object in RAM
    const blob = await getClippedGeoJsonBlob(activeDatasetFolder);
    if (!blob) return;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(blob, `smartgreen_${activeDatasetFolder}_${today}.geojson`);
  };

  const handleDownloadAllGeoJson = async () => {
    const zip = new JSZip();
    for (const datasetId of PIPELINE_DATASETS) {
      const { metadata } = await localSpatialDataService.loadDatasetConfig(datasetId);
      const isRaster = metadata?.dataType === 'raster';
      
      if (isRaster) {
         const rasterData = await getClippedRaster(datasetId);
         if (rasterData) {
            const blob = await generateGeoTiffBlob(datasetId, rasterData);
            zip.file(`${datasetId}.tif`, blob);
         }
      } else {
         const blob = await getClippedGeoJsonBlob(datasetId);
         if (blob) {
           zip.file(`${datasetId}.geojson`, blob);
         }
      }
    }
    
    const summaryData = {
      target: context.target,
      results: pipelineResults
    };
    zip.file('analysis_summary.json', JSON.stringify(summaryData, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    saveAs(content, `SmartGreenStudio_Analysis_${today}.zip`);
  };

  // --------------------------------------------------------
  // PIPELINE VIEW (when not COMPLETED)
  // --------------------------------------------------------
  if (pipelineState !== 'COMPLETED') {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-canvas)] text-[var(--text-1)] w-full overflow-hidden p-6 items-center justify-center">
        <div className="max-w-2xl w-full bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl p-8 shadow-sm">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
              <Activity className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">공간 특성 종합 분석</h2>
            <p className="text-[var(--text-2)]">
              설정된 반경 {context.target.radius}m ({context.target.shapeType === 'circle' ? '원형' : '사각형'}) 영역을 기준으로 모든 공간 데이터를 분석합니다.
            </p>
          </div>

          {pipelineState === 'NEED_REANALYZE' && (
            <div className="mb-6 p-4 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">분석범위가 변경되었습니다.</p>
                <p className="text-sm">변경된 대상지에 맞춰 다시 분석을 실행해주세요.</p>
              </div>
            </div>
          )}

          {pipelineState === 'RUNNING' ? (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold">{analysisProgress || '현재 진행률'}</span>
                  <span className="font-bold text-[var(--accent)]">{pipelineProgress}%</span>
                </div>
                <div className="w-full bg-[var(--surface-2)] rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-[var(--accent)] h-full transition-all duration-300" 
                    style={{ width: `${pipelineProgress}%` }}
                  />
                </div>
              </div>

              <div className="bg-[var(--bg-canvas)] rounded border border-[var(--border-hair)] p-4">
                <div className="text-center mb-4">
                  <div className="text-lg font-black text-[var(--text-1)] mb-1">
                    {String(pipelineCurrentIndex + 1).padStart(2, '0')} / {PIPELINE_DATASETS.length}
                  </div>
                  <div className="text-sm font-bold text-[var(--accent)]">
                    {getCatalogItem(PIPELINE_DATASETS[pipelineCurrentIndex])?.nameKo || PIPELINE_DATASETS[pipelineCurrentIndex]}
                  </div>
                </div>
                
                {(() => {
                  const currStatus = pipelineStatus[PIPELINE_DATASETS[pipelineCurrentIndex]];
                  const isWait = currStatus === 'WAITING';
                  const isLoad = currStatus === 'LOADING';
                  const isClip = currStatus === 'CLIPPING';
                  const isCalc = currStatus === 'CALCULATING';
                  const isSave = currStatus === 'SAVING';
                  const isDone = currStatus === 'COMPLETED';
                  const isErr = currStatus === 'ERROR';
                  
                  const getMark = (active, completed) => {
                     if (completed) return <span className="text-emerald-500 font-bold">[✓]</span>;
                     if (active) return <span className="text-[var(--accent)] font-bold animate-pulse">[●]</span>;
                     return <span className="text-[var(--text-3)] font-mono">[ ]</span>;
                  };

                  return (
                    <div className="flex flex-col gap-1.5 text-sm text-[var(--text-2)] font-mono bg-[var(--surface-1)] p-4 rounded-lg border border-[var(--border-hair)]">
                       <div className="flex items-center gap-3">{getMark(isLoad, isClip || isCalc || isSave || isDone)} Loading</div>
                       <div className="flex items-center gap-3">{getMark(isClip, isCalc || isSave || isDone)} Clipping</div>
                       <div className="flex items-center gap-3">{getMark(isCalc, isSave || isDone)} Calculating</div>
                       <div className="flex items-center gap-3">{getMark(isSave, isDone)} Saving</div>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {PIPELINE_DATASETS.map((id) => {
                  const status = pipelineStatus[id];
                  const label = getCatalogItem(id)?.nameKo || id;
                  let icon = <span className="w-3 h-3 rounded-full bg-[var(--surface-3)]" />;
                  let textCls = 'text-[var(--text-3)]';
                  
                  if (status === 'COMPLETED') {
                    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
                    textCls = 'text-emerald-500';
                  } else if (status === 'ERROR') {
                    icon = <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
                    textCls = 'text-red-500';
                  } else if (status === 'LOADING' || status === 'CLIPPING' || status === 'CALCULATING' || status === 'SAVING') {
                    icon = <span className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse" />;
                    textCls = 'text-[var(--text-1)] font-bold';
                  }

                  return (
                    <div key={id} className={`flex items-center gap-2 text-xs ${textCls}`}>
                      {icon}
                      <span className="truncate">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  data-usage-action="cancel-analysis"
                  onClick={cancelPipeline}
                  className="px-6 py-2 rounded-full border border-[var(--border-hair)] text-[var(--text-2)] hover:text-red-400 hover:border-red-400/30 transition-colors text-sm"
                >
                  분석 취소
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                data-usage-action="run-analysis-main-btn"
                onClick={runAnalysisPipeline}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                공간 특성 종합 분석 실행
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // COMPLETED VIEW (Thematic Tabs)
  // --------------------------------------------------------
  
  const currentLstValue = (() => {
    const lstRes = pipelineResults['17_lst'];
    if (lstRes?.status === 'success' && lstRes.kpis) {
      // Find avg LST from KPI
      const kpi = lstRes.kpis.find(k => k.label.includes('평균'));
      if (kpi && typeof kpi.value === 'number') return kpi.value;
      if (kpi && typeof kpi.value === 'string' && kpi.value !== '-') return Number(kpi.value);
    }
    return null;
  })();

  const getThematicAnalysisResultFromPipeline = () => {
    if (!activeDatasetFolder) return null;
    return pipelineResults[activeDatasetFolder] as CommonSpatialAnalysisResult;
  };

  const currentAnalysisResult = getThematicAnalysisResultFromPipeline();

  const successCount = Object.values(pipelineResults).filter((r: any) => r.status === 'success').length;
  const errorCount = Object.values(pipelineResults).filter((r: any) => r.status === 'error').length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)] text-[var(--text-1)] w-full overflow-hidden">
      {/* Top KPI Ribbon (대상지 종합진단) */}
      <div className="p-4 border-b border-[var(--border-hair)] bg-[var(--surface-1)] shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">대상지 공간정량진단 (AnalysisZone 연동)</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-hair)] font-mono">
              반경 {context.target.radius}m ({context.target.shapeType === 'circle' ? '원형' : '사각형'})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-2)]">
              {successCount}개 완료 {errorCount > 0 && <span className="text-red-400">({errorCount}개 실패)</span>}
            </span>
            <button
              data-usage-action="all-data"
              onClick={handleDownloadAllGeoJson}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 rounded-full border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              전체 분석 다운로드
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3">
            <div className="label-ko mb-1 text-xs text-[var(--text-2)]">분석면적</div>
            <div className="metric text-xl text-[var(--accent)]">{context.target.area.toLocaleString()} ㎡</div>
          </div>
          <div className="card p-3">
            <div className="label-ko mb-1 text-xs text-[var(--text-2)]">녹지율</div>
            <div className="metric text-xl text-[var(--cat-1)]">
              {(() => {
                const parkRes = pipelineResults['23_park_green'];
                if (parkRes?.status === 'success' && parkRes.coverage) {
                  return `${parkRes.coverage.coverageRatio.toFixed(1)}%`;
                }
                return <span className="text-sm font-normal text-[var(--text-3)]">미분석</span>;
              })()}
            </div>
          </div>
          <div className="card p-3">
            <div className="label-ko mb-1 text-xs text-[var(--text-2)]">시가화율</div>
            <div className="metric text-xl text-[var(--warn)]">
              {(() => {
                const landcoverRes = pipelineResults['24_landcover_major'];
                if (landcoverRes?.status === 'success' && landcoverRes.distribution) {
                  const urbanMatch = landcoverRes.distribution.find(d => d.label.includes('시가화'));
                  return `${(urbanMatch?.ratio || 0).toFixed(1)}%`;
                }
                return <span className="text-sm font-normal text-[var(--text-3)]">미분석</span>;
              })()}
            </div>
          </div>
          <div className="card p-3 border-l-2 border-l-[var(--danger)]">
            <div className="flex items-center justify-between mb-1">
              <div className="label-ko text-xs text-[var(--text-2)]">평균 LST</div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                {currentLstValue === null ? '자료 없음' : 'REAL'}
              </span>
            </div>
            <div className="metric text-xl text-[var(--danger)] font-bold">{currentLstValue === null ? '자료 없음' : `${currentLstValue.toFixed(1)}°C`}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-hair)] px-4 pt-2 bg-[var(--surface-1)] shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            data-usage-action={'tab-' + tab}
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text-1)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Dataset Sub-Tabs (except for '종합') */}
        {activeTab !== '종합' && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-[var(--text-3)] mr-1">데이터셋:</span>
            {TAB_DATASETS[activeTab].map((folder) => {
              const catItem = catalog.find((c) => c.folder === folder);
              const label = catItem ? catItem.nameKo : folder.split('_').slice(1).join(' ');
              const isSelected = activeDatasetFolder === folder;
              const isLst = folder === '17_lst';

              return (
                <button
                  data-usage-action={'dataset-' + folder}
                  key={folder}
                  onClick={() => setActiveDatasetFolder(folder)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[#080B0F] border-[var(--accent)] font-bold shadow-sm'
                      : 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-hair)] hover:border-[var(--text-3)]'
                  }`}
                >
                  {isLst && <Flame className="w-3.5 h-3.5 text-red-500" />}
                  <span>{label}</span>
                  {isLst && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">REAL</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Thematic Analysis Map */}
        {activeTab !== '종합' && loadError && (
          <div className="w-full h-[420px] bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg flex items-center justify-center text-[var(--text-3)] text-sm">
            데이터를 불러올 수 없습니다.
          </div>
        )}
        {activeTab !== '종합' && !loadError && currentResult && currentResult.metadata && (
          <div className="relative">
            <ThematicAnalysisMap
              dataset={currentResult.metadata}
              geoJson={clippedGeoJson}
              rasterPreview={currentRasterPreview}
              style={currentResult.style}
              context={context}
              sourceMode={currentAnalysisResult?.sourceMode || currentResult.diagnostics.sourceMode}
              diagnostics={currentResult.diagnostics}
              onRendered={() => setIsRenderedOnMap(true)}
            />
            {((clippedGeoJson || currentRasterPreview) && !loadError) && (
              <button
                data-usage-action="single-data"
                onClick={handleDownloadSingleGeoJson}
                className="absolute top-4 right-4 z-[400] bg-[var(--surface-1)] border border-[var(--border-hair)] shadow-md rounded-full px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[var(--surface-2)] transition-colors text-[var(--text-1)]"
              >
                <Download className="w-3.5 h-3.5" />
                {currentResult?.metadata?.dataType === 'raster' ? '분석범위 GeoTIFF 다운로드' : 'GeoJSON 다운로드'}
              </button>
            )}
          </div>
        )}

        {/* Multi-Dimensional Thematic Quantitative Analytics Component */}
        {activeTab !== '종합' && currentResult && currentResult.metadata && currentAnalysisResult && (
          <div className="space-y-4 pt-2">
            {currentAnalysisResult?.diagnostics && (
              <div className="bg-[#1e1e1e] text-[#d4d4d4] text-[11px] p-3 rounded font-mono break-all mb-4 overflow-auto max-h-48 border border-[#333]">
                <div className="text-yellow-400 font-bold mb-1">=== 개발용 진단정보 ===</div>
                <div>Dataset: {currentAnalysisResult.diagnostics.datasetId}</div>
                <div>Status: {currentAnalysisResult.diagnostics.sourceMode} / {currentAnalysisResult.diagnostics.parseStatus}</div>
                <div>Geometry Type: {currentAnalysisResult.diagnostics.geometryType}</div>
                <div>Feature count before Clip: {currentAnalysisResult.diagnostics.featureCountBeforeClip ?? '-'}</div>
                <div>Feature count after Clip: {currentAnalysisResult.diagnostics.featureCountAfterClip ?? '-'}</div>
                <div>DN sample values: {JSON.stringify(currentAnalysisResult.diagnostics.dnSampleValues ?? [])}</div>
                {currentAnalysisResult.diagnostics.normalizedDnSample && <div>Normalized DN sample: {JSON.stringify(currentAnalysisResult.diagnostics.normalizedDnSample)}</div>}
                <div>Matched Features: {currentAnalysisResult.totalValidFeatures ?? 0}</div>
                <div>Unmatched Features: {Math.max(0, (currentAnalysisResult.diagnostics.featureCountAfterClip ?? 0) - (currentAnalysisResult.totalValidFeatures ?? 0))}</div>
                {currentAnalysisResult.diagnostics.fieldError && <div className="text-red-400">Error: {currentAnalysisResult.diagnostics.fieldError}</div>}
              </div>
            )}
            <ThematicAnalysisResult
              dataset={currentResult.metadata}
              analysisResult={currentAnalysisResult}
              style={currentResult.style}
              sourceMode={currentAnalysisResult.sourceMode}
            />
          </div>
        )}

        {activeTab === '종합' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">종합 분석 요약</h3>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              선택된 대상지 반경 {context.target.radius}m ({context.target.shapeType === 'circle' ? '원형' : '사각형'}) 내의
              토지이용, 녹지·생태, 도시환경 및 기후(LST)를 종합 분석한 결과입니다.
            </p>
            <div className="bg-[var(--surface-2)] rounded border border-[var(--border-hair)] p-4">
              <h4 className="font-bold mb-3">전체 처리 내역</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                {PIPELINE_DATASETS.map(id => {
                  const res = pipelineResults[id];
                  const label = getCatalogItem(id)?.nameKo || id;
                  return (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-[var(--text-2)]">{label}</span>
                      {res?.status === 'success' ? (
                        <span className="text-emerald-400 font-bold text-xs">완료</span>
                      ) : (
                        <span className="text-red-400 font-bold text-xs">처리 실패</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
