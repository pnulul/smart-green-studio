import React from 'react';
import {
  Building2,
  Eye,
  Users,
  Briefcase,
  Leaf,
  Compass,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { SiteAnalysisData } from '../types';

interface BottomDomainCardsProps {
  data: SiteAnalysisData;
}

export const BottomDomainCards: React.FC<BottomDomainCardsProps> = ({ data }) => {
  const { urban, landscape, demographic, socioEconomic, natural } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
      {/* ── Card 1: 도시·군 기본계획 ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>01 도시·군 관리계획</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">상위계획 검토 — 용도지역·용적률</p>

          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {urban.zoningName}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">용적률 / 건폐율</span>
              <span className="font-semibold text-slate-800">
                {urban.floorAreaRatio}% / {urban.buildingCoverageRatio}%
              </span>
            </div>
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">최고 층수</span>
              <span className="font-semibold text-slate-800">{urban.maxFloors}층</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-slate-500">생활권역</span>
              <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[120px]">{urban.livingSphere}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
          <div>
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              <span>계획 완료율</span>
              <span className="text-indigo-600 font-bold">{urban.completionProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${urban.completionProgress}%` }}
              />
            </div>
          </div>
          <div className="text-[9px] text-slate-500 italic truncate">{urban.legalGreenMandate}</div>
        </div>
      </div>

      {/* ── Card 2: 경관계획 ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>02 경관 계획</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">상위계획 검토 — 경관유형·권고수종</p>

          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {landscape.landscapeZoneName}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">경관 유형</span>
              <span className="font-semibold text-slate-800 text-[11px]">{landscape.landscapeType}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">주요 조망축</span>
              <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[110px]">{landscape.viewCorridor}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-slate-500">권장 색채</span>
              <span className="font-semibold text-slate-800 text-[11px]">{landscape.colorPalette}</span>
            </div>
          </div>
        </div>

        {/* Recommended Species Tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-semibold text-slate-500 mb-1">권고 수종 (Landscape Flora)</div>
          <div className="flex flex-wrap gap-1">
            {landscape.recommendedSpecies.slice(0, 4).map((sp) => (
              <span key={sp} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium">
                {sp}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 3: 인구 및 인문환경 ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>03 인구 및 인문환경</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">지역 이해 — 인구·세대·고령화</p>

          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {demographic.admDong}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">총 인구 / 세대</span>
              <span className="font-semibold text-slate-800 text-[11px]">{demographic.totalPop}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">고령화 비율</span>
              <span className="font-semibold text-slate-800 text-[11px]">{demographic.agingRatio}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-slate-500">인구 밀도</span>
              <span className="font-semibold text-slate-800 text-[11px]">{demographic.popDensity}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1">
            {demographic.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 4: 사회 및 경제환경 ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
            <span>04 사회 및 경제환경</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">지역 이해 — 상업·공원 충족도</p>

          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-full">
              {socioEconomic.dominantUse}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">상업시설 밀집</span>
              <span className="font-semibold text-slate-800 text-[11px]">{socioEconomic.commercialFacilities}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">1인당 공원면적</span>
              <span className="font-semibold text-slate-800 text-[11px]">{socioEconomic.parkAreaPerCapita}</span>
            </div>
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-slate-500">공원 충족도</span>
              <span className="font-semibold text-slate-800 text-[11px]">{socioEconomic.parkSatisfaction}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1">
            {socioEconomic.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Card 5: 자연 및 기후환경 ── */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
            <Leaf className="w-3.5 h-3.5 text-teal-600" />
            <span>05 자연 및 기후환경</span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2">지역 이해 — 토지피복·바람길·기온</p>

          <div className="mb-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {natural.dominantWindDir}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">산림·녹지 / 수계</span>
              <span className="font-semibold text-slate-800 text-[11px]">
                {natural.forestRatio}% / {natural.waterRatio}%
              </span>
            </div>
            <div className="flex justify-between items-baseline py-0.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500">연평균 기온 / 강수</span>
              <span className="font-semibold text-slate-800 text-[11px]">
                {natural.avgAnnualTemp} / {natural.annualRainfall}
              </span>
            </div>
            <div className="flex justify-between items-baseline py-0.5">
              <span className="text-[11px] text-slate-500">평균 경사도 / 향</span>
              <span className="font-semibold text-slate-800 text-[11px]">{natural.averageSlope}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1">
            {natural.tags.map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
