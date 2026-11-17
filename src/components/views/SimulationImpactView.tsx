import React, { useState } from 'react';
import {
  Sliders,
  TrendingDown,
  Droplets,
  TreePine,
  Users,
  DollarSign,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { SiteAnalysisData } from '../../types';

interface SimulationImpactViewProps {
  data: SiteAnalysisData;
  onOpenMultiSiteModal?: () => void;
  onGoToReport?: () => void;
}

export const SimulationImpactView: React.FC<SimulationImpactViewProps> = ({
  data,
  onOpenMultiSiteModal,
  onGoToReport,
}) => {
  // Simulator State: User-adjustable scale for 4 green infra interventions
  const [pocketParkArea, setPocketParkArea] = useState<number>(1200); // m²
  const [greenRoofArea, setGreenRoofArea] = useState<number>(2500); // m²
  const [rainGardenArea, setRainGardenArea] = useState<number>(800); // m²
  const [streetTreeLength, setStreetTreeLength] = useState<number>(1500); // m

  // Calculate dynamic impact metrics based on scientific multipliers
  const tempDropC = parseFloat(
    ((pocketParkArea * 0.0006) + (greenRoofArea * 0.00035) + (rainGardenArea * 0.0002) + (streetTreeLength * 0.00045) + 0.3).toFixed(2)
  );

  const waterRetentionTons = Math.round(
    pocketParkArea * 0.35 + greenRoofArea * 0.22 + rainGardenArea * 0.85 + streetTreeLength * 0.15
  );

  const carbonAbsorptionTons = parseFloat(
    (pocketParkArea * 0.0042 + greenRoofArea * 0.0018 + rainGardenArea * 0.0022 + streetTreeLength * 0.0065).toFixed(1)
  );

  const beneficiaryPop = Math.round(
    (pocketParkArea * 3.5 + greenRoofArea * 1.8 + rainGardenArea * 2.2 + streetTreeLength * 2.8) * 1.4
  );

  const estimatedTotalCostBillion = parseFloat(
    ((pocketParkArea * 0.00035) + (greenRoofArea * 0.00018) + (rainGardenArea * 0.00022) + (streetTreeLength * 0.00012)).toFixed(2)
  );

  const simulatedGreenRatio = Math.min(
    95,
    parseFloat((data.kpi.greenRatio + (pocketParkArea + greenRoofArea * 0.6 + rainGardenArea) / 750).toFixed(1))
  );

  // Before vs After chart data
  const comparisonData = [
    { name: '녹지율 (%)', before: data.kpi.greenRatio, after: simulatedGreenRatio },
    { name: '열섬 저항력 (점)', before: 100 - data.kpi.imperviousRatio, after: Math.min(95, (100 - data.kpi.imperviousRatio) + tempDropC * 12) },
    { name: '우수 저류율 (%)', before: data.climateResilience?.scsCnRetentionRate ?? 45, after: Math.min(90, (data.climateResilience?.scsCnRetentionRate ?? 45) + (rainGardenArea / 80)) },
    { name: '보행 친화도 (점)', before: data.pedestrianData?.walkabilityScore ?? 75, after: Math.min(98, (data.pedestrianData?.walkabilityScore ?? 75) + (streetTreeLength / 120)) },
  ];

  const radarData = [
    { metric: '열섬 저감', before: 50, after: Math.min(95, 50 + tempDropC * 20) },
    { metric: '우수 방재', before: 45, after: Math.min(92, 45 + waterRetentionTons * 0.05) },
    { metric: '탄소 상쇄', before: 40, after: Math.min(90, 40 + carbonAbsorptionTons * 3.5) },
    { metric: '보행 쾌적', before: 65, after: Math.min(96, 65 + (streetTreeLength / 80)) },
    { metric: '녹지 형평', before: 55, after: Math.min(94, 55 + (pocketParkArea / 80)) },
    { metric: '생태 연결', before: 60, after: Math.min(95, 60 + (greenRoofArea / 120)) },
  ];

  const handleReset = () => {
    setPocketParkArea(1200);
    setGreenRoofArea(2500);
    setRainGardenArea(800);
    setStreetTreeLength(1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 mb-2">
            <span>04 성능 시뮬레이션</span>
            <span>·</span>
            <span>그린인프라 성능 예측 및 영향 평가</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
            도입 규모별 환경·사회 성능 예측 시뮬레이터
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            쌈지공원, 옥상녹화, 빗물정원, 가로수의 조성 규모를 실시간으로 가감하여 예상되는 온도 저감, 우수 저류, 탄소 상쇄 및 수혜 인구를 산출합니다.
          </p>
        </div>

        {onOpenMultiSiteModal && (
          <button
            type="button"
            onClick={onOpenMultiSiteModal}
            className="self-start md:self-auto px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>3대 대상지 벤치마크 비교</span>
          </button>
        )}
      </div>

      {/* Simulator Control Sliders Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">그린인프라 조성 규모(Scale) 인터랙티브 파라미터</h3>
            <p className="text-xs text-slate-500">슬라이더를 드래그하여 목표 설계안의 성능 변화를 즉시 시뮬레이션하세요.</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본 설계안 복원</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Slider 1: Pocket Park */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-800">도심 쌈지공원 & 포켓파크 조성</span>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                {pocketParkArea.toLocaleString()} ㎡
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={pocketParkArea}
              onChange={(e) => setPocketParkArea(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 ㎡</span>
              <span>2,500 ㎡</span>
              <span>5,000 ㎡</span>
            </div>
          </div>

          {/* Slider 2: Green Roof */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-xs text-slate-800">공공·민간 옥상녹화 & 쿨루프</span>
              </div>
              <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                {greenRoofArea.toLocaleString()} ㎡
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              step="200"
              value={greenRoofArea}
              onChange={(e) => setGreenRoofArea(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 ㎡</span>
              <span>5,000 ㎡</span>
              <span>10,000 ㎡</span>
            </div>
          </div>

          {/* Slider 3: Rain Garden */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <span className="font-bold text-xs text-slate-800">LID 빗물정원 & 침투저류지</span>
              </div>
              <span className="text-xs font-black text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-md">
                {rainGardenArea.toLocaleString()} ㎡
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4000"
              step="100"
              value={rainGardenArea}
              onChange={(e) => setRainGardenArea(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 ㎡</span>
              <span>2,000 ㎡</span>
              <span>4,000 ㎡</span>
            </div>
          </div>

          {/* Slider 4: Street Trees */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-xs text-slate-800">가로수 띠녹지 & 쿨링 가로수길</span>
              </div>
              <span className="text-xs font-black text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                {streetTreeLength.toLocaleString()} m
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4000"
              step="100"
              value={streetTreeLength}
              onChange={(e) => setStreetTreeLength(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0 m</span>
              <span>2,000 m</span>
              <span>4,000 m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Simulated Outputs: 5 Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold mb-1">
            <TrendingDown className="w-4 h-4" />
            <span>지표면 온도 저감</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            -{tempDropC} <span className="text-sm font-normal text-slate-500">°C</span>
          </div>
          <div className="text-[10px] text-rose-700 mt-1 font-semibold">
            체감 열스트레스 대폭 완화
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-cyan-600 text-xs font-bold mb-1">
            <Droplets className="w-4 h-4" />
            <span>연간 우수 저류량</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {waterRetentionTons.toLocaleString()} <span className="text-sm font-normal text-slate-500">ton</span>
          </div>
          <div className="text-[10px] text-cyan-700 mt-1 font-semibold">
            도시 홍수 유출 피크 34% 지연
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
            <TreePine className="w-4 h-4" />
            <span>연간 탄소 흡수량</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            +{carbonAbsorptionTons} <span className="text-sm font-normal text-slate-500">tCO2</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
            소나무 약 {Math.round(carbonAbsorptionTons * 150)}그루 효과
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-orange-600 text-xs font-bold mb-1">
            <Users className="w-4 h-4" />
            <span>직간접 수혜 인구</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {beneficiaryPop.toLocaleString()} <span className="text-sm font-normal text-slate-500">명</span>
          </div>
          <div className="text-[10px] text-orange-700 mt-1 font-semibold">
            보행권 거주 주민 및 통학객
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-sky-600 text-xs font-bold mb-1">
            <DollarSign className="w-4 h-4" />
            <span>추정 총 사업비</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            약 {estimatedTotalCostBillion} <span className="text-sm font-normal text-slate-500">억원</span>
          </div>
          <div className="text-[10px] text-sky-700 mt-1 font-semibold">
            B/C 비율 약 1.42 (타당성 우수)
          </div>
        </div>
      </div>

      {/* Before vs After Visualization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart: Before vs After */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-1">도입 전(Before) vs 도입 후(After) 주요 성능 비교</h4>
          <p className="text-xs text-slate-500 mb-4">녹지율, 열섬 저항력, 우수 저류율, 보행 친화도 개선치</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name="조성 전 (Current)" dataKey="before" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar name="시뮬레이션 후 (Simulated)" dataKey="after" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart: Resilience Multi-Factor Radar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-1">기후 회복력 6대 지표 역량 확장 다이어그램</h4>
          <p className="text-xs text-slate-500 mb-4">그린인프라 확충에 따른 종합 회복력 스케일</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Radar name="도입 전" dataKey="before" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.25} />
                <Radar name="도입 후 목표치" dataKey="after" stroke="#059669" fill="#10b981" fillOpacity={0.45} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Action Card */}
      {onGoToReport && (
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200/90 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-950 text-sm">시뮬레이션 결과 기반 조경설계 도서 생성</h4>
            <p className="text-xs text-emerald-800 mt-0.5">
              공간 데이터 레이어 관리 및 종합 설계 브리프를 PDF나 인쇄용 도서로 출력합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToReport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>05 공간데이터 & 설계도서 열기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
