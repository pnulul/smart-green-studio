import React, { useState, useRef } from 'react';
import {
  Download,
  Search,
  Layers,
  MapPin,
  Check,
  RefreshCw,
  FileImage,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { SiteAnalysisData, RadiusOption } from '../../types';
import { generateMockBuildingGis, generateMockLandParcelGis } from '../../data/mockGisData';
import { SiteNewsFeed } from '../SiteNewsFeed';

interface SiteInventoryViewProps {
  data: SiteAnalysisData;
  radius: RadiusOption;
  onChangeRadius: (r: RadiusOption) => void;
  onOpenAnalysisModal?: () => void;
}

type MainCategory = 'overview' | 'human_env' | 'physical_env';
type HumanSubTab = 'news' | 'demographics' | 'industry';
type PhysicalSubTab = 'buildings' | 'parcels' | 'transport' | 'green_infra' | 'poi';

// Diagram Download Helper (Exports SVG to high-res PNG or SVG)
const handleDownloadSvgDiagram = (svgElementId: string, filename: string) => {
  const svg = document.getElementById(svgElementId);
  if (!svg) {
    alert('다이어그램 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 700;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#080B0F';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${filename}.png`;
        downloadLink.href = pngUrl;
        downloadLink.click();
      }
      URL.revokeObjectURL(blobURL);
    };
    image.onerror = () => {
      // Fallback: download as SVG
      const downloadLink = document.createElement('a');
      downloadLink.download = `${filename}.svg`;
      downloadLink.href = blobURL;
      downloadLink.click();
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  } catch (err) {
    console.error('Diagram export error:', err);
    alert('다이어그램 다운로드 중 오류가 발생했습니다.');
  }
};

export const SiteInventoryView: React.FC<SiteInventoryViewProps> = ({
  data,
  radius,
  onChangeRadius,
}) => {
  const [mainCategory, setMainCategory] = useState<MainCategory>('overview');
  const [humanSubTab, setHumanSubTab] = useState<HumanSubTab>('news');
  const [physicalSubTab, setPhysicalSubTab] = useState<PhysicalSubTab>('buildings');

  // Diagram Generation state for interactive demo diagram
  const [generatedDiagrams, setGeneratedDiagrams] = useState<{ [key: string]: boolean }>({
    buildings: true,
    parcels: true,
    transport: true,
    green_infra: true,
    poi: true,
    demographics: true,
    industry: true,
  });

  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const trees = data.treesData;
  const ped = data.pedestrianData;
  const kpi = data.kpi;
  const bldGis = data.buildingGis || generateMockBuildingGis(data.lat, data.lng, data.siteName);
  const parcelGis = data.parcelGis || generateMockLandParcelGis(data.lat, data.lng, data.siteName);

  const handleGenerateDiagram = (key: string) => {
    setGeneratedDiagrams((prev) => ({ ...prev, [key]: true }));
  };

  const triggerDownload = (elementId: string, name: string) => {
    handleDownloadSvgDiagram(elementId, `${data.siteName}_${name}_다이어그램`);
    setDownloadSuccess(elementId);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  return (
    <div className="space-y-6 text-[var(--text-1)] animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--surface-2)] text-[var(--text-2)] text-xs font-medium border border-[var(--border-hair)] mb-2">
            <span>01 현황 진단</span>
            <span>·</span>
            <span>공간 인벤토리 및 GIS 분석</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-1)] flex items-center gap-2">
            <span>{data.siteName}</span>
            <span className="text-xs font-normal text-[var(--text-3)]">인벤토리 종합 진단 및 환경 분석</span>
          </h2>
          <p className="text-xs text-[var(--text-2)] mt-1 max-w-2xl">
            종합 공간 진단, 인문환경분석(언론·인구·산업), 물리적환경분석(건축물·토지·교통·그린인프라·POI) 데이터와 다이어그램을 생성합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-[var(--surface-1)] rounded-xl p-1 border border-[var(--border-hair)] flex items-center gap-1">
            <span className="text-xs text-[var(--text-3)] px-2 font-medium">분석 반경:</span>
            {([250, 500, 1000, 1500, 2000] as RadiusOption[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeRadius(r)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  radius === r
                    ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Hierarchy 3-Group Tab Selector */}
      <div className="border-b border-[var(--border-hair)] pb-3 space-y-2.5">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {/* Group 1: 종합 공간진단 */}
          <button
            type="button"
            onClick={() => setMainCategory('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              mainCategory === 'overview'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
          >
            <span>종합 공간진단</span>
          </button>

          {/* Group 2: 인문환경분석 */}
          <button
            type="button"
            onClick={() => setMainCategory('human_env')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              mainCategory === 'human_env'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
          >
            <span>인문환경분석</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-hair)]">
              언론·인구·산업
            </span>
          </button>

          {/* Group 3: 물리적환경분석 */}
          <button
            type="button"
            onClick={() => setMainCategory('physical_env')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              mainCategory === 'physical_env'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
          >
            <span>물리적환경분석</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-hair)]">
              건축·토지·교통·그린·POI
            </span>
          </button>
        </div>

        {/* Sub-level 2: Nested Sub-Tab Row */}
        {mainCategory === 'human_env' && (
          <div className="flex items-center gap-1.5 pl-1 pt-1 overflow-x-auto custom-scrollbar animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-[var(--text-3)] mr-1">인문 세부:</span>
            <button
              type="button"
              onClick={() => setHumanSubTab('news')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                humanSubTab === 'news'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              대상지 언론·뉴스 모니터링
            </button>
            <button
              type="button"
              onClick={() => setHumanSubTab('demographics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                humanSubTab === 'demographics'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              인구분석
            </button>
            <button
              type="button"
              onClick={() => setHumanSubTab('industry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                humanSubTab === 'industry'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              산업분석
            </button>
          </div>
        )}

        {mainCategory === 'physical_env' && (
          <div className="flex items-center gap-1.5 pl-1 pt-1 overflow-x-auto custom-scrollbar animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-[var(--text-3)] mr-1">물리 세부:</span>
            <button
              type="button"
              onClick={() => setPhysicalSubTab('buildings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                physicalSubTab === 'buildings'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              건축물 인벤토리
            </button>
            <button
              type="button"
              onClick={() => setPhysicalSubTab('parcels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                physicalSubTab === 'parcels'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              토지 인벤토리
            </button>
            <button
              type="button"
              onClick={() => setPhysicalSubTab('transport')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                physicalSubTab === 'transport'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              교통
            </button>
            <button
              type="button"
              onClick={() => setPhysicalSubTab('green_infra')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                physicalSubTab === 'green_infra'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              그린 인프라
            </button>
            <button
              type="button"
              onClick={() => setPhysicalSubTab('poi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                physicalSubTab === 'poi'
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-bold'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              POI 분석
            </button>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. 종합 공간진단 (Overview) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mainCategory === 'overview' && (
        <div className="space-y-6">
          {/* Tree & Pedestrian Deep Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Tree Canopy & Ecological Structure */}
            <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hair)] mb-4">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-sm">수목 현황 및 수관(Canopy) 피복률</h3>
                  <p className="text-xs text-[var(--text-3)]">OSM 식생 데이터 및 식재 구조 분석</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)]">
                  수관피복 {trees?.canopyCoverageRatio ?? (kpi.greenRatio * 0.75).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">총 수목 개체수</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {(trees?.totalTreesCount ?? 184).toLocaleString()}주
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">ha당 {trees?.treeDensityPerHectare ?? 38}본</div>
                </div>
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">연간 탄소흡수량</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {trees?.carbonSequestrationTonsPerYear ?? kpi.carbonAbsorptionTons} tCO2
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">온실가스 상쇄</div>
                </div>
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">그늘 형성 보행로</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {trees?.shadedWalkwayRatio ?? 48}%
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">일사 차단율</div>
                </div>
              </div>

              {/* Species Distribution List */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-[var(--text-2)]">권역 내 주요 수종 분포:</div>
                <div className="space-y-1.5">
                  {(trees?.speciesBreakdown || [
                    { species: '느티나무 (Zelkova)', ratio: 32, tag: '대형수관' },
                    { species: '이팝나무 (Chionanthus)', ratio: 24, tag: '백색꽃·가로수' },
                    { species: '왕벚나무 (Prunus)', ratio: 20, tag: '경관개선' },
                    { species: '은행나무 (Ginkgo)', ratio: 14, tag: '공해정화' },
                  ]).map((sp, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-2)] font-medium">{sp.species}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[var(--accent)] h-full rounded-full"
                            style={{ width: `${sp.ratio}%` }}
                          />
                        </div>
                        <span className="text-[var(--accent)] font-medium w-8 text-right">{sp.ratio}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Pedestrian Network & Walkability */}
            <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] transition-colors">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hair)] mb-4">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-sm">보행로 네트워크 및 보행환경 평가</h3>
                  <p className="text-xs text-[var(--text-3)]">보행로 및 인도망 세부 속성</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)]">
                  보행친화도 {ped?.walkabilityScore ?? 84}점
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">총 보행로 연장</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {((ped?.totalFootwayLengthM ?? 4200) / 1000).toFixed(1)} km
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">인도망 포함</div>
                </div>
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">보차분리율</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {ped?.sidewalkRatio ?? 68}%
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">안전 보행로</div>
                </div>
                <div className="bg-[var(--surface-1)] rounded-xl p-3 border border-[var(--border-hair)]">
                  <div className="text-[11px] text-[var(--text-3)]">그늘 보행 연장</div>
                  <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                    {((ped?.shadedPathLengthM ?? 1950) / 1000).toFixed(1)} km
                  </div>
                  <div className="text-[10px] text-[var(--text-2)] font-medium">가로수 터널</div>
                </div>
              </div>

              <div className="bg-[var(--surface-1)] rounded-xl p-3.5 border border-[var(--border-hair)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-3)]">보행자 안전 지수:</span>
                  <span className="font-bold text-[var(--text-1)]">{ped?.pedestrianSafetyIndex ?? 78} / 100점</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-3)]">무장애(Barrier-Free) 휠체어 접근성:</span>
                  <span className="font-medium text-[var(--accent)]">82% 양호</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-3)]">보행 쿨링 개선 권장:</span>
                  <span className="font-medium text-[var(--text-1)]">남북축 통학로 2.4km 구간 수목 보식</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Domain Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Domain 1: 도시계획 & 건축 */}
            <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] space-y-3">
              <div className="pb-2 border-b border-[var(--border-hair)]">
                <h4 className="font-bold text-[var(--text-1)] text-sm">도시계획 및 건축 현황</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">용도지역:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.urban?.zoningName || '제2종일반주거지역'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">용적률 / 건폐율:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.urban?.floorAreaRatio || 220}% / {data.urban?.buildingCoverageRatio || 58}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">법정 조경 의무:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.urban?.legalGreenMandate || '대지면적의 15%'}</span>
                </div>
              </div>
            </div>

            {/* Domain 2: 조경 및 경관 */}
            <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] space-y-3">
              <div className="pb-2 border-b border-[var(--border-hair)]">
                <h4 className="font-bold text-[var(--text-1)] text-sm">조경 및 경관 축 분석</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">경관 지구:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.landscape?.landscapeZoneName || '자연경관 관리지구'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">통경축 확보:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.landscape?.viewCorridor || '금정산 조망 통경축 양호'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">1인당 공원면적:</span>
                  <span className="font-medium text-[var(--accent)]">{data.socioEconomic?.parkAreaPerCapita || '5.2 ㎡/인'}</span>
                </div>
              </div>
            </div>

            {/* Domain 3: 인구 및 사회경제 */}
            <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] space-y-3">
              <div className="pb-2 border-b border-[var(--border-hair)]">
                <h4 className="font-bold text-[var(--text-1)] text-sm">인구 및 기후 취약성</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">권역 인구수:</span>
                  <span className="font-medium text-[var(--text-1)]">{(data.demographic?.totalPop || 42800).toLocaleString()}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">고령화율:</span>
                  <span className="font-medium text-[var(--text-1)]">{data.demographic?.agingRatio || 21.4}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-3)]">열섬 취약등급:</span>
                  <span className="font-bold text-[var(--warn)]">위험도 {kpi.heatRiskIndex} / 5등급</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. 인문환경분석 (Human Environment) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mainCategory === 'human_env' && (
        <div className="space-y-6">
          {/* SubTab 2-1: News Monitoring */}
          {humanSubTab === 'news' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">대상지 언론·뉴스 모니터링</h3>
                  <p className="text-xs text-[var(--text-3)]">대상지 및 인근 지역의 최신 도시재생·환경·공원 뉴스</p>
                </div>
              </div>
              <SiteNewsFeed data={data} siteName={data.siteName} address={data.address} />
            </div>
          )}

          {/* SubTab 2-2: Demographics */}
          {humanSubTab === 'demographics' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">인구 구조 및 사회적 취약성 분석</h3>
                  <p className="text-xs text-[var(--text-3)]">연령별 인구 분포, 고령자·유소년 밀집도, 세대 유형</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('demographics')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('demographics-diagram-svg', '인구분석')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'demographics-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 거주인구</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">{(data.demographic?.totalPop || 42800).toLocaleString()}명</div>
                  <span className="text-[10px] text-[var(--text-2)]">인구밀도 14,200명/㎢</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">고령인구 비율(65세+)</span>
                  <div className="text-lg font-bold text-[var(--warn)] mt-0.5">{data.demographic?.agingRatio || 21.4}%</div>
                  <span className="text-[10px] text-[var(--text-2)]">초고령사회 진입</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">유소년 비율(0-14세)</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">미산출</div>
                  <span className="text-[10px] text-[var(--text-2)]">통학로 쉼터 필요</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">1인 가구 비율</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">38.2%</div>
                  <span className="text-[10px] text-[var(--text-2)]">청년·노인 단독세대</span>
                </div>
              </div>

              {/* Interactive Vector Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-2)] flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-[var(--accent)]" />
                    <span>인구 연령 분포 & 취약성 지도 다이어그램</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-3)]">Scale 1:5,000 / UTM-K GIS 좌표계</span>
                </div>

                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="demographics-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Grid Lines */}
                    <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
                      {[100, 200, 300, 400, 500, 600, 700].map((x) => (
                        <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="420" />
                      ))}
                      {[80, 160, 240, 320, 400].map((y) => (
                        <line key={`y-${y}`} x1="0" y1={y} x2="800" y2={y} />
                      ))}
                    </g>
                    {/* Buffer boundary */}
                    <circle cx="400" cy="210" r="160" fill="none" stroke="#35C6E8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                    <circle cx="400" cy="210" r="100" fill="#35C6E8" fillOpacity="0.05" stroke="#35C6E8" strokeWidth="1" opacity="0.6" />
                    {/* Demographic Hex / Block Polygons */}
                    <polygon points="340,160 400,130 460,160 460,230 400,260 340,230" fill="#35C6E8" fillOpacity="0.25" stroke="#35C6E8" strokeWidth="1.5" />
                    <polygon points="260,200 320,170 380,200 380,270 320,300 260,270" fill="#E9743A" fillOpacity="0.2" stroke="#E9743A" strokeWidth="1" />
                    <polygon points="420,200 480,170 540,200 540,270 480,300 420,270" fill="#35C6E8" fillOpacity="0.15" stroke="#35C6E8" strokeWidth="1" />
                    <polygon points="340,270 400,240 460,270 460,340 400,370 340,340" fill="#35C6E8" fillOpacity="0.12" stroke="#35C6E8" strokeWidth="1" />
                    {/* Center Pin */}
                    <circle cx="400" cy="210" r="5" fill="#35C6E8" />
                    <circle cx="400" cy="210" r="9" fill="none" stroke="#35C6E8" strokeWidth="1.5" />
                    {/* Labels & Annotations */}
                    <text x="400" y="200" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">{data.siteName}</text>
                    <text x="320" y="240" fill="#E9743A" fontSize="10" fontWeight="bold" textAnchor="middle">고령자 밀집권역 (24.8%)</text>
                    <text x="480" y="240" fill="#35C6E8" fontSize="10" fontWeight="bold" textAnchor="middle">청년·학생권역 (36.2%)</text>
                    {/* Title Block & North Arrow */}
                    <text x="30" y="40" fill="#35C6E8" fontSize="13" fontWeight="bold">인구사회 및 취약계층 분포 다이어그램</text>
                    <text x="30" y="60" fill="#93A0AC" fontSize="10">{data.siteName} | R={radius}m | SGS 인구통계</text>
                    <g transform="translate(740, 40)">
                      <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" />
                      <polygon points="0,-10 -5,4 0,0 5,4" fill="#35C6E8" />
                      <text x="0" y="10" fill="#E8EDF2" fontSize="8" fontWeight="bold" textAnchor="middle">N</text>
                    </g>
                    {/* Legend */}
                    <g transform="translate(30, 360)">
                      <rect x="0" y="0" width="12" height="12" fill="#E9743A" fillOpacity="0.6" />
                      <text x="18" y="10" fill="#93A0AC" fontSize="10">고령 취약구역 (65세+)</text>
                      <rect x="150" y="0" width="12" height="12" fill="#35C6E8" fillOpacity="0.6" />
                      <text x="168" y="10" fill="#93A0AC" fontSize="10">청년·생산가능인구</text>
                      <circle cx="310" cy="6" r="4" fill="#35C6E8" />
                      <text x="320" y="10" fill="#93A0AC" fontSize="10">분석 중심지</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 2-3: Industry */}
          {humanSubTab === 'industry' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">산업·상권 및 업종별 사업체 분석</h3>
                  <p className="text-xs text-[var(--text-3)]">근린상권 활성도, 주요 업종별 비중, 종사자 밀집 구역</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('industry')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('industry-diagram-svg', '산업분석')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'industry-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 사업체수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">3,420개소</div>
                  <span className="text-[10px] text-[var(--text-2)]">상권 밀집도 우수</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">음식·소매 비중</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">48.5%</div>
                  <span className="text-[10px] text-[var(--text-2)]">유동인구 집중</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">교육·서비스 비중</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">26.8%</div>
                  <span className="text-[10px] text-[var(--text-2)]">학원·연구시설</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 종사자수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">18,600명</div>
                  <span className="text-[10px] text-[var(--text-2)]">주간 활동인구</span>
                </div>
              </div>

              {/* Vector Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="industry-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Commercial Corridor Path */}
                    <path d="M 200 350 Q 380 260 400 210 T 600 80" fill="none" stroke="#35C6E8" strokeWidth="18" strokeOpacity="0.15" strokeLinecap="round" />
                    <path d="M 200 350 Q 380 260 400 210 T 600 80" fill="none" stroke="#35C6E8" strokeWidth="2" strokeDasharray="6 4" />
                    {/* Secondary Commercial Cluster */}
                    <circle cx="340" cy="240" r="55" fill="#35C6E8" fillOpacity="0.18" stroke="#35C6E8" strokeWidth="1.5" />
                    <circle cx="480" cy="170" r="45" fill="#35C6E8" fillOpacity="0.12" stroke="#35C6E8" strokeWidth="1" />
                    {/* Hotspot Circles */}
                    <circle cx="400" cy="210" r="6" fill="#35C6E8" />
                    <text x="400" y="195" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">{data.siteName} 메인상권</text>
                    <text x="340" y="245" fill="#35C6E8" fontSize="10" textAnchor="middle">대학로 카페·요식거리</text>
                    <text x="480" y="175" fill="#93A0AC" fontSize="10" textAnchor="middle">학원·업무클러스터</text>
                    {/* North & Scale */}
                    <text x="30" y="40" fill="#35C6E8" fontSize="13" fontWeight="bold">상권 및 주요 산업클러스터 다이어그램</text>
                    <text x="30" y="60" fill="#93A0AC" fontSize="10">상권 활성화 지수 및 상업 가로망 분석</text>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. 물리적환경분석 (Physical Environment) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mainCategory === 'physical_env' && (
        <div className="space-y-6">
          {/* SubTab 3-1: 건축물 인벤토리 (Buildings) */}
          {physicalSubTab === 'buildings' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">건축물 인벤토리 (용도·노후도·층수)</h3>
                  <p className="text-xs text-[var(--text-3)]">건물 용도별 분류, 준공연도 기준 노후도(30년 이상), 층수 및 구조</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('buildings')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('buildings-diagram-svg', '건축물_인벤토리')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'buildings-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 건축물 수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">{bldGis.totalBuildingsCount}동</div>
                  <span className="text-[10px] text-[var(--text-2)]">평균 {bldGis.buildingsList.length ? (bldGis.buildingsList.reduce((n, b) => n + b.floors, 0) / bldGis.buildingsList.length).toFixed(1) : '-'}층 규모</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">30년 이상 노후 건물</span>
                  <div className="text-lg font-bold text-[var(--warn)] mt-0.5">24.5% (46동)</div>
                  <span className="text-[10px] text-[var(--text-2)]">벽면/단열 개선 필요</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">주요 구조</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">RC 구조 (72%)</div>
                  <span className="text-[10px] text-[var(--text-2)]">철골/SRC (18%)</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">평균 건폐율 / 용적률</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">54% / 210%</div>
                  <span className="text-[10px] text-[var(--text-2)]">고밀 도심주거</span>
                </div>
              </div>

              {/* Architecture Vector Map Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-2)] flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-[var(--accent)]" />
                    <span>건축 지도 다이어그램 (용도별 & 노후도)</span>
                  </span>
                  <span className="text-[10px] text-[var(--text-3)]">Vector GIS Architecture Plan</span>
                </div>

                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="buildings-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Roads grid */}
                    <g stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round">
                      <line x1="80" y1="120" x2="720" y2="120" />
                      <line x1="80" y1="260" x2="720" y2="260" />
                      <line x1="240" y1="40" x2="240" y2="380" />
                      <line x1="520" y1="40" x2="520" y2="380" />
                    </g>
                    {/* Building Blocks */}
                    {/* Commercial / Public */}
                    <rect x="120" y="60" width="90" height="45" fill="#35C6E8" fillOpacity="0.4" stroke="#35C6E8" strokeWidth="1" rx="2" />
                    <rect x="270" y="60" width="110" height="45" fill="#35C6E8" fillOpacity="0.3" stroke="#35C6E8" strokeWidth="1" rx="2" />
                    <rect x="400" y="60" width="100" height="45" fill="#35C6E8" fillOpacity="0.25" stroke="#35C6E8" strokeWidth="1" rx="2" />
                    <rect x="550" y="60" width="120" height="45" fill="#35C6E8" fillOpacity="0.2" stroke="#35C6E8" strokeWidth="1" rx="2" />
                    {/* Center Core Blocks */}
                    <rect x="260" y="150" width="110" height="90" fill="#35C6E8" fillOpacity="0.65" stroke="#35C6E8" strokeWidth="1.5" rx="3" />
                    <rect x="390" y="150" width="110" height="90" fill="#35C6E8" fillOpacity="0.5" stroke="#35C6E8" strokeWidth="1.5" rx="3" />
                    {/* Old Buildings (Warn color) */}
                    <rect x="120" y="150" width="90" height="90" fill="#E9743A" fillOpacity="0.35" stroke="#E9743A" strokeWidth="1.5" rx="2" />
                    <rect x="550" y="150" width="120" height="90" fill="#E9743A" fillOpacity="0.25" stroke="#E9743A" strokeWidth="1" rx="2" />
                    {/* Lower Blocks */}
                    <rect x="120" y="290" width="90" height="70" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="2" />
                    <rect x="270" y="290" width="220" height="70" fill="#35C6E8" fillOpacity="0.25" stroke="#35C6E8" strokeWidth="1" rx="2" />
                    <rect x="550" y="290" width="120" height="70" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="2" />
                    {/* Labels */}
                    <text x="315" y="200" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">중앙 연구동 (8F)</text>
                    <text x="445" y="200" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">학생회관 (6F)</text>
                    <text x="165" y="200" fill="#E9743A" fontSize="10" fontWeight="bold" textAnchor="middle">노후상가 (30년+)</text>
                    <text x="610" y="200" fill="#E9743A" fontSize="10" fontWeight="bold" textAnchor="middle">노후주택군</text>
                    {/* Title & Legend */}
                    <text x="30" y="35" fill="#35C6E8" fontSize="13" fontWeight="bold">건축물 용도 및 노후도 지도 다이어그램</text>
                    <g transform="translate(30, 395)">
                      <rect x="0" y="0" width="12" height="12" fill="#35C6E8" fillOpacity="0.65" />
                      <text x="18" y="10" fill="#93A0AC" fontSize="10">교육·공공시설</text>
                      <rect x="130" y="0" width="12" height="12" fill="#35C6E8" fillOpacity="0.3" />
                      <text x="148" y="10" fill="#93A0AC" fontSize="10">일반 상업·업무</text>
                      <rect x="260" y="0" width="12" height="12" fill="#E9743A" fillOpacity="0.6" />
                      <text x="278" y="10" fill="#93A0AC" fontSize="10">30년 이상 노후건축물</text>
                    </g>
                    <g transform="translate(740, 35)">
                      <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" />
                      <polygon points="0,-10 -5,4 0,0 5,4" fill="#35C6E8" />
                      <text x="0" y="10" fill="#E8EDF2" fontSize="8" fontWeight="bold" textAnchor="middle">N</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3-2: 토지 인벤토리 (Parcels) */}
          {physicalSubTab === 'parcels' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">토지 인벤토리 (용도지역·필지 구획·소유)</h3>
                  <p className="text-xs text-[var(--text-3)]">용도지역 구분(주거/상업/녹지), 필지 지목(대/도/공/잡), 국공유지 연계</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('parcels')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('parcels-diagram-svg', '토지_인벤토리')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'parcels-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 필지 수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">{parcelGis.totalParcelsCount}개 필지</div>
                  <span className="text-[10px] text-[var(--text-2)]">평균 면적 {parcelGis.totalParcelsCount ? Math.round(parcelGis.totalAreaM2 / parcelGis.totalParcelsCount).toLocaleString() : '-'}㎡</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">국공유지 비율</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">{parcelGis.publicOwnedRatioPct}%</div>
                  <span className="text-[10px] text-[var(--text-2)]">그린인프라 우선 부지</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">주요 지목 비율</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">대지(58%) / 도(24%)</div>
                  <span className="text-[10px] text-[var(--text-2)]">공원·학교용지(18%)</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">주요 용도지역</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">제2종일반주거 (62%)</div>
                  <span className="text-[10px] text-[var(--text-2)]">일반상업 (28%)</span>
                </div>
              </div>

              {/* Cadastral Parcel Vector Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="parcels-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Cadastral Lot Polygons */}
                    <g stroke="#35C6E8" strokeWidth="1" strokeOpacity="0.4">
                      <polygon points="100,80 250,80 230,220 90,200" fill="#35C6E8" fillOpacity="0.15" />
                      <polygon points="250,80 420,80 400,220 230,220" fill="#35C6E8" fillOpacity="0.35" />
                      <polygon points="420,80 580,80 590,220 400,220" fill="#35C6E8" fillOpacity="0.2" />
                      <polygon points="580,80 720,80 710,220 590,220" fill="rgba(255,255,255,0.06)" />
                      {/* Lower row */}
                      <polygon points="90,240 230,240 210,360 80,350" fill="rgba(255,255,255,0.06)" />
                      <polygon points="230,240 460,240 440,360 210,360" fill="#35C6E8" fillOpacity="0.45" />
                      <polygon points="460,240 710,240 700,360 440,360" fill="#35C6E8" fillOpacity="0.1" />
                    </g>
                    {/* Lot Numbers & Zoning Text */}
                    <text x="325" y="150" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">산 30-1 [국공유지/학]</text>
                    <text x="500" y="150" fill="#93A0AC" fontSize="10" textAnchor="middle">장전동 402-5 [대]</text>
                    <text x="335" y="300" fill="#35C6E8" fontSize="11" fontWeight="bold" textAnchor="middle">시유지 공공복합지 [도·공]</text>
                    {/* Title */}
                    <text x="30" y="35" fill="#35C6E8" fontSize="13" fontWeight="bold">토지 용도지역 및 필지 구획 지적 다이어그램</text>
                    <text x="30" y="55" fill="#93A0AC" fontSize="10">연속지적도 기반 국공유지 및 지목 분포</text>
                    <g transform="translate(30, 395)">
                      <rect x="0" y="0" width="12" height="12" fill="#35C6E8" fillOpacity="0.45" />
                      <text x="18" y="10" fill="#93A0AC" fontSize="10">국공유지 (시·구유지)</text>
                      <rect x="160" y="0" width="12" height="12" fill="#35C6E8" fillOpacity="0.15" />
                      <text x="178" y="10" fill="#93A0AC" fontSize="10">사유지 (주거/상업)</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3-3: 교통 (Transport) */}
          {physicalSubTab === 'transport' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">교통 인벤토리 (도로망·지하철역·버스 정류장)</h3>
                  <p className="text-xs text-[var(--text-3)]">간선·지선 도로 위계, 역세권 5분 도보권, 대중교통 거점</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('transport')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('transport-diagram-svg', '교통_인벤토리')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'transport-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">인근 지하철역</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">2개 역</div>
                  <span className="text-[10px] text-[var(--text-2)]">1호선 부산대역/장전역</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">버스 정류장 수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">14개소</div>
                  <span className="text-[10px] text-[var(--text-2)]">반경 500m 내</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">도로망 밀도</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">12.4 km/㎢</div>
                  <span className="text-[10px] text-[var(--text-2)]">격자형 도로망</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">대중교통 접근 지수</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">88 / 100점</div>
                  <span className="text-[10px] text-[var(--text-2)]">역세권 보행 연계 우수</span>
                </div>
              </div>

              {/* Vector Transport Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="transport-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Subway Line */}
                    <line x1="80" y1="360" x2="720" y2="60" stroke="#E9743A" strokeWidth="4" strokeDasharray="10 6" />
                    {/* 5-min Walking Circles */}
                    <circle cx="280" cy="275" r="95" fill="#35C6E8" fillOpacity="0.08" stroke="#35C6E8" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="520" cy="155" r="95" fill="#35C6E8" fillOpacity="0.08" stroke="#35C6E8" strokeWidth="1" strokeDasharray="3 3" />
                    {/* Subway Stations */}
                    <circle cx="280" cy="275" r="9" fill="#E9743A" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="280" y="305" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">부산대역 (1호선)</text>
                    <circle cx="520" cy="155" r="9" fill="#E9743A" stroke="#FFFFFF" strokeWidth="2" />
                    <text x="520" y="185" fill="#E8EDF2" fontSize="11" fontWeight="bold" textAnchor="middle">장전역 (1호선)</text>
                    {/* Bus Stops */}
                    {[
                      [200, 200], [350, 220], [420, 180], [300, 140], [460, 260], [600, 120]
                    ].map(([bx, by], i) => (
                      <g key={i}>
                        <circle cx={bx} cy={by} r="5" fill="#35C6E8" />
                        <circle cx={bx} cy={by} r="8" fill="none" stroke="#35C6E8" strokeWidth="1" opacity="0.6" />
                      </g>
                    ))}
                    {/* Title */}
                    <text x="30" y="35" fill="#35C6E8" fontSize="13" fontWeight="bold">도로망 및 대중교통 접근성 다이어그램</text>
                    <text x="30" y="55" fill="#93A0AC" fontSize="10">지하철 5분 보행권 및 가로 버스정류장 연계망</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3-4: 그린 인프라 (Green Infra) */}
          {physicalSubTab === 'green_infra' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">그린 인프라 (공원·녹지·하천생태축)</h3>
                  <p className="text-xs text-[var(--text-3)]">인근 공원, 산림 녹지축, 하천 수변공간, 가로수망 연속성</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('green_infra')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('green-infra-diagram-svg', '그린인프라_다이어그램')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'green-infra-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">총 식생 피복률</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">{kpi.greenRatio}%</div>
                  <span className="text-[10px] text-[var(--text-2)]">목표 녹지율 25%</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">인근 공원 수</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">6개소</div>
                  <span className="text-[10px] text-[var(--text-2)]">근린공원 및 어린이공원</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">하천 및 수변거리</span>
                  <div className="text-lg font-bold text-[var(--text-1)] mt-0.5">온천천 (0.4km)</div>
                  <span className="text-[10px] text-[var(--text-2)]">수변생태축 연결 가능</span>
                </div>
                <div className="p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
                  <span className="text-[11px] text-[var(--text-3)]">산림 녹지축</span>
                  <div className="text-lg font-bold text-[var(--accent)] mt-0.5">금정산 능선축</div>
                  <span className="text-[10px] text-[var(--text-2)]">하절기 바람길 공급원</span>
                </div>
              </div>

              {/* Green Infra Vector Diagram */}
              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
                <div className="w-full overflow-hidden bg-[#080B0F] rounded-xl border border-[var(--border-hair)] p-4 flex items-center justify-center">
                  <svg id="green-infra-diagram-svg" viewBox="0 0 800 420" className="w-full h-auto max-h-[380px]">
                    <rect width="800" height="420" fill="#080B0F" />
                    {/* Mountain Green Ridge (West) */}
                    <path d="M 40 40 Q 120 180 80 380 L 20 380 L 20 40 Z" fill="#35C6E8" fillOpacity="0.45" stroke="#35C6E8" strokeWidth="1.5" />
                    <text x="70" y="210" fill="#E8EDF2" fontSize="11" fontWeight="bold">금정산 산림녹지축</text>
                    {/* River Corridor (East) */}
                    <path d="M 680 40 Q 720 200 660 380" fill="none" stroke="#35C6E8" strokeWidth="22" strokeOpacity="0.3" strokeLinecap="round" />
                    <path d="M 680 40 Q 720 200 660 380" fill="none" stroke="#35C6E8" strokeWidth="2" strokeDasharray="4 4" />
                    <text x="690" y="210" fill="#35C6E8" fontSize="11" fontWeight="bold">온천천 수변생태축</text>
                    {/* Connecting Green Corridors */}
                    <path d="M 120 140 Q 380 120 660 100" fill="none" stroke="#35C6E8" strokeWidth="6" strokeOpacity="0.25" strokeDasharray="8 4" />
                    <path d="M 100 280 Q 400 290 660 300" fill="none" stroke="#35C6E8" strokeWidth="6" strokeOpacity="0.25" strokeDasharray="8 4" />
                    {/* Pocket Parks */}
                    <circle cx="340" cy="180" r="28" fill="#35C6E8" fillOpacity="0.5" stroke="#35C6E8" strokeWidth="1.5" />
                    <text x="340" y="184" fill="#080B0F" fontSize="9" fontWeight="bold" textAnchor="middle">포켓파크 1</text>
                    <circle cx="480" cy="240" r="34" fill="#35C6E8" fillOpacity="0.5" stroke="#35C6E8" strokeWidth="1.5" />
                    <text x="480" y="244" fill="#080B0F" fontSize="9" fontWeight="bold" textAnchor="middle">중앙생태공원</text>
                    {/* Wind Vector Arrows */}
                    <g stroke="#35C6E8" strokeWidth="2" strokeOpacity="0.8">
                      <line x1="140" y1="170" x2="220" y2="185" markerEnd="url(#arrow)" />
                      <line x1="140" y1="230" x2="220" y2="245" markerEnd="url(#arrow)" />
                    </g>
                    <text x="170" y="160" fill="#35C6E8" fontSize="9">산림 바람길</text>
                    {/* Title */}
                    <text x="30" y="35" fill="#35C6E8" fontSize="13" fontWeight="bold">그린인프라 및 수변생태 네트워크 다이어그램</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3-5: POI 분석 (POI) */}
          {physicalSubTab === 'poi' && (
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">POI 시설 분석 (교육·공공·상업·복지)</h3>
                  <p className="text-xs text-[var(--text-3)]">주요 거점 시설 분포, 이용자 접근성 및 서비스 반경</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDiagram('poi')}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-medium text-[var(--text-1)] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>다이어그램 생성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload('poi-diagram-svg', 'POI_시설분석')}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold flex items-center gap-1.5 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadSuccess === 'poi-diagram-svg' ? '다운로드 완료' : '다이어그램 다운로드'}</span>
                  </button>
                </div>
              </div>

              {/* POI List & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl space-y-2">
                  <span className="font-bold text-xs text-[var(--text-1)]">권역 내 주요 POI 시설 목록 ({(data.pois || []).length}개소)</span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {(data.pois || []).map((poi, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs">
                        <div>
                          <div className="font-bold text-[var(--text-1)]">{poi.name}</div>
                          <div className="text-[10px] text-[var(--text-3)]">{poi.category}</div>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--accent)]">{poi.distanceMeters}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* POI Diagram Container */}
                <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl flex items-center justify-center">
                  <svg id="poi-diagram-svg" viewBox="0 0 400 240" className="w-full h-auto">
                    <rect width="400" height="240" fill="#080B0F" rx="8" />
                    <circle cx="200" cy="120" r="70" fill="none" stroke="#35C6E8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                    <circle cx="200" cy="120" r="5" fill="#35C6E8" />
                    <text x="200" y="110" fill="#E8EDF2" fontSize="9" fontWeight="bold" textAnchor="middle">{data.siteName}</text>
                    {(data.pois || []).slice(0, 6).map((poi, i) => {
                      const angle = (i * (2 * Math.PI)) / 6;
                      const px = 200 + Math.cos(angle) * 55;
                      const py = 120 + Math.sin(angle) * 55;
                      return (
                        <g key={i}>
                          <circle cx={px} cy={py} r="4" fill="#35C6E8" />
                          <text x={px} y={py + 10} fill="#93A0AC" fontSize="8" textAnchor="middle">{poi.name}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
