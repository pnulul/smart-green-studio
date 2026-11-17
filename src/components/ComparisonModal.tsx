import React, { useState } from 'react';
import { GitCompare, X, Search, Check, Trophy, ArrowRight } from 'lucide-react';
import { geocodeKoreanAddress, fetchLiveOsmAnalysis } from '../services/osmService';
import { PRESET_SITES } from '../data/presetSites';
import { SiteAnalysisData } from '../types';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSite: SiteAnalysisData;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, currentSite }) => {
  const [addrA, setAddrA] = useState(currentSite.address);
  const [addrB, setAddrB] = useState('부산광역시 해운대구 센텀중앙로 79');
  const [radiusA, setRadiusA] = useState<number>(500);
  const [radiusB, setRadiusB] = useState<number>(500);
  const [siteAData, setSiteAData] = useState<SiteAnalysisData>(currentSite);
  const [siteBData, setSiteBData] = useState<SiteAnalysisData | null>(PRESET_SITES.centum);
  const [isComparing, setIsComparing] = useState(false);

  if (!isOpen) return null;

  const handleRunCompare = async () => {
    setIsComparing(true);
    try {
      const [geoA, geoB] = await Promise.all([
        geocodeKoreanAddress(addrA),
        geocodeKoreanAddress(addrB),
      ]);

      const latA = geoA ? geoA.lat : currentSite.lat;
      const lngA = geoA ? geoA.lng : currentSite.lng;
      const latB = geoB ? geoB.lat : PRESET_SITES.centum.lat;
      const lngB = geoB ? geoB.lng : PRESET_SITES.centum.lng;

      const [resA, resB] = await Promise.all([
        fetchLiveOsmAnalysis(latA, lngA, radiusA as any, addrA),
        fetchLiveOsmAnalysis(latB, lngB, radiusB as any, addrB),
      ]);

      setSiteAData(resA);
      setSiteBData(resB);
    } catch (err) {
      console.warn('Comparison failed', err);
    } finally {
      setIsComparing(false);
    }
  };

  const metrics = siteBData
    ? [
        {
          label: '추정 녹지율 (%)',
          valA: siteAData.kpi.greenRatio,
          valB: siteBData.kpi.greenRatio,
          unit: '%',
          winA: siteAData.kpi.greenRatio > siteBData.kpi.greenRatio,
          winB: siteBData.kpi.greenRatio > siteAData.kpi.greenRatio,
          higherIsBetter: true,
        },
        {
          label: '반경 내 주요 시설 (개소)',
          valA: siteAData.kpi.facilitiesCount,
          valB: siteBData.kpi.facilitiesCount,
          unit: '개',
          winA: siteAData.kpi.facilitiesCount > siteBData.kpi.facilitiesCount,
          winB: siteBData.kpi.facilitiesCount > siteAData.kpi.facilitiesCount,
          higherIsBetter: true,
        },
        {
          label: '종합 접근성 점수',
          valA: siteAData.kpi.accessScore,
          valB: siteBData.kpi.accessScore,
          unit: '점',
          winA: siteAData.kpi.accessScore > siteBData.kpi.accessScore,
          winB: siteBData.kpi.accessScore > siteAData.kpi.accessScore,
          higherIsBetter: true,
        },
        {
          label: '불투수면 비율 (낮을수록 우수)',
          valA: siteAData.kpi.imperviousRatio,
          valB: siteBData.kpi.imperviousRatio,
          unit: '%',
          winA: siteAData.kpi.imperviousRatio < siteBData.kpi.imperviousRatio,
          winB: siteBData.kpi.imperviousRatio < siteAData.kpi.imperviousRatio,
          higherIsBetter: false,
        },
        {
          label: '연간 탄소 흡수량',
          valA: siteAData.kpi.carbonAbsorptionTons,
          valB: siteBData.kpi.carbonAbsorptionTons,
          unit: 'tCO2',
          winA: siteAData.kpi.carbonAbsorptionTons > siteBData.kpi.carbonAbsorptionTons,
          winB: siteBData.kpi.carbonAbsorptionTons > siteAData.kpi.carbonAbsorptionTons,
          higherIsBetter: true,
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">대상지 다자간 비교 분석 (Site Benchmark)</h3>
              <p className="text-xs text-slate-500">두 대상지의 녹지율, 접근성, 열섬 취약도, 시설 인프라를 나란히 대조합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Site A */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
            <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span>대상지 A (기준 대상지)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Site A</span>
            </div>
            <input
              type="text"
              value={addrA}
              onChange={(e) => setAddrA(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="주소 A 입력"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">반경:</span>
              <select
                value={radiusA}
                onChange={(e) => setRadiusA(parseInt(e.target.value))}
                className="h-7 text-xs px-2 bg-white border border-slate-300 rounded focus:outline-none"
              >
                <option value={300}>300m</option>
                <option value={500}>500m</option>
                <option value={1000}>1,000m</option>
              </select>
            </div>
          </div>

          {/* Site B */}
          <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-2">
            <div className="text-xs font-bold text-sky-900 flex items-center justify-between">
              <span>대상지 B (대조 대상지)</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">Site B</span>
            </div>
            <input
              type="text"
              value={addrB}
              onChange={(e) => setAddrB(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="주소 B 입력"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">반경:</span>
              <select
                value={radiusB}
                onChange={(e) => setRadiusB(parseInt(e.target.value))}
                className="h-7 text-xs px-2 bg-white border border-slate-300 rounded focus:outline-none"
              >
                <option value={300}>300m</option>
                <option value={500}>500m</option>
                <option value={1000}>1,000m</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleRunCompare}
            disabled={isComparing}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            {isComparing ? (
              <span>두 대상지 데이터 수집 중...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>비교 분석 실행</span>
              </>
            )}
          </button>
        </div>

        {/* Benchmark Results Table */}
        {siteBData && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">비교 핵심 지표</th>
                  <th className="py-3 px-4 text-emerald-800 bg-emerald-50/70">
                    A — {siteAData.siteName || siteAData.address.slice(0, 16)}
                  </th>
                  <th className="py-3 px-4 text-sky-800 bg-sky-50/70">
                    B — {siteBData.siteName || siteBData.address.slice(0, 16)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-700">{m.label}</td>
                    <td
                      className={`py-2.5 px-4 font-mono font-bold ${
                        m.winA ? 'text-emerald-700 bg-emerald-50/40 text-sm' : 'text-slate-600'
                      }`}
                    >
                      {m.valA} {m.unit}
                    </td>
                    <td
                      className={`py-2.5 px-4 font-mono font-bold ${
                        m.winB ? 'text-sky-700 bg-sky-50/40 text-sm' : 'text-slate-600'
                      }`}
                    >
                      {m.valB} {m.unit}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50">최우선 권고 그린인프라</td>
                  <td className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/30">
                    {siteAData.kpi.greenInfraPriority}
                  </td>
                  <td className="py-3 px-4 text-sky-800 font-bold bg-sky-50/30">
                    {siteBData.kpi.greenInfraPriority}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
