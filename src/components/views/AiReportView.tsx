
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnalysisContext, StudentAuthSession, CommonSpatialAnalysisResult, DatasetStyle } from '../../types';
import { Printer, Image as ImageIcon } from 'lucide-react';
import { loggerService } from '../../services/loggerService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getClippedGeoJson, getMapPreview } from '../../utils/indexedDbUtils';
import { localSpatialDataService } from '../../services/localSpatialDataService';
import { MiniReportMap } from './MiniReportMap';

interface AiReportViewProps {
  context: AnalysisContext;
  spatialAnalysisResults?: Record<string, CommonSpatialAnalysisResult & { status: string; errorMessage?: string; }>;
  onExportPdf: () => void;
  session?: StudentAuthSession | null;
}

const REPORT_BASEMAPS = [
  { id: 'osm', label: 'OSM Standard (기본)', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'carto-light', label: 'CARTO Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
  { id: 'carto-dark', label: 'CARTO Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { id: 'carto-voyager', label: 'CARTO Voyager', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' },
  { id: 'google-road', label: 'Google Road', url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}' },
  { id: 'google-sat', label: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' },
  { id: 'opentopo', label: 'OpenTopoMap', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' }
];

const BUILDING_DATASETS = ['01_buildings', '02_building_use', '03_completion_year', '04_highrise', '05_lowrise'];

export const AiReportView: React.FC<AiReportViewProps> = ({ context, spatialAnalysisResults, onExportPdf, session }) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportTarget, setExportTarget] = useState<'pdf' | 'zip' | null>(null);
  const [mapsReadyCount, setMapsReadyCount] = useState(0);
  const [exportProgress, setExportProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [selectedBasemap, setSelectedBasemap] = useState(REPORT_BASEMAPS[0].url);
  const [datasetData, setDatasetData] = useState<Record<string, { geoJson?: any, rasterPreview?: any, style?: DatasetStyle | null, metadata?: any }>>({});
  const [exportActiveSet, setExportActiveSet] = useState<Set<string>>(new Set());
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(new Set());
  const [pendingExportAction, setPendingExportAction] = useState<'pdf' | 'zip' | null>(null);
  
  const allDatasetIds = Object.keys(spatialAnalysisResults || {}).filter(k => spatialAnalysisResults![k].status === 'success');
  const renderDatasetIds: string[] = isExporting ? Array.from(selectedDatasetIds as Set<string>) : allDatasetIds;
  
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const mapImagesRef = useRef<Record<string, string>>({});
  const isGeneratingRef = useRef<boolean>(false);
  const completedExportIds = useRef(new Set<string>());

  useEffect(() => {
    async function loadData() {
      const data: Record<string, { geoJson?: any, rasterPreview?: any, style?: DatasetStyle | null, metadata?: any }> = {};
      for (const id of allDatasetIds) {
        try {
          const geoJson = await getClippedGeoJson(id);
          const rasterPreview = await getMapPreview(id);
          const { style, metadata } = await localSpatialDataService.loadDatasetConfig(id);
          data[id] = { geoJson, rasterPreview, style, metadata };
        } catch (err) {
          console.error(`Failed to load data for ${id}`, err);
        }
        
        // 브라우저 메인 스레드가 숨 쉴 틈을 만들어줌 (응답없음 방지)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      setDatasetData(data);
    }
    loadData();
  }, [allDatasetIds.join(',')]);

  const handleOpenModal = (action: 'pdf' | 'zip') => {
    setPendingExportAction(action);
    setIsModalOpen(true);
    const defaultSelection = new Set(allDatasetIds.filter(id => !BUILDING_DATASETS.includes(id)));
    setSelectedDatasetIds(defaultSelection);
  };

  const handleSelectAll = () => setSelectedDatasetIds(new Set(allDatasetIds));
  const handleDeselectAll = () => setSelectedDatasetIds(new Set());
  const handleSelectRecommended = () => setSelectedDatasetIds(new Set(allDatasetIds.filter(id => !BUILDING_DATASETS.includes(id))));

  const handleConfirmExport = () => {
    if (selectedDatasetIds.size === 0) return;
    completedExportIds.current.clear();
    setIsModalOpen(false);
    if (pendingExportAction === 'pdf') {
      handleDownloadPdf();
    } else {
      handleDownloadZip();
    }
  };

  const handleDownloadPdf = async () => {
    if (isExporting) return;
    if (!reportContainerRef.current) return;
    
    const targetIds = Array.from(selectedDatasetIds);
    setIsExporting(true);
    setExportTarget('pdf');
    setMapsReadyCount(0);
    setExportProgress({ current: 0, total: targetIds.length, message: "지도 렌더링 대기 중..." });
    mapImagesRef.current = {};
    isGeneratingRef.current = false;
    if (targetIds.length === 0) {
      isGeneratingRef.current = true;
      setTimeout(() => generatePdf(targetIds), 100);
    } else {
      setExportActiveSet(new Set([targetIds[0]]));
    }
  };

  const handleDownloadZip = async () => {
    if (isExporting) return;
    
    const targetIds = Array.from(selectedDatasetIds);
    setIsExporting(true);
    setExportTarget('zip');
    setMapsReadyCount(0);
    setExportProgress({ current: 0, total: targetIds.length, message: "지도 렌더링 대기 중..." });
    mapImagesRef.current = {};
    isGeneratingRef.current = false;
    if (targetIds.length === 0) {
      alert("다운로드할 지도가 없습니다.");
      setExportTarget(null);
      setIsExporting(false);
    } else {
      setExportActiveSet(new Set([targetIds[0]]));
    }
  };

  useEffect(() => {
    const targetIds = Array.from(selectedDatasetIds);
    if (exportTarget && targetIds.length > 0 && mapsReadyCount >= targetIds.length) {
      if (isGeneratingRef.current) return;
      isGeneratingRef.current = true;
      
      setTimeout(() => {
        if (exportTarget === 'pdf') {
          generatePdf(targetIds);
        } else if (exportTarget === 'zip') {
          generateZip(targetIds);
        }
      }, 500);
    }
  }, [exportTarget, mapsReadyCount, selectedDatasetIds]);

  const generateZip = async (targetIds: string[]) => {
    try {
      const zip = new JSZip();
      
      const today = new Date();
      const dateStr = today.getFullYear().toString() + 
                      (today.getMonth()+1).toString().padStart(2, '0') + 
                      today.getDate().toString().padStart(2, '0');

      let processed = 0;
      setExportProgress({ current: 0, total: targetIds.length, message: "이미지 압축 준비 중..." });

      for (const id of targetIds) {
        const dataUrl = mapImagesRef.current[id];
        if (!dataUrl) continue;
        
        const metadata = datasetData[id]?.metadata;
        const nameKo = metadata?.nameKo || id;
        
        // Remove special chars
        const safeName = nameKo.replace(/[^a-zA-Z0-9가-힣_-]/g, '');
        const filename = `${id}_${safeName}.png`;
        
        // Extract base64
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
           zip.file(filename, base64Data, { base64: true });
        }
        
        processed++;
        setExportProgress({ current: processed, total: targetIds.length, message: "이미지 압축 중..." });
        
        // 메인 스레드 블로킹 방지
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setExportProgress({ current: targetIds.length, total: targetIds.length, message: "ZIP 파일 생성 중..." });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `SmartGreenStudio_분석지도_${dateStr}.zip`);

    } catch (err) {
      console.error("ZIP 생성 오류", err);
      alert('지도 이미지 다운로드 중 오류가 발생했습니다.');
    } finally {
      setExportTarget(null);
      setMapsReadyCount(0);
      setExportProgress(null);
      setExportActiveSet(new Set());
      mapImagesRef.current = {};
      isGeneratingRef.current = false;
      setIsExporting(false);
    }
  };

  const generatePdf = async (targetIds: string[]) => {
    try {
      // 1. Create PDF
      let PDFClass: any = jsPDF;
      if (typeof PDFClass !== 'function') {
        PDFClass = (window as any).jspdf?.jsPDF || (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
      }
      if (!PDFClass) throw new Error("PDF 모듈을 초기화할 수 없습니다.");
      
      const pdf = new PDFClass('p', 'mm', 'a4', true);
      if (!pdf || typeof pdf.save !== 'function') {
        throw new Error("PDF 생성에 실패했습니다.");
      }
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);

      // 2. Cover page capture
      const coverEl = document.getElementById('report-cover-page');
      if (coverEl) {
        const coverCanvas = await html2canvas(coverEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1440,
          onclone: (doc) => { const el = doc.getElementById('report-cover-page'); if (el) { el.style.width = '1024px'; el.style.maxWidth = 'none'; el.querySelectorAll('h1,h2,h3,h4,th').forEach(h => (h as HTMLElement).style.setProperty('color', '#0f172a', 'important')); } },
          ignoreElements: (element: Element) => {
            return element.classList && element.classList.contains('no-print');
          }
        });
        const coverImg = coverCanvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(coverImg);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        pdf.addImage(coverImg, 'PNG', margin, margin, contentWidth, imgHeight, undefined, 'FAST');
      }

      // 3. Dataset pages
      let processed = 0;
      setExportProgress({ current: 0, total: targetIds.length, message: "PDF 캡처 준비 중..." });

      for (const id of targetIds) {
        const datasetEl = document.getElementById(`dataset-page-${id}`);
        if (!datasetEl) continue;

        const datasetCanvas = await html2canvas(datasetEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1440,
          onclone: (doc) => { const el = doc.getElementById(`dataset-page-${id}`); if (el) { el.style.width = '1024px'; el.style.maxWidth = 'none'; el.querySelectorAll('h1,h2,h3,h4,th').forEach(h => (h as HTMLElement).style.setProperty('color', '#0f172a', 'important')); } },
          ignoreElements: (element: Element) => {
            return element.classList && element.classList.contains('no-print');
          }
        });

        const datasetImg = datasetCanvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(datasetImg);
        // Keep one complete dataset on one A4 page, including the final table row.
        const fitScale = Math.min(contentWidth / imgProps.width, contentHeight / imgProps.height);
        const imageWidth = imgProps.width * fitScale;
        const imageHeight = imgProps.height * fitScale;
        pdf.addPage();
        pdf.addImage(datasetImg, 'PNG', margin + (contentWidth - imageWidth) / 2, margin, imageWidth, imageHeight, undefined, 'FAST');

        processed++;
        setExportProgress({ current: processed, total: targetIds.length, message: "PDF 페이지 캡처 중..." });
        
        // 메인 스레드 블로킹 방지
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setExportProgress({ current: targetIds.length, total: targetIds.length, message: "PDF 파일 저장 중..." });
      pdf.save(`[SmartGreenStudio]_${context.target.siteName || '미지정'}_그린인프라_분석리포트.pdf`);
    } catch (error) {
      console.error('PDF 다운로드 중 오류 발생:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setExportTarget(null);
      setMapsReadyCount(0);
      setExportProgress(null);
      setExportActiveSet(new Set());
      mapImagesRef.current = {};
      isGeneratingRef.current = false;
      setIsExporting(false);
    }
  };

  return (
    <div className="ai-report-root flex flex-col h-full bg-[#f8fafc] text-[#0f172a] w-full overflow-y-auto">
      <style>
        {`
          @media print {
            /* Reset all scrolling and height limitations on specific ancestors */
            html, body, #root, #root > div, #root > div > div, main {
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              position: static !important;
              width: 100% !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }

            .ai-report-root {
              height: auto !important;
              min-height: auto !important;
              overflow: visible !important;
              display: block !important;
            }

            /* Hide everything outside the report container explicitly rather than visibility: hidden */
            .sticky, .z-\\[1000\\], .z-40, .LeftPanel, .BottomDomainCards, .KpiRibbon, .no-print, nav, header {
              display: none !important;
            }
            
            .print-container {
              width: 1024px !important;
              max-width: 1024px !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: white !important;
              box-shadow: none !important;
              position: static !important;
            }

            .avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            
            .print-dark-text, .print-dark-text * {
              color: #1a1a1a !important;
            }

            .print-normal-text {
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
            }

            /* Un-absolute it if it's the only thing rendering to allow multi-page flow safely */
            @page { 
              size: A4 portrait;
              margin: 10mm; 
            }
            .page-break { page-break-before: always; }
          }
          
          /* Apply avoid-break for html2pdf rendering */
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .print-normal-text {
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
          }
        `}
      </style>

      {/* 다운로드 모달 */}
      {isModalOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="보고서 다운로드 항목 선택" className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="sgs-report-dialog bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                {pendingExportAction === 'pdf' ? 'PDF 다운로드' : '지도 이미지 다운로드'} 항목 선택
              </h3>
              <p className="text-sm text-slate-500 mt-1">다운로드에 포함할 분석 결과를 선택해주세요.</p>
            </div>
            
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-2 flex-wrap">
              <button 
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50"
              >
                전체 선택
              </button>
              <button 
                onClick={handleDeselectAll}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50"
              >
                전체 해제
              </button>
              <button 
                onClick={handleSelectRecommended}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium rounded hover:bg-indigo-100"
              >
                권장 선택
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {allDatasetIds.map(id => {
                const metadata = datasetData[id]?.metadata;
                const nameKo = metadata?.nameKo || id;
                return (
                  <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={selectedDatasetIds.has(id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedDatasetIds);
                        if (e.target.checked) newSet.add(id);
                        else newSet.delete(id);
                        setSelectedDatasetIds(newSet);
                      }}
                    />
                    <span className="text-slate-800 font-medium">
                      <span className="text-slate-400 text-xs mr-2">{id}</span>
                      {nameKo}
                    </span>
                  </label>
                );
              })}
              {allDatasetIds.length === 0 && (
                <div className="text-center text-slate-500 py-4">
                  분석 완료된 항목이 없습니다.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-xl">
              <div className="text-sm text-slate-600 font-medium">
                선택됨: <span className="text-indigo-600 font-bold">{selectedDatasetIds.size}</span> / {allDatasetIds.length}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsModalOpen(false); setPendingExportAction(null); }}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmExport}
                  disabled={selectedDatasetIds.size === 0}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedDatasetIds.size === 0 ? '항목을 선택해주세요' : '다운로드 시작'}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      <div ref={reportContainerRef} className="print-container p-8 max-w-5xl mx-auto w-full bg-white min-h-screen">
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8 no-print">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">공간분석 결과 보고서</h2>
            <p className="text-sm text-slate-500 mt-1">객관적 지표 및 공간분석 산출물 리포트</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 mr-2 no-print">
                <span className="text-xs font-bold text-slate-500">배경지도:</span>
                <select 
                  value={selectedBasemap} 
                  onChange={(e) => setSelectedBasemap(e.target.value)}
                  className="text-sm border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {REPORT_BASEMAPS.map(map => (
                    <option key={map.id} value={map.url}>{map.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleOpenModal('zip')}
                disabled={isExporting || exportTarget !== null}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4" />
                {exportTarget === 'zip' ? '이미지 생성중...' : '지도 이미지 다운로드'}
              </button>
              <button
                onClick={() => handleOpenModal('pdf')}
                disabled={isExporting || exportTarget !== null}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {exportTarget === 'pdf' ? 'PDF 생성중...' : 'PDF 다운로드'}
              </button>
            </div>
            {(isExporting || exportProgress) && (
              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full shadow-sm animate-pulse border border-indigo-100 no-print">
                {exportProgress ? `${exportProgress.message} ${exportProgress.total > 0 ? Math.round((exportProgress.current / exportProgress.total) * 100) : 0}%` : 
                 (exportTarget ? `지도 렌더링 대기 중... (${mapsReadyCount}/${selectedDatasetIds.size})` : '처리 중...')}
              </div>
            )}
          </div>
        </div>

        {/* Cover Page */}
        <div id="report-cover-page" className="pt-24 pb-12 mb-8 flex flex-col justify-between min-h-[500px]">
          <div>
            <h1 className="text-4xl font-bold text-center text-slate-900 mb-12">공간분석 결과 보고서</h1>
            <div className="max-w-md mx-auto bg-slate-50 p-8 rounded-xl border border-slate-200 shadow-sm space-y-6 w-full">
              <h3 className="text-xl font-bold border-b border-slate-200 pb-3 print-dark-text">대상지 기본정보</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-base print-dark-text">
                <div className="text-slate-500 print-dark-text">대상지명</div>
                <div className="font-semibold text-right print-dark-text">{context.target.siteName || '-'}</div>
                <div className="text-slate-500 print-dark-text">분석 반경</div>
                <div className="font-semibold text-right print-dark-text">{context.target.radius}m</div>
                <div className="text-slate-500 print-dark-text">주소</div>
                <div className="font-semibold text-right print-dark-text">{context.target.address || '-'}</div>
                <div className="text-slate-500 print-dark-text">중심 좌표</div>
                <div className="font-semibold text-right print-dark-text">{context.target.lat.toFixed(5)}, {context.target.lng.toFixed(5)}</div>
              </div>
            </div>
          </div>
          <div className="text-center mt-24 text-xs text-slate-400">
            지도 데이터 &copy; OpenStreetMap contributors
          </div>
        </div>

        {/* Dataset Pages */}
        {renderDatasetIds.map(id => {
          const result = spatialAnalysisResults![id];
          const data = datasetData[id];
          
          return (
            <React.Fragment key={id}>
              <div id={`dataset-page-${id}`} className="pt-8 pb-8 space-y-6">
                <div className="avoid-break space-y-6">
                  <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-end">
                    <h2 className="text-2xl font-bold text-slate-900 print-dark-text">{id}</h2>
                    {result.coverage?.coverageRatio !== undefined && (
                      <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded">
                        Coverage: {result.coverage?.coverageRatio.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Visuals */}
                    <div className="space-y-4">
                      <div 
                        ref={el => { pageRefs.current[id] = el; }}
                        className="w-full aspect-[4/3] bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center relative overflow-hidden shadow-sm"
                      >
                        {data ? (
                          <MiniReportMap
                            datasetId={id}
                            geoJson={data.geoJson}
                            rasterBlob={data.rasterPreview?.blob}
                            bbox={data.rasterPreview?.bbox}
                            style={data.style}
                            basemapUrl={selectedBasemap}
                            targetGeometry={context.target.geometry}
                            isExporting={exportTarget !== null && exportActiveSet.has(id)}
                            onReadyForExport={(datasetId, dataUrl) => {
                              if (completedExportIds.current.has(datasetId)) return;
                              completedExportIds.current.add(datasetId);
                              if (dataUrl) {
                                mapImagesRef.current[datasetId] = dataUrl;
                              }
                              
                              setMapsReadyCount(prev => {
                                const newCount = prev + 1;
                                // Start the next one
                                if (newCount < renderDatasetIds.length) {
                                  setExportActiveSet(prevSet => {
                                    const nextSet = new Set(prevSet);
                                    nextSet.add(renderDatasetIds[newCount]);
                                    return nextSet;
                                  });
                                }
                                return newCount;
                              });
                            }}
                          />
                        ) : (
                          <span className="text-slate-400 font-medium text-sm">지도 로딩 중...</span>
                        )}
                      </div>
                      
                      {result.distribution && result.distribution.length > 0 && (
                        <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                          <h4 className="text-sm font-bold text-slate-800 mb-3 border-b pb-2 print-dark-text">범례</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                            {result.distribution.slice(0,12).map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm border border-slate-200" style={{ backgroundColor: d.color || '#cbd5e1' }}></span>
                                <span className="text-slate-700 font-medium print-dark-text">{d.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quantitative Data (KPIs only inside avoid-break) */}
                    <div className="space-y-6">
                      {result.kpis && result.kpis.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-base font-bold text-slate-800 print-dark-text">주요 지표 (KPI)</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {result.kpis.map((kpi, i) => (
                              <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                <span className="text-sm text-slate-600 font-medium print-dark-text">{kpi.label}</span>
                                <span className="text-base font-bold text-slate-900 print-dark-text">{kpi.value} <span className="text-xs text-slate-500">{kpi.unit}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Distribution Table (allowed to break pages) */}
                {result.distribution && result.distribution.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-base font-bold text-slate-800 print-dark-text">분포 현황</h4>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 border-b border-slate-200" style={{ display: 'table-header-group' }}>
                          <tr>
                            <th className="p-3 font-bold text-slate-800 print-dark-text">구분</th>
                            <th className="p-3 font-bold text-slate-800 text-right print-dark-text">수치</th>
                            <th className="p-3 font-bold text-slate-800 text-right print-dark-text">비율</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.distribution.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-50 avoid-break">
                              <td className="p-3 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 flex-shrink-0 rounded-full border border-slate-200" style={{ backgroundColor: d.color || '#cbd5e1' }}></span>
                                <span className={`text-slate-800 font-medium print-dark-text ${exportTarget === 'pdf' ? 'print-normal-text' : 'truncate'}`}>{d.label}</span>
                              </td>
                              <td className="p-3 text-right font-mono text-slate-700 print-dark-text">
                                {d.amountFormatted || `${typeof d.amount === 'number' ? d.amount.toLocaleString() : d.amount} ${d.unit || ''}`}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900 print-dark-text">
                                {d.ratio.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
