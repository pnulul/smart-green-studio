import React, { useState, useEffect } from 'react';
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
import {
  Edit3,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Tag,
  MessageSquare,
  } from 'lucide-react';
import {
  SiteAnalysisData,
  GreenInfraRecommendation,
  OptimalCandidateSite,
  StudentAuthSession,
  StudentSpatialMemo,
} from '../types';

interface RightAnalysisPanelProps {
  data: SiteAnalysisData;
  onSelectGreenInfra?: (gi: GreenInfraRecommendation) => void;
  onSelectCandidateSite?: (candidate: OptimalCandidateSite) => void;
  onOpenSimulatorModal?: () => void;
  onOpenWeightModal?: () => void;
  currentPresetName?: string;
  session?: StudentAuthSession | null;
}

const STORAGE_KEY = 'sgs_student_spatial_memos';

const INITIAL_SAMPLE_MEMOS: StudentSpatialMemo[] = [
  {
    id: 'memo-init-1',
    siteName: '부산대학교 캠퍼스 일원',
    studentName: '김조경',
    studentId: '202315024',
    courseName: '조경계획학 및 실습',
    content: '금정산 자락과 캠퍼스 축을 잇는 보행가로변에 투수성 포장과 빗물정원(Rain Garden)을 연계 배치하여 우수 유출을 억제하고 열섬 취약 구역을 완화할 필요가 있음.',
    tags: ['#생태축연계', '#LID우수침투', '#열섬저감'],
    createdAt: '2026-08-23 15:30',
  },
];

const PRESET_TAGS = [
  '#생태축연계',
  '#보행환경개선',
  '#열섬저감',
  '#LID우수침투',
  '#식재다층화',
  '#주민휴게공간',
  '#가로녹화',
  '#바람길확보',
];

const resolveColorToken = (tokenOrHex: string): string => {
  if (!tokenOrHex) return 'var(--cat-1)';
  if (tokenOrHex.startsWith('--')) return `var(${tokenOrHex})`;
  if (tokenOrHex.startsWith('var(')) return tokenOrHex;
  return tokenOrHex;
};

