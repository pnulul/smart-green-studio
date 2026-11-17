import React, { useState } from 'react';
import { X, Check, Droplets, Sun, Wind, Trees, DollarSign, ArrowUpRight } from 'lucide-react';
import { SiteAnalysisData } from '../types';

interface GreenInfraSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteData: SiteAnalysisData;
}

interface Intervention {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  costMillionKrw: number;
  greenRatioBoost: number; // %
  coolingDelta: number; // °C
  stormwaterRetention: number; // %
  carbonDelta: number; // tCO2/yr
  description: string;
  recommendedFlora: string[];
}

export const GreenInfraSimulatorModal: React.FC<GreenInfraSimulatorModalProps> = ({
  isOpen,
  onClose,
  siteData,
}) => {
  const [interventions, setInterventions] = useState<Intervention[]>([
    {
      id: 'int-1',
      name: '상업 가로변 쿨링 쌈지공원 (Pocket Park) 2개소',
      category: '포켓파크',
      enabled: true,
      costMillionKrw: 240,
      greenRatioBoost: 2.8,
      coolingDelta: 1.2,
      stormwaterRetention: 18,
      carbonDelta: 8.5,
      description: '보행 통행량이 많은 자투리 유휴부지에 그늘목, 쿨링포그 파고라, 투수성 블록 설치',
      recommendedFlora: ['느티나무', '배롱나무', '수국', '맥문동'],
    },
    {
      id: 'int-2',
      name: '보행 주동선 연속 다층 가로수길 (Cooling Corridor) 800m',
      category: '가로수길',
      enabled: true,
      costMillionKrw: 320,
      greenRatioBoost: 4.2,
      coolingDelta: 1.6,
      stormwaterRetention: 22,
      carbonDelta: 14.8,
      description: '기존 1열 가로수를 2열 다층식재(교목+관목+초본)로 전환하여 바람길 녹음 캐노피 형성',
      recommendedFlora: ['이팝나무', '왕벚나무', '화살나무', '조팝나무'],
    },
    {
      id: 'int-3',
      name: '저영향개발(LID) 침투형 빗물정원 & 식생수로 (Bioswale)',
      category: 'LID 수생태',
      enabled: false,
      costMillionKrw: 180,
      greenRatioBoost: 1.9,
      coolingDelta: 0.8,
      stormwaterRetention: 35,
      carbonDelta: 4.2,
      description: '사면 집수구역 및 도로변 유출수 정화를 위한 분산형 쇄석 저류조 및 자생 초화류 식재',
      recommendedFlora: ['창포', '물억새', '붓꽃', '버드나무'],
    },
    {
      id: 'int-4',
      name: '공공 및 민간건물 옥상정원 (Sky Green Network) 5개동',
      category: '옥상녹화',
      enabled: false,
      costMillionKrw: 450,
      greenRatioBoost: 3.5,
      coolingDelta: 1.4,
      stormwaterRetention: 28,
      carbonDelta: 12.0,
      description: '평슬라브 옥상에 경량토 세둠 매트 및 목재 데크 휴게 쉼터 조성',
      recommendedFlora: ['세둠류', '기린초', '비비추', '눈향나무'],
    },
  ]);

  if (!isOpen) return null;

  const toggleIntervention = (id: string) => {
    setInterventions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const activeItems = interventions.filter((i) => i.enabled);
  const totalCost = activeItems.reduce((sum, i) => sum + i.costMillionKrw, 0);
  const totalGreenBoost = activeItems.reduce((sum, i) => sum + i.greenRatioBoost, 0);
  const totalCooling = activeItems.reduce((sum, i) => sum + i.coolingDelta, 0);
  const totalStormwater = activeItems.reduce((sum, i) => sum + i.stormwaterRetention, 0);
  const totalCarbon = activeItems.reduce((sum, i) => sum + i.carbonDelta, 0);

  const baselineGreenRatio = siteData.kpi.greenRatio;
  const simulatedGreenRatio = parseFloat((baselineGreenRatio + totalGreenBoost).toFixed(1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
              
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                그린인프라 최적 시뮬레이션 스튜디오
              </h3>
              <p className="text-xs text-slate-500">
                선택한 그린인프라 조합에 따른 녹지율 상승, 미기후 냉각, 우수 저류 및 탄소 저감 효과를 예측합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Combined Simulation KPI Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50/40 border border-emerald-200">
          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
              <Trees className="w-3.5 h-3.5" /> 예측 녹지율 변화
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-emerald-950">{simulatedGreenRatio}%</span>
              <span className="text-xs font-bold text-emerald-600">+{totalGreenBoost.toFixed(1)}%p</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">기존 {baselineGreenRatio}%</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5" /> 도시열섬 표면온도 저감
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-amber-900">-{totalCooling.toFixed(1)}°C</span>
              <span className="text-xs font-semibold text-amber-600">쿨링 효과</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">하절기 보행 쾌적성 대폭 증대</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="text-[11px] font-bold text-sky-700 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5" /> 빗물 유출 저류율
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-sky-950">+{totalStormwater}%</span>
              <span className="text-xs font-semibold text-sky-600">완충</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">침수 위험 분산 저류</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm">
            <div className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5" /> 연간 탄소 추가 흡수
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-teal-950">+{totalCarbon.toFixed(1)}</span>
              <span className="text-xs font-semibold text-teal-700">tCO2/yr</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">총 사업비 약 {totalCost}억원</div>
          </div>
        </div>

        {/* Interventions Selector */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>그린인프라 도입 시나리오 선택 및 토글</span>
            <span className="text-emerald-700">{activeItems.length}개 선택됨</span>
          </div>

          <div className="space-y-2.5">
            {interventions.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleIntervention(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  item.enabled
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      item.enabled ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                    }`}
                  >
                    {item.enabled && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white text-emerald-800 border border-emerald-200">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] font-bold text-slate-400">추천 식재:</span>
                      {item.recommendedFlora.map((f) => (
                        <span key={f} className="text-[9px] px-1.5 py-0.2 rounded bg-white text-slate-700 font-medium border border-slate-200">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 text-xs">
                  <div className="font-bold text-emerald-800">+{item.greenRatioBoost}%p 녹지</div>
                  <div className="text-[10px] text-slate-400 font-mono">약 {item.costMillionKrw}천만원</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            총 예상 사업 예산: <span className="font-bold text-slate-900">약 {totalCost}백만원</span> (국비·시비 보조금 매칭 가능)
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
          >
            시뮬레이션 설정 완료
          </button>
        </div>
      </div>
    </div>
  );
};
