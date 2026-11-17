import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  Search,
  Download,
  Copy,
  Check,
  Tag,
  BookOpen,
  Filter,
} from 'lucide-react';
import { StudentReflectionNote, SiteAnalysisData } from '../types';

interface AiReflectionNotePanelProps {
  data?: SiteAnalysisData;
}

const STAGE_OPTIONS = [
  { key: 'all', label: '전체 단계' },
  { key: 'stage1', label: '01 대상지분석' },
  { key: 'stage2', label: '02 적합도평가' },
  { key: 'stage3', label: '03 마스터플랜' },
  { key: 'stage4', label: '04 시뮬레이션' },
  { key: 'stage5', label: '05 설계도서' },
  { key: 'idea', label: '아이디어스케치' },
  { key: 'feedback', label: '멘토피드백' },
];

const INITIAL_PROMPTS = [
  '현 대상지의 미기후(바람길, 열섬 취약지)와 연계한 가로수 수종 및 식재 패턴 개선 아이디어는?',
  '고령 인구 비율과 어린이 보행 동선을 고려한 포켓파크 및 힐링 가든 배치 전략은?',
  '불투수면 저감을 위한 빗물정원(LID)과 투수성 포장의 최적 연계 구역은?',
  '주변 상권 및 대중교통 거점과 연결되는 보행 녹도 네트워크 활성화 방안은?',
  '법정 조경 기준을 넘어선 생태적 연속성(Ecological Corridor) 확보 방안은?',
];

