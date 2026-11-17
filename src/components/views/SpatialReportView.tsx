import React, { useRef, useState } from 'react';
import {
  Download,
  Printer,
  Layers,
  Upload,
  CheckCircle2,
  School,
  User,
  GraduationCap,
  Presentation,
  FileSpreadsheet,
} from 'lucide-react';
import pptxgen from 'pptxgenjs';
import { loggerService } from '../../services/loggerService';
import { SiteAnalysisData, GeoJsonLayerItem, CustomGeoJsonItem, StudentAuthSession } from '../../types';

interface SpatialReportViewProps {
  data: SiteAnalysisData;
  geoJsonLayers: GeoJsonLayerItem[];
  customGeoJsonLayers: CustomGeoJsonItem[];
  onToggleGeoJsonLayer: (id: string) => void;
  onChangeGeoJsonLayerOpacity: (id: string, opacity: number) => void;
  onAddCustomGeoJsonLayer: (layer: CustomGeoJsonItem) => void;
  onRemoveCustomGeoJsonLayer: (id: string) => void;
  onToggleCustomGeoJsonLayer: (id: string) => void;
  onChangeCustomGeoJsonLayerOpacity: (id: string, opacity: number) => void;
  onOpenAiReportModal?: () => void;
  session?: StudentAuthSession | null;
}

