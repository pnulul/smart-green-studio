import React from 'react';
import {
  GitCompare,
  ClipboardList,
  Compass,
  Sliders,
  Activity,
  FileText,
  LogOut,
  Printer,
  Key,
  Microscope,
} from 'lucide-react';
import { LandscapeDesignStage, StudentAuthSession } from '../types';

export type DesignStageKey = LandscapeDesignStage;

interface HeaderProps {
  activeStage: DesignStageKey;
  onSelectStage: (stage: DesignStageKey) => void;
  onSelectPreset?: (key: string) => void;
  onOpenCompare: () => void;
  onOpenSimulator: () => void;
  onExportPdf: () => void;
  onOpenApiSettings?: () => void;
  selectedPresetKey?: string;
  session?: StudentAuthSession | null;
  onSwitchStudent?: () => void;
}

export const STAGES: { id: DesignStageKey; step: string; title: string; short: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'setup', step: '01', title: '대상지 설정', short: '설정', icon: Compass },
  { id: 'analysis', step: '02', title: '주제별 공간분석', short: '공간분석', icon: Activity },
  { id: 'ai_report', step: '03', title: '보고서', short: '보고서', icon: FileText },
  { id: 'ai_lab', step: '04', title: 'AI 연구실', short: 'AI 연구실', icon: Microscope },
];

export const Header: React.FC<HeaderProps> = ({
  activeStage,
  onSelectStage,
  onOpenCompare,
  onExportPdf,
  onOpenApiSettings,
  session,
  onSwitchStudent,
}) => {
  return (
    <header id="main-header" className="bg-[var(--bg-panel)] text-[var(--text-1)] flex flex-col z-30 flex-shrink-0 no-print border-b border-[var(--border-hair)]">
      {/* Top Bar: Brand & Lab Actions */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[var(--border-hair)]">
        {/* Left: Brand & Lab */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[var(--text-1)] flex items-center gap-1.5">
                Landscape Urbanism Lab
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)]">
                  PNU
                </span>
              </span>
              <span className="text-[11px] font-medium text-[var(--accent)] hidden lg:inline">
                Smart Green Studio
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-3)] font-normal hidden md:inline">
              부산대학교 조경학과 도시조경 연구실 · 스마트 조경설계 공간의사결정 플랫폼
            </span>
          </div>
        </div>

        {/* Right: Student Badge + Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Student session profile pill */}
          {session && (
            <button
              type="button"
              id="student-profile-pill"
              onClick={onSwitchStudent}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] cursor-pointer transition-colors text-xs group"
              title="클릭하여 수강생 및 과목 변경"
            >
              <div className="text-left hidden sm:block leading-tight">
                <div className="font-semibold text-[var(--text-1)] text-[11px] group-hover:text-[var(--accent)] transition-colors">
                  {session.studentName} <span className="text-[10px] text-[var(--text-3)] font-mono">({session.studentId})</span>
                </div>
                <div className="text-[9px] text-[var(--text-2)] truncate max-w-[140px]">
                  {session.courseName}
                </div>
              </div>
              <div className="sm:hidden font-semibold text-[var(--text-1)] text-[11px]">
                {session.studentName}
              </div>
              <LogOut className="w-3 h-3 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors ml-0.5" />
            </button>
          )}

          {onOpenApiSettings && (
            <button
              type="button"
              id="header-api-settings-btn"
              onClick={onOpenApiSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-hair)] text-xs font-semibold transition-colors hover:border-[var(--accent-dim)]"
              title="지도 및 공간 데이터 API Key 설정"
            >
              <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden sm:inline">API 설정</span>
            </button>
          )}

          {session?.studentId !== 'demo' && <button
            type="button"
            id="compare-modal-btn"
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border-hair)] text-xs font-semibold transition-colors hover:border-[var(--accent-dim)]"
            title="대상지 벤치마크 비교"
          >
            <GitCompare className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">예시 비교</span>
          </button>}

          <button
            type="button"
            id="export-pdf-btn"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] text-xs font-bold transition-opacity"
            title="설계도서 및 분석 리포트 인쇄"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">도서 출력</span>
          </button>
        </div>
      </div>

      {/* Bottom Bar: 4 Stage Buttons in Parallel */}
      <div className="px-3 sm:px-6 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-hair)]">
        <div className="max-w-5xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {STAGES.map((s) => {
            const Icon = s.icon;
            const isActive = activeStage === s.id;
            return (
              <button
                key={s.id}
                id={`stage-btn-${s.id}`}
                type="button"
                onClick={() => onSelectStage(s.id)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl text-xs font-medium transition-colors relative ${
                  isActive
                    ? 'bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--accent-dim)]'
                    : 'bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] border border-[var(--border-hair)]'
                }`}
              >
                {isActive && (
                  <span className="absolute -bottom-[2px] left-3 right-3 h-[2px] bg-[var(--accent)] rounded-full"></span>
                )}
                <span
                  className={`w-4.5 h-4.5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-[var(--accent)] text-[#080B0F]' : 'bg-[var(--surface-2)] text-[var(--text-3)]'
                  }`}
                >
                  {s.step}
                </span>
                <span className="hidden md:inline truncate">{s.title}</span>
                <span className="md:hidden truncate">{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

