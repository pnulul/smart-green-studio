import React from 'react';
import {
  Sliders,
  Flame,
  Droplets,
  ShieldCheck,
  ThermometerSnowflake,
  Wind,
  Layers,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { SiteAnalysisData, AlgorithmWeights, PresetProfileId } from '../../types';
import { DEFAULT_WEIGHT_PRESETS } from '../../services/greenInfraAlgorithm';

interface SuitabilityClimateViewProps {
  data: SiteAnalysisData;
  weights: AlgorithmWeights;
  activePreset: PresetProfileId;
  onChangeWeight: (key: keyof AlgorithmWeights, val: number) => void;
  onSelectPreset: (key: PresetProfileId) => void;
  onResetWeights: () => void;
  onGoToMasterPlan?: () => void;
}

export const SuitabilityClimateView: React.FC<SuitabilityClimateViewProps> = ({
  data,
  weights,
  activePreset,
  onChangeWeight,
  onSelectPreset,
  onResetWeights,
  onGoToMasterPlan,
}) => {
  const cr = data.climateResilience;
  const kpi = data.kpi;

  const criteriaLabels: { key: keyof AlgorithmWeights; label: string; desc: string; color: string }[] = [
    { key: 'heatReduction', label: '도시열섬 완화 (Heat Reduction)', desc: '지표면 고온 구역 냉각 및 미기후 개선', color: 'text-rose-600' },
    { key: 'stormwaterRetention', label: '우수저류·LID (Stormwater)', desc: '불투수면 유출 저감 및 침수방재', color: 'text-cyan-600' },
    { key: 'carbonAbsorption', label: '탄소흡수·생태축 (Carbon & Bio)', desc: '수목 탄소 고정 및 생태통로 연결', color: 'text-emerald-600' },
    { key: 'popDensity', label: '인구밀도·유동량 (Pop Density)', desc: '상권 및 보행 유동인구 쿨링 수요', color: 'text-teal-600' },
    { key: 'vulnerableAccess', label: '취약계층 접근성 (Vulnerable)', desc: '어린이·고령자 쉼터 접근 형평성', color: 'text-orange-600' },
    { key: 'greenDeficiency', label: '녹지결핍도 보완 (Green Deficit)', desc: '법정 녹지율 미달 권역 우선 공급', color: 'text-green-600' },
    { key: 'transitConnectivity', label: '대중교통 연계 (Transit Hub)', desc: '역세권 및 환승 거점 보행 녹도', color: 'text-sky-600' },
    { key: 'costEfficiency', label: '시공·유지 경제성 (Cost & Feasibility)', desc: '사업비 대비 도입 편익 극대화', color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-slate-200">
      {/* Top Banner */}
      <div className="bg-[#12182b] rounded-2xl p-5 border border-[#212d4a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 text-xs font-bold border border-indigo-500/40 mb-2">
            <span>02 적합도·기후평가</span>
            <span>·</span>
            <span>MCDA 다기준 의사결정 및 기후회복력 모델</span>
          </div>
          <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
            입지적합도 평가 및 기후적응 과학 모델링
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            AHP 다기준 공간의사결정과 4대 도시계획 수리학·기상학 모델(2SFCA, SCS-CN, UTCI, MSPA)을 결합하여 최적의 그린인프라 후보지를 과학적으로 평가합니다.
          </p>
        </div>
      </div>

      {/* 4-Model Climate Resilience Science Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Model 1: 2SFCA */}
        <div className="bg-[#12182b] rounded-2xl p-4 border border-[#212d4a] shadow-md hover:border-emerald-500/50 transition-all">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>2SFCA 공원녹지 접근성 모델</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {cr?.twosfcaAccessibilityScore ?? 78}<span className="text-xs font-normal text-slate-400"> / 100점</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            공원 공급용량 대비 인구 수요 집수구역 분석 기반 녹지 형평성 지수
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-1 rounded-md">
            형평성 등급: B+ (중상위 접근성)
          </div>
        </div>

        {/* Model 2: SCS-CN */}
        <div className="bg-[#12182b] rounded-2xl p-4 border border-[#212d4a] shadow-md hover:border-cyan-500/50 transition-all">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1.5">
            <Droplets className="w-4 h-4" />
            <span>SCS-CN 우수 저류 & 침수 저감</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {cr?.scsCnRetentionRate ?? 46}<span className="text-xs font-normal text-slate-400"> % 저류율</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            불투수율 {kpi.imperviousRatio}% 지표면의 강우 시 유출 곡선번호(CN) 산정
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-1 rounded-md">
            LID 빗물정원 확충 시 72%로 개선
          </div>
        </div>

        {/* Model 3: UTCI */}
        <div className="bg-[#12182b] rounded-2xl p-4 border border-[#212d4a] shadow-md hover:border-amber-500/50 transition-all">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1.5">
            <ThermometerSnowflake className="w-4 h-4" />
            <span>UTCI 야외 열쾌적성 지수</span>
          </div>
          <div className="text-base font-black text-white mt-1">
            {cr?.utciComfortLevel || '경미한 열스트레스'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            인체 열균형 모델(UTCI) 기반 한여름 체감온도 저감 요구도
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-1 rounded-md">
            수관 확장 시 체감 -2.8°C 강하
          </div>
        </div>

        {/* Model 4: Eco-Corridors */}
        <div className="bg-[#12182b] rounded-2xl p-4 border border-[#212d4a] shadow-md hover:border-teal-500/50 transition-all">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs mb-1.5">
            <Wind className="w-4 h-4" />
            <span>생태축·바람길 MSPA 연결성</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {cr?.ecologicalCorridorScore ?? 72}<span className="text-xs font-normal text-slate-400"> / 100점</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
            산림 냉기류 유입로 및 꿀벌·소생물 이동 징검다리 코리도 형성도
          </p>
          <div className="mt-2.5 text-[10px] font-bold text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2 py-1 rounded-md">
            도심 관통 2개 주 생태축 연계
          </div>
        </div>
      </div>

      {/* MCDA Algorithm Interactive Control Deck */}
      <div className="bg-[#12182b] rounded-2xl p-6 border border-[#212d4a] shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1f2a47]">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">MCDA 8대 다기준 가중치 실시간 가감 컨트롤러</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              조경설계 목표 및 대상지 현안에 따라 각 지표의 반영 비중을 조정하여 최적 후보지를 재산출합니다.
            </p>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={onResetWeights}
            className="self-start md:self-auto px-3 py-1.5 rounded-xl border border-[#273456] bg-[#162038] text-xs font-bold text-slate-300 hover:text-white hover:bg-[#1f2c4e] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값 초기화</span>
          </button>
        </div>

        {/* Preset Selector Badges */}
        <div>
          <div className="text-xs font-bold text-slate-300 mb-2">기획 목적별 추천 가중치 프리셋 (Presets):</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {DEFAULT_WEIGHT_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md text-white'
                      : 'bg-[#162038] border-[#212d4a] text-slate-300 hover:bg-[#1b2746] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{preset.name}</span>
                    {isActive && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{preset.shortDesc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 8 Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
          {criteriaLabels.map((c) => {
            const val = weights[c.key];
            return (
              <div key={c.key} className="bg-[#101728] p-3.5 rounded-xl border border-[#1f2a47] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white">{c.label}</span>
                    <p className="text-[10px] text-slate-400">{c.desc}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-300 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-md min-w-9 text-center">
                    {val}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={val}
                  onChange={(e) => onChangeWeight(c.key, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-[#1f2a47] rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            );
          })}
        </div>

        {/* Suitability Calculation Summary Bar */}
        <div className="p-4 bg-[#101728] rounded-xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black shadow-md">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">
                MCDA 적합도 평가 완료: 상위 {data.candidateSites.length}개소 최적 부지 산출
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                선택된 가중치에 따라 쌈지공원, 쿨링가로, 옥상녹화, 빗물정원의 위치와 우선순위가 지도상에 자동 갱신되었습니다.
              </div>
            </div>
          </div>

          {onGoToMasterPlan && (
            <button
              type="button"
              onClick={onGoToMasterPlan}
              className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>03 마스터플랜 확인</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