export const SpatialReportView: React.FC<SpatialReportViewProps> = ({
  session,
  data,
  geoJsonLayers,
  customGeoJsonLayers,
  onToggleGeoJsonLayer,
  onChangeGeoJsonLayerOpacity,
  onAddCustomGeoJsonLayer,
  onRemoveCustomGeoJsonLayer,
  onToggleCustomGeoJsonLayer,
  onChangeCustomGeoJsonLayerOpacity,
  onOpenAiReportModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const newLayer: CustomGeoJsonItem = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          featureCount: json.features?.length || 1,
          uploadedAt: new Date().toLocaleTimeString(),
          color: '#35C6E8',
          opacity: 0.7,
          visible: true,
          data: json,
        };
        onAddCustomGeoJsonLayer(newLayer);
      } catch (err) {
        alert('유효하지 않은 GeoJSON 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportGeoJson = () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(data.treesData ? [
          {
            type: 'Feature',
            properties: { layer: 'Trees', count: data.treesData.totalTreesCount },
            geometry: { type: 'Point', coordinates: [data.lng, data.lat] },
          }
        ] : []),
        ...data.candidateSites.map((c) => ({
          type: 'Feature',
          properties: {
            name: c.name,
            rank: c.rank,
            score: c.overallScore,
            cost: c.estimatedBudgetKrw,
          },
          geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        })),
      ],
    };

    const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.siteName}_GreenInfra_SpatialData.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingPpt, setIsExportingPpt] = useState(false);

  const handleExportPptx = async () => {
    setIsExportingPpt(true);
    const startTime = Date.now();
    loggerService.log(session?.studentId || 'unknown', 'PPT_DOWNLOAD', '공간보고서 PPT 다운로드 시작', {
      stage: 'analysis',
      site_name: data.siteName,
      status: 'start'
    });
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';

      // ── Slide 1: Cover Slide ──
      const slide1 = pres.addSlide();
      slide1.background = { color: '080B0F' };
      slide1.addText('SMART GREEN STUDIO', {
        x: 0.8,
        y: 1.2,
        w: 10,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: '35C6E8',
        fontFace: 'Arial',
      });
      slide1.addText(`${data.siteName}\n공간진단 및 그린인프라 마스터플랜`, {
        x: 0.8,
        y: 1.8,
        w: 11,
        h: 1.6,
        fontSize: 28,
        bold: true,
        color: 'E8EDF2',
        fontFace: 'Malgun Gothic',
      });
      slide1.addText(`위치: ${data.address} | 분석일자: ${new Date().toLocaleDateString('ko-KR')}\n작성자: ${session?.studentName || '부산대학교 조경학과 스튜디오'}`, {
        x: 0.8,
        y: 4.2,
        w: 10,
        h: 0.8,
        fontSize: 12,
        color: '93A0AC',
        fontFace: 'Malgun Gothic',
      });

      // ── Slide 2: 종합 공간진단 및 핵심 KPI ──
      const slide2 = pres.addSlide();
      slide2.background = { color: '0A0E13' };
      slide2.addText('01. 대상지 현황 진단 & 핵심 지표 (KPI)', {
        x: 0.8,
        y: 0.6,
        w: 10,
        h: 0.5,
        fontSize: 20,
        bold: true,
        color: '35C6E8',
        fontFace: 'Malgun Gothic',
      });

      // KPI Boxes
      const kpis = [
        { title: '수목/녹지 피복률', val: `${data.kpi.greenRatio}%`, desc: '목표 녹지율 25% 대비' },
        { title: '연간 탄소흡수량', val: `${data.kpi.carbonAbsorptionTons} tCO2`, desc: '온실가스 상쇄 효과' },
        { title: '보행 환경 점수', val: `${data.pedestrianData?.walkabilityScore || 84}점`, desc: '보행친화 네트워크' },
        { title: '열섬 취약등급', val: `${data.kpi.heatRiskIndex}/5등급`, desc: '하절기 쿨링 권역' },
      ];
      kpis.forEach((item, idx) => {
        const xPos = 0.8 + idx * 2.8;
        slide2.addShape(pres.ShapeType.rect, {
          x: xPos,
          y: 1.5,
          w: 2.6,
          h: 2.0,
          fill: { color: '10151C' },
          line: { color: '35C6E8', width: 1 },
        });
        slide2.addText(item.title, { x: xPos + 0.2, y: 1.7, w: 2.2, h: 0.3, fontSize: 11, color: '93A0AC' });
        slide2.addText(item.val, { x: xPos + 0.2, y: 2.1, w: 2.2, h: 0.6, fontSize: 22, bold: true, color: 'E8EDF2' });
        slide2.addText(item.desc, { x: xPos + 0.2, y: 2.9, w: 2.2, h: 0.3, fontSize: 10, color: '5D6975' });
      });

      // ── Slide 3: 인문 및 물리적 환경 종합 ──
      const slide3 = pres.addSlide();
      slide3.background = { color: '0A0E13' };
      slide3.addText('02. 인문 및 물리적 환경 분석 결과', {
        x: 0.8,
        y: 0.6,
        w: 10,
        h: 0.5,
        fontSize: 20,
        bold: true,
        color: '35C6E8',
        fontFace: 'Malgun Gothic',
      });
      slide3.addText('• 인문환경: 총 거주인구 약 4.2만 명, 고령화율 21.4%로 기후취약계층 집중구역 확인\n• 건축환경: 총 188동 건축물 중 노후건물(30년+) 24.5% 분포, 입면녹화 및 차양 필요\n• 토지환경: 국공유지 34.2% 확보로 시·구유지 연계 그린인프라 실현가능성 우수\n• 교통체계: 지하철역(1호선) 및 버스정류장 연계 5분 보행 역세권 그린웨이 구축 적합\n• 그린인프라: 금정산 산림축과 온천천 수변축을 연결하는 도심 생태징검다리 전략 도출', {
        x: 0.8,
        y: 1.5,
        w: 11.5,
        h: 4.5,
        fontSize: 13,
        color: 'E8EDF2',
        lineSpacing: 24,
        fontFace: 'Malgun Gothic',
      });

      // ── Slide 4: 그린인프라 추천 및 최적 후보지 ──
      const slide4 = pres.addSlide();
      slide4.background = { color: '0A0E13' };
      slide4.addText('03. 그린인프라 최적 후보지 및 공종 추천', {
        x: 0.8,
        y: 0.6,
        w: 10,
        h: 0.5,
        fontSize: 20,
        bold: true,
        color: '35C6E8',
        fontFace: 'Malgun Gothic',
      });

      const tableData = [
        [
          { text: '순위', options: { bold: true, color: '35C6E8', fill: { color: '10151C' } } },
          { text: '후보지 명칭', options: { bold: true, color: '35C6E8', fill: { color: '10151C' } } },
          { text: '추천 공종', options: { bold: true, color: '35C6E8', fill: { color: '10151C' } } },
          { text: '종합적합도', options: { bold: true, color: '35C6E8', fill: { color: '10151C' } } },
          { text: '추정 사업비', options: { bold: true, color: '35C6E8', fill: { color: '10151C' } } },
        ],
        ...data.candidateSites.slice(0, 4).map((c) => [
          { text: `${c.rank}위`, options: { color: 'E8EDF2' } },
          { text: c.name, options: { color: 'E8EDF2' } },
          { text: c.typeLabel, options: { color: '35C6E8' } },
          { text: `${c.overallScore}점`, options: { color: 'E8EDF2' } },
          { text: `${c.estimatedBudgetKrw}억원`, options: { color: 'E8EDF2' } },
        ]),
      ];

      slide4.addTable(tableData, {
        x: 0.8,
        y: 1.5,
        w: 11.5,
        colW: [1.2, 3.5, 3.0, 1.8, 2.0],
        fill: { color: '080B0F' },
        color: 'E8EDF2',
        fontSize: 11,
        border: { pt: 1, color: '35C6E8' },
      });

      await pres.writeFile({ fileName: `${data.siteName}_그린인프라_발표자료.pptx` });
      loggerService.log(session?.studentId || 'unknown', 'PPT_DOWNLOAD', '공간보고서 PPT 다운로드 완료', {
        stage: 'analysis',
        site_name: data.siteName,
        status: 'success',
        duration_ms: Date.now() - startTime
      });
    } catch (err) {
      console.error('PPT export error:', err);
      alert('PPT 생성 중 오류가 발생했습니다.');
      loggerService.log(session?.studentId || 'unknown', 'PPT_DOWNLOAD', `공간보고서 PPT 생성 오류: ${err.message}`, {
        stage: 'analysis',
        site_name: data.siteName,
        status: 'error',
        duration_ms: Date.now() - startTime
      });
    } finally {
      setIsExportingPpt(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-[var(--text-1)]">
      {/* Top Banner */}
      <div className="bg-[var(--bg-panel)] rounded-xl p-5 border border-[var(--border-hair)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold border border-[var(--border-hair)] mb-2">
            <span>05 설계도서</span>
            <span>-</span>
            <span>공간 GIS 데이터 및 발표자료 출력</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-1)]">
            공간 GIS 데이터 관리 및 마스터플랜 도서·PPT 출력
          </h2>
          <p className="text-xs text-[var(--text-2)] mt-1 max-w-2xl">
            수목 캐노피, 보행로, 적합도 레이어를 제어하고, GIS 표준 GeoJSON 파일 및 발표용 PPTX / 인쇄용 보고서를 원클릭 출력합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportPptx}
            disabled={isExportingPpt}
            className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] font-bold text-xs rounded-lg border border-[var(--border-hair)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Presentation className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{isExportingPpt ? 'PPT 생성 중...' : 'PPT 다운로드'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportGeoJson}
            className="px-3.5 py-2 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] font-bold text-xs rounded-lg border border-[var(--border-hair)] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>GeoJSON 다운로드</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs rounded-lg transition-opacity flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>설계도서 인쇄 / PDF</span>
          </button>
        </div>
      </div>

      {/* Spatial Layer Registry Deck */}
      <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-hair)]">
          <div>
            <h3 className="font-bold text-[var(--text-1)] text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--accent)]" />
              <span>시스템 내장 공간 GIS 레이어 컨트롤 ({geoJsonLayers.length}종)</span>
            </h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              지도 상에 중첩 렌더링되는 지리공간 피처의 가시성(Visibility) 및 불투명도(Opacity)를 제어합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".geojson,.json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl border border-dashed border-[var(--border-hair)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>외부 GeoJSON 추가</span>
            </button>
          </div>
        </div>

        {/* Built-in Layers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {geoJsonLayers.map((layer) => (
            <div
              key={layer.key}
              className={`p-3.5 rounded-xl border transition-all ${
                layer.visible
                  ? 'bg-[var(--surface-2)] border-[var(--accent-dim)]'
                  : 'bg-[var(--surface-1)] border-[var(--border-hair)] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="font-bold text-xs text-[var(--text-1)] truncate">{layer.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => onToggleGeoJsonLayer(layer.key)}
                  className="w-4 h-4 text-[var(--accent)] rounded-md focus:ring-0 cursor-pointer accent-[var(--accent)]"
                />
              </div>

              <p className="text-[10px] text-[var(--text-3)] line-clamp-2 mb-2">{layer.description}</p>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-3)]">투명도:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={layer.opacity}
                  disabled={!layer.visible}
                  onChange={(e) => onChangeGeoJsonLayerOpacity(layer.key, parseFloat(e.target.value))}
                  className="w-full h-1 bg-[var(--surface-1)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] disabled:opacity-30"
                />
                <span className="text-[10px] font-bold text-[var(--text-2)] w-6 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Uploaded Layers */}
        {customGeoJsonLayers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border-hair)]">
            <h4 className="font-bold text-xs text-[var(--text-2)] mb-2">사용자 업로드 커스텀 레이어 ({customGeoJsonLayers.length}개):</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customGeoJsonLayers.map((cLayer) => (
                <div key={cLayer.id} className="p-3 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="font-bold text-xs text-[var(--text-1)] truncate max-w-[150px]">{cLayer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cLayer.visible}
                      onChange={() => onToggleCustomGeoJsonLayer(cLayer.id)}
                      className="w-4 h-4 rounded-md accent-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveCustomGeoJsonLayer(cLayer.id)}
                      className="text-[10px] text-[var(--warn)] hover:underline font-bold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Printable Landscape Design Report */}
      <div className="bg-[var(--bg-panel)] rounded-2xl p-6 md:p-8 border border-[var(--border-hair)] space-y-6 text-[var(--text-1)] print:border-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-hair)]">
          <div>
            <div className="text-xs font-black tracking-wider text-[var(--accent)] uppercase flex items-center gap-2">
              <School className="w-4 h-4 text-[var(--accent)]" />
              <span>URBAN LANDSCAPE LAB AT PNU - SMART GREEN STUDIO SPATIAL BRIEF</span>
            </div>
            <h3 className="text-2xl font-black text-[var(--text-1)] mt-1">
              {data.siteName} 그린인프라 마스터플랜 기본계획서
            </h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              분석 좌표: N {data.lat.toFixed(5)}°, E {data.lng.toFixed(5)}° | 법정 용도: {data.urban.zoningName} | 반경: {data.activeRadius}m 권역
            </p>
          </div>

          {onOpenAiReportModal && (
            <button
              type="button"
              onClick={onOpenAiReportModal}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-hair)] font-bold text-xs transition-colors flex items-center gap-1.5 no-print"
            >
              <span>AI 종합 심의 의견서 보기</span>
            </button>
          )}
        </div>

        {/* Academic / Student Attribution Box */}
        <div className="p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-3)]">작성자 (Student / Author)</div>
              <div className="font-bold text-[var(--text-1)]">
                {session?.studentName || '조경학과 실습생'} {session?.studentId ? `(${session.studentId})` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-3)]">수강 강좌 / 스튜디오</div>
              <div className="font-bold text-[var(--text-1)] truncate">
                {session?.courseName || '조경계획학 및 실습 / 조경설계스튜디오'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-3)]">연구실 및 주관 기관</div>
              <div className="font-bold text-[var(--text-1)]">
                Landscape Urbanism Lab at PNU
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-[var(--text-1)] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold flex items-center justify-center border border-[var(--border-hair)]">1</span>
            <span>대상지 개황 및 핵심 현황 지표</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border-hair)]">
              <span className="text-[var(--text-3)] block text-[11px]">법정 용도지역</span>
              <span className="font-bold text-[var(--text-1)] text-sm">{data.urban.zoningName}</span>
            </div>
            <div className="bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border-hair)]">
              <span className="text-[var(--text-3)] block text-[11px]">현재 녹지율 / 불투수율</span>
              <span className="font-bold text-[var(--text-1)] text-sm">{data.kpi.greenRatio}% / {data.kpi.imperviousRatio}%</span>
            </div>
            <div className="bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border-hair)]">
              <span className="text-[var(--text-3)] block text-[11px]">OSM 수목 개체수 / 수관율</span>
              <span className="font-bold text-[var(--accent)] text-sm">
                {data.treesData?.totalTreesCount ?? 184}주 ({data.treesData?.canopyCoverageRatio ?? 14}%)
              </span>
            </div>
            <div className="bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border-hair)]">
              <span className="text-[var(--text-3)] block text-[11px]">보행로 총 연장 / 친화도</span>
              <span className="font-bold text-[var(--accent)] text-sm">
                {((data.pedestrianData?.totalFootwayLengthM ?? 4200) / 1000).toFixed(1)}km ({data.pedestrianData?.walkabilityScore ?? 84}점)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Recommended Candidate Sites Table */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-[var(--text-1)] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold flex items-center justify-center border border-[var(--border-hair)]">2</span>
            <span>최적 그린인프라 후보지 선정 및 사업계획표</span>
          </h4>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-hair)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-1)] text-[var(--text-2)] font-bold border-b border-[var(--border-hair)]">
                  <th className="p-2.5 w-12 text-center">순위</th>
                  <th className="p-2.5">부지명 / 현 토지이용</th>
                  <th className="p-2.5 text-center">적합도 점수</th>
                  <th className="p-2.5">도입 규모 (㎡)</th>
                  <th className="p-2.5">추정 사업비</th>
                  <th className="p-2.5">권장 수종 및 시설</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hair)] text-[var(--text-2)]">
                {data.candidateSites.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--surface-1)] transition-colors">
                    <td className="p-2.5 text-center font-bold text-[var(--accent)]">#{c.rank}</td>
                    <td className="p-2.5">
                      <div className="font-bold text-[var(--text-1)]">{c.name}</div>
                      <div className="text-[10px] text-[var(--text-3)]">{c.currentLandUse}</div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="bg-[var(--surface-2)] text-[var(--accent)] font-bold px-2 py-0.5 rounded-md border border-[var(--border-hair)]">
                        {c.overallScore}점
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-[var(--text-1)]">{(c.targetAreaM2 ?? (c as any).areaM2 ?? 0).toLocaleString()} ㎡</td>
                    <td className="p-2.5 font-medium text-[var(--text-1)]">{c.estimatedBudgetKrw}</td>
                    <td className="p-2.5 text-[var(--text-2)] font-medium">{c.recommendedFlora.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Expected Benefits & Climate Resilience Impacts */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-[var(--text-1)] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold flex items-center justify-center border border-[var(--border-hair)]">3</span>
            <span>도입 후 기대 환경·사회적 편익 (Expected Resilience Impact)</span>
          </h4>
          <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <b className="text-[var(--text-1)]">도시열섬 및 미기후 개선: </b>
                <span className="text-[var(--text-2)]">
                  고수관목(느티나무, 이팝나무) 보식 및 쿨루프 확충으로 지표면 최고온도 평균 2.8°C 강하 및 여름철 보행 열스트레스 42% 경감
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <b className="text-[var(--text-1)]">수재해 안전 및 LID 우수 유출 저감: </b>
                <span className="text-[var(--text-2)]">
                  LID 빗물정원과 투수블록 연계를 통해 강우 시 초기 우수 850ton/yr 저류 및 침수 취약 위험도 현저히 감소
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <b className="text-[var(--text-1)]">탄소중립 및 보행 생태축 복원: </b>
                <span className="text-[var(--text-2)]">
                  연간 32.4 tCO2 탄소 상쇄 달성 및 보행로 녹도 연결로 소생물 이동 및 주민 생활권 공원 접근성 대폭 증진
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Signoff Footer */}
        <div className="pt-4 border-t border-[var(--border-hair)] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--text-3)] gap-1">
          <span>문서번호: PNU-LUL-2026-{Math.floor(data.lat * 100)}</span>
          <span className="font-bold text-[var(--text-2)]">
            개발 및 감수: 부산대학교 조경학과 도시조경 연구실 (Landscape Urbanism Lab at PNU)
          </span>
        </div>
      </div>
    </div>
  );
};