export const RightAnalysisPanel: React.FC<RightAnalysisPanelProps> = ({
  data,
  onSelectGreenInfra,
  onSelectCandidateSite,
  onOpenSimulatorModal,
  onOpenWeightModal,
  currentPresetName = '기본 균형형',
  session,
}) => {
  const pois = data.pois || [];
  const greenInfraRecommendations = data.greenInfraRecommendations || [];
  const candidateSites = data.candidateSites || [];

  // Student Memos State
  const [memos, setMemos] = useState<StudentSpatialMemo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SAMPLE_MEMOS;
  });

  const [memoDraft, setMemoDraft] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllSiteMemos, setShowAllSiteMemos] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
    } catch {
      // ignore
    }
  }, [memos]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveMemo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!memoDraft.trim()) return;

    const authorName = session?.studentName || '수강생';
    const authorId = session?.studentId || 'STUDENT';
    const courseTitle = session?.courseName || '스마트 조경계획 실습';

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (editingMemoId) {
      setMemos((prev) =>
        prev.map((item) =>
          item.id === editingMemoId
            ? {
                ...item,
                content: memoDraft.trim(),
                tags: selectedTags,
                createdAt: `${timeStr} (수정됨)`,
              }
            : item
        )
      );
      setEditingMemoId(null);
    } else {
      const newMemo: StudentSpatialMemo = {
        id: `memo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        siteName: data.siteName,
        studentName: authorName,
        studentId: authorId,
        courseName: courseTitle,
        content: memoDraft.trim(),
        tags: selectedTags,
        createdAt: timeStr,
      };
      setMemos((prev) => [newMemo, ...prev]);
    }

    setMemoDraft('');
    setSelectedTags([]);
  };

  const handleEditMemo = (item: StudentSpatialMemo) => {
    setEditingMemoId(item.id);
    setMemoDraft(item.content);
    setSelectedTags(item.tags || []);
  };

  const handleDeleteMemo = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
    if (editingMemoId === id) {
      setEditingMemoId(null);
      setMemoDraft('');
      setSelectedTags([]);
    }
  };

  const handleCopyMemo = (item: StudentSpatialMemo) => {
    const text = `[Smart Green Studio 공간진단 메모]\n대상지: ${item.siteName}\n작성자: ${item.studentName} (${item.studentId})\n일시: ${item.createdAt}\n태그: ${item.tags.join(' ')}\n내용:\n${item.content}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentSiteMemos = showAllSiteMemos
    ? memos
    : memos.filter((m) => m.siteName === data.siteName);

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

  return (
    <aside id="right-analysis-panel" className="w-full lg:w-96 bg-[var(--bg-panel)] border-l border-[var(--border-hair)] flex flex-col h-full overflow-hidden flex-shrink-0 z-20 text-[var(--text-1)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-hair)] bg-[var(--bg-panel)] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] mb-0.5">
            AI Spatial Analysis & Strategy
          </div>
          <h2 className="text-base font-bold text-[var(--text-1)] tracking-tight">공간 진단 & 그린인프라 제안</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="weight-modal-btn"
            onClick={onOpenWeightModal}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] text-[var(--text-2)] font-medium hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors"
            title="MCDA 추천 알고리즘 가중치 조절"
          >
            <span>가중치</span>
          </button>
          <button
            type="button"
            id="open-sim-modal-btn"
            onClick={onOpenSimulatorModal}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-[var(--accent)] text-[#080B0F] font-bold hover:opacity-90 transition-opacity"
          >
            <span>시뮬레이션</span>
          </button>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--divider)] p-4 space-y-5">
        {/* ── 01. 공간 판독 요약 및 수강생 진단 아이디어 메모 ── */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
              <span>01 공간 종합 진단 & 학생 메모</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--surface-2)] text-[var(--accent)] font-medium border border-[var(--border-hair)]">
              {currentPresetName}
            </span>
          </div>

          {/* AI Automated Diagnosis Card */}
          <div className="p-3 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl text-xs text-[var(--text-2)] leading-relaxed">
            <div className="text-[10px] font-bold text-[var(--accent)] mb-1 flex items-center gap-1">
              
              <span>AI 종합 데이터 진단 요약</span>
            </div>
            {data.summary || '공간 데이터를 분석 중입니다.'}
          </div>

          {/* Counts Matrix */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-2)]">
                식생·공원
              </span>
              <span className="text-xs font-bold text-[var(--text-1)]">
                {pois.filter((p) => p.category === '식생·공원').length}개소
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-2)]">
                대중교통
              </span>
              <span className="text-xs font-bold text-[var(--text-1)]">
                {pois.filter((p) => p.category === '대중교통').length}개소
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-2)]">
                교육·공공
              </span>
              <span className="text-xs font-bold text-[var(--text-1)]">
                {pois.filter((p) => p.category === '교육·공공').length}개소
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-2)]">
                상업·생활
              </span>
              <span className="text-xs font-bold text-[var(--text-1)]">
                {pois.filter((p) => p.category === '상업·생활').length}개소
              </span>
            </div>
          </div>

          {/* ── 수강생 공간진단 및 설계 아이디어 메모 입력 & 보관함 ── */}
          <div id="student-diagnosis-memo-container" className="p-3.5 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-3">
            {/* Header with Student Identity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs font-bold text-[var(--text-1)]">
                  {editingMemoId ? '아이디어 메모 수정' : '수강생 공간진단 & 아이디어 메모'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-3)] font-mono">
                {session?.studentName ? (
                  <span className="text-[var(--accent)] font-semibold">
                    {session.studentName} ({session.studentId})
                  </span>
                ) : (
                  <span>수강생 메모</span>
                )}
              </div>
            </div>

            {/* Note Input Box */}
            <form onSubmit={handleSaveMemo} className="space-y-2.5">
              <textarea
                id="student-memo-textarea"
                rows={3}
                value={memoDraft}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="대상지 현장 답사 소견, 문제점 진단, 또는 적용할 그린인프라 아이디어를 메모로 남겨보세요..."
                className="w-full p-2.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-hair)] text-xs text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent-dim)] resize-none leading-relaxed"
              />

              {/* Tag Selector Chips */}
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />
                  <span>주요 키워드 태그 선택:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-[10px] px-1.5 py-0.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)] font-semibold'
                            : 'bg-[var(--surface-1)] text-[var(--text-3)] border-[var(--border-hair)] hover:text-[var(--text-2)]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[10px] text-[var(--text-3)]">
                  {data.siteName} 대상지 연계
                </div>
                <div className="flex items-center gap-1.5">
                  {editingMemoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMemoId(null);
                        setMemoDraft('');
                        setSelectedTags([]);
                      }}
                      className="px-2 py-1 text-[11px] rounded-lg bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border-hair)] transition-colors"
                    >
                      취소
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!memoDraft.trim()}
                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[var(--accent)] text-[#080B0F] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>{editingMemoId ? '수정 완료' : '메모 저장'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Saved Memos List */}
            <div className="pt-2 border-t border-[var(--divider)] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="font-semibold text-[var(--text-2)] flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-[var(--text-3)]" />
                  <span>기록된 아이디어 ({currentSiteMemos.length}건)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllSiteMemos(!showAllSiteMemos)}
                  className="text-[10px] text-[var(--accent)] hover:underline"
                >
                  {showAllSiteMemos ? '현재 대상지만 보기' : '전체 메모 보기'}
                </button>
              </div>

              {currentSiteMemos.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] text-[11px] text-[var(--text-3)]">
                  이 대상지에 등록된 학생 아이디어 메모가 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
                  {currentSiteMemos.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border-hair)] text-xs space-y-1.5 hover:border-[var(--accent-dim)] transition-colors group"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--text-1)]">
                            {item.studentName}
                          </span>
                          <span className="text-[var(--text-3)] font-mono">
                            ({item.studentId})
                          </span>
                          {showAllSiteMemos && (
                            <span className="px-1 py-0.2 rounded bg-[var(--surface-1)] text-[var(--accent)] text-[9px]">
                              {item.siteName}
                            </span>
                          )}
                        </div>
                        <span className="text-[var(--text-3)] text-[9.5px]">
                          {item.createdAt}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-1)] leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9.5px] px-1.5 py-0.2 rounded bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-hair)] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[var(--divider)] opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMemo(item)}
                          className="p-1 rounded text-[10px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] transition-colors flex items-center gap-0.5"
                          title="클립보드 복사"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-[var(--accent)]" />
                              <span className="text-[var(--accent)] text-[9px]">복사됨</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="text-[9px]">복사</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditMemo(item)}
                          className="p-1 rounded text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--surface-1)] transition-colors flex items-center gap-0.5"
                          title="메모 수정"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span className="text-[9px]">수정</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemo(item.id)}
                          className="p-1 rounded text-[10px] text-[var(--text-3)] hover:text-[var(--danger)] hover:bg-[var(--surface-1)] transition-colors flex items-center gap-0.5"
                          title="메모 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="text-[9px]">삭제</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 02. 추천 그린인프라 전략 & 최적 설치 위치 ── */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[var(--text-1)]">
              <span>02 추천 그린인프라 전략 & 최적 입지</span>
            </div>
            <button
              type="button"
              id="weight-adjust-link-btn"
              onClick={onOpenWeightModal}
              className="text-[10px] text-[var(--accent)] hover:underline font-medium"
            >
              <span>가중치 조절</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {greenInfraRecommendations.map((gi, idx) => {
              const matchedCandidate = candidateSites[idx];
              const coolingText = gi.expectedEffects?.coolingEffect || '-1.5 °C';
              const waterText = gi.expectedEffects?.waterRetention || '+30%';
              const carbonText = gi.expectedEffects?.carbonAbsorption || '+5.0 tCO2';

              return (
                <div
                  key={gi.id || idx}
                  className="p-3.5 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] rounded-2xl border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group cursor-pointer"
                  onClick={() => {
                    if (onSelectGreenInfra) onSelectGreenInfra(gi);
                    if (matchedCandidate && onSelectCandidateSite) onSelectCandidateSite(matchedCandidate);
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)]">
                        우선순위 #{gi.priorityRank || idx + 1}
                      </span>
                      <span className="text-[10px] text-[var(--text-1)] bg-[var(--surface-2)] border border-[var(--border-hair)] px-1.5 py-0.5 rounded-md font-semibold">
                        적합도 {gi.feasibilityScore || matchedCandidate?.overallScore || 85}점
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
                      {gi.title}
                    </h3>

                    <p className="text-[11px] text-[var(--text-2)] mt-1.5 leading-snug">{gi.solutionProposal || gi.targetProblem}</p>

                    {/* Target Site Rationale */}
                    <div className="mt-2.5 p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-hair)] text-[10.5px] text-[var(--text-2)] space-y-1">
                      <div className="font-semibold text-[var(--text-1)]">
                        <span>권장 대상지: {matchedCandidate?.name || gi.locationSuitability || '우선 후보지'}</span>
                      </div>
                      <div className="text-[var(--text-3)] text-[10px]">
                        {matchedCandidate?.suitabilityRationale || gi.locationSuitability || '입지 적합도 우수 구역'}
                      </div>
                    </div>

                    {/* Quantitative Expected Effect */}
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-center border border-[var(--border-hair)]">
                        <span className="text-[var(--text-3)] block text-[9px]">온도 저감</span>
                        <span className="font-bold text-[var(--accent)]">{coolingText}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-center border border-[var(--border-hair)]">
                        <span className="text-[var(--text-3)] block text-[9px]">유출 저감</span>
                        <span className="font-bold text-[var(--text-1)]">{waterText}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[var(--surface-2)] text-center border border-[var(--border-hair)]">
                        <span className="text-[var(--text-3)] block text-[9px]">탄소 흡수</span>
                        <span className="font-bold text-[var(--text-2)]">{carbonText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 03. 토지이용 구성비 (차트) ── */}
        <section className="space-y-3 pt-4">
          <div className="text-xs font-bold text-[var(--text-1)]">
            <span>03 토지이용 및 피복 현황 비율</span>
          </div>

          <div className="h-44 w-full bg-[var(--surface-1)] rounded-2xl p-2 border border-[var(--border-hair)] flex items-center justify-center">
            {landCoverBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={landCoverBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {landCoverBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-panel)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-panel)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-hair)',
                      fontSize: '11px',
                      color: 'var(--text-1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[var(--text-3)]">토지이용 데이터 없음</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {landCoverBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[var(--text-2)] truncate">{item.name}</span>
                </div>
                <span className="font-bold text-[var(--text-1)]">{item.value}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 04. 다기준 입지 적합도 레이더 (차트) ── */}
        <section className="space-y-3 pt-4">
          <div className="text-xs font-bold text-[var(--text-1)]">
            <span>04 다기준 공간 적합도 지수 (MCDA)</span>
          </div>

          <div className="h-48 w-full bg-[var(--surface-1)] rounded-2xl p-2 border border-[var(--border-hair)] flex items-center justify-center">
            {radarMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarMetrics}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#93A0AC', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.07)" tick={{ fill: '#5D6975', fontSize: 9 }} />
                  <Radar name="적합도 지수" dataKey="score" stroke="#35C6E8" fill="#35C6E8" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[var(--text-3)]">레이더 데이터 없음</div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};

