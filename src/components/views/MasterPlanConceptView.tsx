import React, { useState } from 'react';
import {
  MapPin,
  ChevronRight,
  Search,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Info,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { SiteAnalysisData, OptimalCandidateSite, GreenInfraRecommendation } from '../../types';

interface MasterPlanConceptViewProps {
  data: SiteAnalysisData;
  onSelectCandidate: (candidate: OptimalCandidateSite) => void;
  onSelectGreenInfra?: (gi: GreenInfraRecommendation) => void;
  onGoToSimulation?: () => void;
  onOpenWeightModal?: () => void;
}

const resolveColorToken = (tokenOrHex: string): string => {
  if (!tokenOrHex) return 'var(--cat-1)';
  if (tokenOrHex.startsWith('--')) return `var(${tokenOrHex})`;
  if (tokenOrHex.startsWith('var(')) return tokenOrHex;
  return tokenOrHex;
};

const CASE_STUDIES = [
  {
    title: '서울 율곡로 지하화 상부 생태숲길 복원',
    location: '서울 종로구',
    type: '보행자 전용 가로숲길 / 생태통로',
    desc: '단절된 녹지축을 연결하고 도시 열섬 완화 및 보행자 녹색 쉼터 제공',
    query: '서울 율곡로 생태숲길 복원 그린인프라',
  },
  {
    title: '부산 온천천 수변공원 생태복원 및 식생수로',
    location: '부산 금정·동래구',
    type: '하천·수변 생태통로 & 저영향개발(LID)',
    desc: '도심 하천 수변 식생 군락 복원 및 투수성 보행로, 빗물정원 시범지',
    query: '부산 온천천 생태하천 수변공원 조경',
  },
  {
    title: '싱가포르 파크로얄 온 피커링 수직·옥상정원',
    location: '싱가포르 도심부',
    type: '스카이 옥상녹화 & 벽면수직정원',
    desc: '건축물 녹화율 200% 달성 및 건물 냉방부하 30% 저감 선진 사례',
    query: 'Parkroyal on Pickering green facade sky garden',
  },
  {
    title: '미국 포틀랜드 그린스트리트 LID 빗물정원',
    location: '미국 포틀랜드',
    type: '저영향개발(LID) 빗물정원 & 식생수로',
    desc: '도로변 유출 우수를 100% 흡수·여과하는 가로수 침투 빗물정원 표준',
    query: 'Portland Green Street rain garden bioretention',
  },
];

export const MasterPlanConceptView: React.FC<MasterPlanConceptViewProps> = ({
  data,
  onSelectCandidate,
  onSelectGreenInfra,
  onGoToSimulation,
  onOpenWeightModal,
}) => {
  const [activeSubView, setActiveSubView] = useState<'guide' | 'diagnosis' | 'cases'>('guide');
  const [caseSearchQuery, setCaseSearchQuery] = useState(data.siteName + ' 그린인프라 조경 설계 사례');

  const recommendations = data.greenInfraRecommendations || [];
  const candidateSites = data.candidateSites || [];

  const landCoverBreakdown = (data.landUse || []).map((item) => ({
    name: item.label,
    value: item.pct,
    color: resolveColorToken(item.color),
  }));

  const radarMetrics = (data.accessibilityRadar || []).map((item) => ({
    subject: item.category,
    score: item.score,
    fullMark: item.fullMark,
  }));

  const handleOpenGoogleSearch = (customQuery?: string) => {
    const q = customQuery || caseSearchQuery;
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-[var(--text-1)]">
      {/* Top Banner */}
      <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold border border-[var(--border-hair)] mb-2">
            <span>03 마스터플랜</span>
            <span>·</span>
            <span>기본구상 및 그린인프라 공간 조닝</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-1)]">
            그린인프라 공간 조닝 및 최적 설치 후보지 선정
          </h2>
          <p className="text-xs text-[var(--text-2)] mt-1 max-w-2xl">
            {data.siteName} 권역에 최적화된 그린인프라 유형의 공간 조닝 전략과 알고리즘이 산출한 상위 설치 후보지의 설계 가이드라인을 확인합니다.
          </p>
        </div>

        {onOpenWeightModal && (
          <button
            type="button"
            onClick={onOpenWeightModal}
            className="px-3.5 py-2 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs font-bold text-[var(--text-1)] transition-colors flex items-center gap-1.5 self-start md:self-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>MCDA 가중치 제어</span>
          </button>
        )}
      </div>

      {/* Top Sub-View Switcher Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border-hair)] pb-3 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubView('guide')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeSubView === 'guide'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
              : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>도입 가이드</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-hair)]">
            {recommendations.length}개 유형
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('diagnosis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeSubView === 'diagnosis'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
              : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
          }`}
        >
          
          <span>공간 진단과 그린인프라 제안</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('cases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeSubView === 'cases'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-dim)]'
              : 'bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>유사사례 검색</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)] font-normal">
            Google Images
          </span>
        </button>
      </div>

      {/* ── SubView 1: 도입 가이드 ── */}
      {activeSubView === 'guide' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hair)]">
              <div>
                <h3 className="font-bold text-[var(--text-1)] text-base">그린인프라 유형별 적합도 랭킹 & 우선 도입 가이드</h3>
                <p className="text-xs text-[var(--text-3)]">MCDA 종합 점수순 정렬된 조경 공간 유형</p>
              </div>
              <span className="text-xs font-medium text-[var(--accent)] bg-[var(--surface-2)] px-3 py-1 rounded-full border border-[var(--border-hair)]">
                총 {recommendations.length}개 유형 평가됨
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectGreenInfra && onSelectGreenInfra(rec)}
                  className="p-4 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hover:border-[var(--accent-dim)] transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold flex items-center justify-center border border-[var(--border-hair)]">
                          #{rec.priorityRank || 1}
                        </span>
                        <span className="font-bold text-[var(--text-1)] text-sm">{rec.title}</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-hair)]">
                        {rec.feasibilityScore}점
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-2)] line-clamp-2 mb-3">
                      {rec.solutionProposal || rec.targetProblem}
                    </p>

                    <div className="space-y-1.5 text-[11px] bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border-hair)] mb-3">
                      <div className="flex justify-between text-[var(--text-3)]">
                        <span>예상 쿨링 효과:</span>
                        <span className="font-bold text-[var(--text-1)]">{rec.expectedEffects?.coolingEffect || '-1.5°C'}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-3)]">
                        <span>우수 유출 저감:</span>
                        <span className="font-bold text-[var(--text-1)]">{rec.expectedEffects?.waterRetention || '+30%'}</span>
                      </div>
                      <div className="flex justify-between text-[var(--text-3)]">
                        <span>연간 탄소 흡수:</span>
                        <span className="font-bold text-[var(--text-1)]">{rec.expectedEffects?.carbonAbsorption || '+10 tCO2/yr'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-hair)] flex items-center justify-between text-xs text-[var(--text-3)] group-hover:text-[var(--accent)] font-medium">
                    <span>사업비: {rec.estimatedCostRange}</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate Sites Hotspots */}
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-hair)]">
              <div>
                <h3 className="font-bold text-[var(--text-1)] text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--accent)]" />
                  <span>최적 그린인프라 공간 후보지 (Hotspots #{1}~#{candidateSites.length})</span>
                </h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  지도 상에 마커로 매핑된 개별 후보지들의 세부 입지 특성, 권장 수종 및 도입 타당성
                </p>
              </div>
              <span className="text-xs text-[var(--text-3)]">카드 클릭 시 상세 인스펙터 호출</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidateSites.map((site) => (
                <div
                  key={site.id}
                  onClick={() => onSelectCandidate(site)}
                  className="p-4 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] hover:border-[var(--accent-dim)] hover:bg-[var(--surface-2)] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[var(--surface-2)] text-[var(--accent)] font-bold text-xs flex items-center justify-center border border-[var(--border-hair)] shrink-0">
                          #{site.rank}
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-1)] text-sm group-hover:text-[var(--accent)] transition-colors">
                            {site.name}
                          </h4>
                          <p className="text-[11px] text-[var(--text-3)]">{site.currentLandUse}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-2)] border border-[var(--border-hair)] px-2 py-0.5 rounded-md shrink-0">
                        적합도 {site.overallScore}점
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-2)] bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--border-hair)] mb-3">
                      {site.suitabilityRationale}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                      <div className="bg-[var(--surface-1)] p-2 rounded-lg border border-[var(--border-hair)]">
                        <span className="text-[var(--text-3)] block">도입 규모</span>
                        <span className="font-bold text-[var(--text-1)]">{(site.targetAreaM2 || 0).toLocaleString()} ㎡</span>
                      </div>
                      <div className="bg-[var(--surface-1)] p-2 rounded-lg border border-[var(--border-hair)]">
                        <span className="text-[var(--text-3)] block">추정 사업비</span>
                        <span className="font-bold text-[var(--accent)]">{site.estimatedBudgetKrw}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-2)]">
                      <span className="font-medium text-[var(--text-3)]">권장 식재 수종: </span>
                      <span className="text-[var(--accent)] font-medium">{site.recommendedFlora.join(', ')}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-hair)] flex items-center justify-between text-xs text-[var(--text-2)] group-hover:text-[var(--accent)] font-medium">
                    <span>상세 설계 도서 및 성능 시뮬레이션</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SubView 2: 공간 진단과 그린인프라 제안 ── */}
      {activeSubView === 'diagnosis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Comprehensive Text Diagnosis */}
            <div className="lg:col-span-2 bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-hair)]">
                <div>
                  <h3 className="font-bold text-[var(--text-1)] text-base">대상지 종합 공간 판독 및 AI 제안</h3>
                  <p className="text-xs text-[var(--text-3)]">{data.siteName} 권역 진단 문장</p>
                </div>
              </div>

              <div className="p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl text-xs text-[var(--text-2)] leading-relaxed space-y-3">
                <p>{data.summary}</p>
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border-hair)] text-[var(--text-1)]">
                  <div className="font-bold text-[var(--accent)] mb-1">핵심 제안 전략 (Core Recommendation)</div>
                  <div>{data.kpi.greenInfraPriority}</div>
                </div>
              </div>

              {/* Key Issues */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide">
                  주요 공간적 결핍 및 개선 과제 ({data.issues.length})
                </h4>
                <div className="space-y-2">
                  {data.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-1)]">{issue.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border-hair)]">
                            {issue.domain}
                          </span>
                        </div>
                        <p className="text-[var(--text-2)] leading-relaxed">{issue.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Charts (Land Cover & Accessibility Radar) */}
            <div className="space-y-5">
              {/* Land Cover Chart */}
              <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] space-y-3">
                <h4 className="font-bold text-[var(--text-1)] text-xs">토지 피복 비율 (Land Cover)</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={landCoverBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={64}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {landCoverBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#10151C',
                          borderColor: 'rgba(255,255,255,0.07)',
                          borderRadius: '8px',
                          color: '#E8EDF2',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {landCoverBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1 bg-[var(--surface-1)] rounded border border-[var(--border-hair)] px-2">
                      <span className="text-[var(--text-3)]">{item.name}</span>
                      <span className="font-mono font-bold text-[var(--text-1)]">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accessibility Radar */}
              <div className="bg-[var(--bg-panel)] rounded-2xl p-5 border border-[var(--border-hair)] space-y-3">
                <h4 className="font-bold text-[var(--text-1)] text-xs">공간 접근성 다각도 지표</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={56} data={radarMetrics}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#93A0AC', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="점수" dataKey="score" stroke="#35C6E8" fill="#35C6E8" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SubView 3: 유사사례 검색 ── */}
      {activeSubView === 'cases' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 border border-[var(--border-hair)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
              <div>
                <h3 className="font-bold text-[var(--text-1)] text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-[var(--accent)]" />
                  <span>국내외 그린인프라 우수 설계 사례 및 이미지 검색</span>
                </h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  대상지 성격과 유사한 국내외 선진 사례를 탐색하고 설계 아이디어를 벤치마킹합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={caseSearchQuery}
                    onChange={(e) => setCaseSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleOpenGoogleSearch();
                    }}
                    placeholder="사례 검색어 입력..."
                    className="h-9 px-3 pr-8 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] w-60"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenGoogleSearch()}
                    className="absolute right-2 top-2 text-[var(--text-3)] hover:text-[var(--accent)]"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenGoogleSearch()}
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs flex items-center gap-1.5 transition-opacity"
                >
                  <span>Google Images 검색</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Case Studies Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CASE_STUDIES.map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)] font-medium">
                        {c.type}
                      </span>
                      <span className="text-[11px] text-[var(--text-3)]">{c.location}</span>
                    </div>
                    <h4 className="font-bold text-sm text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed">{c.desc}</p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-hair)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-3)]">키워드: {c.query}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenGoogleSearch(c.query)}
                      className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>사례 이미지 보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Simulation Nav Button */}
      {onGoToSimulation && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onGoToSimulation}
            className="px-5 py-2.5 bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <span>04 정량적 성능 시뮬레이션 실행</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
