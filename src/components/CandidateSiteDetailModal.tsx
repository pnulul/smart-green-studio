import React from 'react';
import {
  X,
  MapPin,
  Flame,
  Droplets,
  TreePine,
  Users,
  Coins,
  ExternalLink,
  Target,
  CheckCircle2,
  Layers,
  Calendar,
} from 'lucide-react';
import { OptimalCandidateSite } from '../types';
import { GREEN_INFRA_META } from '../services/greenInfraAlgorithm';

interface CandidateSiteDetailModalProps {
  candidate: OptimalCandidateSite | null;
  onClose: () => void;
  onFocusOnMap?: (lat: number, lng: number) => void;
}

export const CandidateSiteDetailModal: React.FC<CandidateSiteDetailModalProps> = ({
  candidate,
  onClose,
  onFocusOnMap,
}) => {
  if (!candidate) return null;

  const meta = GREEN_INFRA_META[candidate.type] || {
    label: candidate.typeLabel,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: '',
    typicalAreaRange: `${candidate.targetAreaM2} ㎡`,
    description: candidate.suitabilityRationale,
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-mono font-bold text-xs">
                  우선순위 #{candidate.rank}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/15 text-emerald-200 text-xs font-semibold">
                  적합도 {candidate.overallScore}점
                </span>
              </div>
              <h3 className="font-bold text-base text-white mt-1">{candidate.name}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Location & Land Use Spec Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">설치 위치 및 부지 현황</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{candidate.currentLandUse}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{candidate.approxAddress}</div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">설치 권장 규모 & 예산</div>
                <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-2">
                  <span className="text-emerald-700">
                    면적 {(candidate.targetAreaM2 ?? (candidate as any).areaM2 ?? 0).toLocaleString()} ㎡
                    {candidate.targetLengthM ? ` (연장 ${candidate.targetLengthM}m)` : ''}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-1">
                  추정 사업비: <span className="font-bold text-slate-800">{candidate.estimatedBudgetKrw}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rationale */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>입지 선정 근거 및 대상지 문제 해결 방안</span>
            </h4>
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-slate-800 leading-relaxed text-[11.5px]">
              {candidate.suitabilityRationale}
            </div>
          </div>

          {/* Expected Quantitative Benefits */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
              
              <span>도입 시 정량적 기대 효과 (Expected Quantitative Benefits)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                  <Flame className="w-3.5 h-3.5" />
                  <span>열섬 완화</span>
                </div>
                <div className="font-bold text-rose-950 text-xs mt-1.5">
                  {candidate.expectedEffects.coolingDelta}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">표면 복사열 저감</div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200">
                <div className="flex items-center gap-1 text-cyan-700 font-bold text-[11px]">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>우수 저류</span>
                </div>
                <div className="font-bold text-cyan-950 text-xs mt-1.5">
                  {candidate.expectedEffects.stormwaterRetention}
                </div>
                <div className="text-[10px] text-cyan-600 mt-0.5">침수방재 및 정화</div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                  <TreePine className="w-3.5 h-3.5" />
                  <span>탄소 흡수</span>
                </div>
                <div className="font-bold text-emerald-950 text-xs mt-1.5">
                  {candidate.expectedEffects.carbonAbsorption}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">온실가스 감축</div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-1 text-indigo-700 font-bold text-[11px]">
                  <Users className="w-3.5 h-3.5" />
                  <span>주민 수혜</span>
                </div>
                <div className="font-bold text-indigo-950 text-xs mt-1.5">
                  {candidate.expectedEffects.beneficiaryPop.slice(0, 14)}
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">보행 쉼터 확충</div>
              </div>
            </div>
          </div>

          {/* Factor Breakdown */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>다기준 의사결정(MCDA) 평가 요소별 득점 분석</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {candidate.factorScores.map((factor, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] text-slate-500 truncate">{factor.factorName}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800">{factor.score}점</span>
                    <span className="text-[10px] text-emerald-600 font-medium">가중치 {factor.weightPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Species */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
              <TreePine className="w-4 h-4 text-emerald-600" />
              <span>추천 수종 및 식재 가이드라인</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {candidate.recommendedFlora.map((flora, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100/70 border border-emerald-300/80 text-emerald-900 font-semibold text-[11px]"
                >
                  {flora}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            좌표: {candidate.lat.toFixed(5)}, {candidate.lng.toFixed(5)}
          </div>
          <div className="flex items-center gap-2">
            {onFocusOnMap && (
              <button
                type="button"
                onClick={() => {
                  onFocusOnMap(candidate.lat, candidate.lng);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>지도에서 위치 확인</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