export const AiReflectionNotePanel: React.FC<AiReflectionNotePanelProps> = ({ data }) => {
  const currentSiteName = data?.siteName || '선택 대상지';
  const greenRatio = data?.kpi?.greenRatio ?? 24;

  const [notes, setNotes] = useState<StudentReflectionNote[]>(() => {
    try {
      const saved = localStorage.getItem('sgs_reflection_notes');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed with a thoughtful default note
    return [
      {
        id: 'note-default-1',
        title: `${currentSiteName} 대상지 보행 녹도 및 열섬 저감 착안점`,
        stageKey: 'stage1',
        stageLabel: '01 대상지분석',
        content: `금정산 축에서 유입되는 하절기 바람길과 장전역 일대 고밀 상업지의 열섬 취약지를 연결하는 그린 코리더 조성이 필요함. 수관 피복률 ${greenRatio}%를 향상시키기 위해 도로변 띠녹지와 옥상녹화 연계를 검토할 것.`,
        designIdea: '보행자 전용 가로숲길 및 쿨링 쉼터 3개소 네트워크화',
        tags: ['바람길', '열섬저감', '가로수식재', 'LID'],
        createdAt: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }),
        updatedAt: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }),
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [stageKey, setStageKey] = useState('stage1');
  const [content, setContent] = useState('');
  const [designIdea, setDesignIdea] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('sgs_reflection_notes', JSON.stringify(notes));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [notes]);

  const handleResetForm = () => {
    setEditingId(null);
    setTitle('');
    setStageKey('stage1');
    setContent('');
    setDesignIdea('');
    setTagsInput('');
  };

  const handleStartEdit = (note: StudentReflectionNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setStageKey(note.stageKey);
    setContent(note.content);
    setDesignIdea(note.designIdea || '');
    setTagsInput(note.tags.join(', '));
    setActiveTab('editor');
  };

  const handleSaveNote = () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 성찰 내용을 입력해 주세요.');
      return;
    }

    const stageObj = STAGE_OPTIONS.find((s) => s.key === stageKey);
    const stageLabel = stageObj ? stageObj.label : '기타';
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const nowStr = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title,
                stageKey,
                stageLabel,
                content,
                designIdea,
                tags: parsedTags,
                updatedAt: nowStr,
              }
            : n
        )
      );
    } else {
      const newNote: StudentReflectionNote = {
        id: `note-${Date.now()}`,
        title,
        stageKey,
        stageLabel,
        content,
        designIdea,
        tags: parsedTags,
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    handleResetForm();
    setActiveTab('list');
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('해당 성찰 노트를 삭제하시겠습니까?')) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingId === id) handleResetForm();
    }
  };

  const handleCopyNote = (note: StudentReflectionNote) => {
    const text = `[${note.stageLabel}] ${note.title}\n\n성찰 내용:\n${note.content}\n\n설계 착안점:\n${note.designIdea}\n\n태그: ${note.tags.map((t) => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportMarkdown = () => {
    const mdContent = `# Smart Green Studio - AI Reflection Notes\n대상지: ${currentSiteName} (${data?.address || ''})\n내보낸 일자: ${new Date().toLocaleString()}\n\n---\n\n` +
      notes.map((n, i) => (
        `## ${i + 1}. ${n.title}\n` +
        `- **단계**: ${n.stageLabel}\n` +
        `- **작성일**: ${n.createdAt} (수정: ${n.updatedAt})\n` +
        `- **태그**: ${n.tags.map((t) => `#${t}`).join(', ')}\n\n` +
        `### 성찰 메모 & 분석 결과\n${n.content}\n\n` +
        `### 도출된 설계 착안점 (Design Idea)\n${n.designIdea || '없음'}\n\n---\n`
      )).join('\n');

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSiteName}_Reflection_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUsePrompt = (p: string) => {
    setContent((prev) => (prev ? `${prev}\n\n[발상 착안점] ${p}` : `[발상 착안점] ${p}\n`));
  };

  // Filtered notes
  const filteredNotes = notes.filter((n) => {
    const matchStage = filterStage === 'all' || n.stageKey === filterStage;
    const matchQuery =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStage && matchQuery;
  });

  return (
    <aside
      id="ai-reflection-note-panel"
      className="w-full lg:w-96 bg-[var(--bg-panel)] border-l border-[var(--border-hair)] flex flex-col h-full overflow-hidden flex-shrink-0 z-20 text-[var(--text-1)]"
    >
      {/* Panel Top Header */}
      <div className="p-4 border-b border-[var(--border-hair)] bg-[var(--bg-panel)] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] mb-0.5">
            STUDIO WORKBOOK & BLOG
          </div>
          <h2 className="text-base font-bold text-[var(--text-1)] tracking-tight">AI Reflection Note</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setActiveTab('editor');
            }}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1 font-medium ${
              activeTab === 'editor' && !editingId
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
            title="새 성찰 노트 작성"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>작성</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1 font-medium ${
              activeTab === 'list'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
            title="저장된 노트 보기"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>노트 ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Editor Form */}
      {activeTab === 'editor' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hair)]">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide">
              {editingId ? '성찰 메모 수정' : '새 성찰 메모 & 설계 아이디어'}
            </span>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
              >
                취소
              </button>
            )}
          </div>

          {/* Stage Selector */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">분석 및 설계 단계</label>
            <select
              value={stageKey}
              onChange={(e) => setStageKey(e.target.value)}
              className="w-full h-8 px-2.5 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] transition-colors"
            >
              {STAGE_OPTIONS.filter((s) => s.key !== 'all').map((s) => (
                <option key={s.key} value={s.key} className="bg-[#10151C] text-[#E8EDF2]">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note Title */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">성찰 노트 제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 보행 가로수 식재 및 빗물정원 연계 아이디어"
              className="w-full h-8 px-3 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] transition-colors"
            />
          </div>

          {/* Note Content */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
              분석 결과 관찰 & 성찰 메모
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="대상지 분석 과정에서 발견한 문제점, 공간적 한계, 또는 통계적 특이점을 기록하세요..."
              className="w-full p-2.5 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] leading-relaxed transition-colors custom-scrollbar"
            />
          </div>

          {/* Design Idea Field */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1">
              도출된 조경설계 착안점 (Design Idea)
            </label>
            <input
              type="text"
              value={designIdea}
              onChange={(e) => setDesignIdea(e.target.value)}
              placeholder="예: 3지 교차로 포켓파크 + 저류형 식생수로 조성"
              className="w-full h-8 px-3 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--accent)] placeholder-[var(--text-3)] transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[var(--text-3)]" />
              <span>핵심 태그 (쉼표로 구분)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="바람길, 우수저류, 보행네트워크, 수종선정"
              className="w-full h-8 px-3 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] transition-colors"
            />
          </div>

          {/* AI Thinking Prompt Suggestions */}
          <div className="p-3 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-[var(--text-2)] block">
              AI 생각 확장 프롬프트 (클릭하여 노트에 삽입)
            </span>
            <div className="space-y-1.5">
              {INITIAL_PROMPTS.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUsePrompt(prompt)}
                  className="w-full text-left p-2 rounded-xl bg-[var(--surface-2)] hover:border-[var(--accent-dim)] border border-[var(--border-hair)] text-[10.5px] text-[var(--text-2)] hover:text-[var(--text-1)] leading-snug transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveNote}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs flex items-center justify-center gap-1.5 transition-opacity"
          >
            <Save className="w-4 h-4" />
            <span>{editingId ? '성찰 노트 수정 완료' : '성찰 노트 저장'}</span>
          </button>
        </div>
      )}

      {/* Mode 2: Saved Notes List / Blog View */}
      {activeTab === 'list' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {/* Top Search & Filter Bar */}
          <div className="space-y-2 pb-2 border-b border-[var(--border-hair)]">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="노트 검색 (제목, 본문, 태그)..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-3)] absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-3)]">
                <Filter className="w-3 h-3" />
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="h-6 px-1.5 text-[11px] bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg text-[var(--text-2)] focus:outline-none"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key} className="bg-[#10151C] text-[#E8EDF2]">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {notes.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
                  title="전체 노트를 마크다운 파일로 다운로드"
                >
                  <Download className="w-3 h-3" />
                  <span>내보내기 (.md)</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes Cards Stream */}
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-3)] space-y-2">
              <p>저장된 성찰 노트가 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setActiveTab('editor');
                }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                첫 성찰 노트 작성하기
              </button>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-3.5 rounded-2xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] transition-all space-y-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)] font-medium mb-1">
                      {note.stageLabel}
                    </span>
                    <h3 className="font-bold text-xs text-[var(--text-1)] leading-snug">{note.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note)}
                      className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                      title="클립보드 복사"
                    >
                      {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(note)}
                      className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                      title="노트 수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 rounded text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                      title="노트 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-2)] leading-relaxed whitespace-pre-wrap">{note.content}</p>

                {note.designIdea && (
                  <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-hair)] text-[11px] text-[var(--accent)] font-medium">
                    <span className="text-[10px] text-[var(--text-3)] block mb-0.5">설계 착안점</span>
                    {note.designIdea}
                  </div>
                )}

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-hair)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-[9px] text-[var(--text-3)] pt-1 border-t border-[var(--divider)] flex justify-between">
                  <span>작성: {note.createdAt}</span>
                  {note.updatedAt !== note.createdAt && <span>수정: {note.updatedAt}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
};
