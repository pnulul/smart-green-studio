import React, { useEffect, useState } from 'react';
import { ArrowRight, GraduationCap, Leaf, Lock } from 'lucide-react';
import { StudentAuthSession } from '../types';
import { PNU_COURSES } from '../config/courses';
import { apiUrl } from '../services/resourceService';
import { UsageSettings } from './UsageSettings';

export { PNU_COURSES } from '../config/courses';

export const StudentAuthGate: React.FC<{ onLoginSuccess: (session: StudentAuthSession) => void }> = ({ onLoginSuccess }) => {
  const [config, setConfig] = useState({ courseLogin: false, demo: import.meta.env.VITE_ALLOW_DEMO !== 'false' });
  const [courseCode, setCourseCode] = useState(PNU_COURSES[0].code);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const endpoint = apiUrl('auth/config');
    if (endpoint) fetch(endpoint, { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(c => c && setConfig(c)).catch(() => {});
  }, []);
  const enter = (session: StudentAuthSession) => {
    localStorage.setItem('pnu_landscape_session', JSON.stringify(session));
    onLoginSuccess(session);
  };
  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    const endpoint = apiUrl('auth/login');
    if (!endpoint) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentName, studentId, password, courseCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '로그인하지 못했습니다.');
      enter(data);
    } catch (e) { setError(e instanceof Error ? e.message : '서버 연결을 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-1)] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 border border-[var(--border-hair)] rounded-3xl overflow-hidden bg-[var(--surface-1)] shadow-2xl">
        <section className="p-8 md:p-10 bg-[var(--surface-2)] flex flex-col justify-between gap-12">
          <div>
            <Leaf className="w-10 h-10 text-[var(--accent)] mb-6" />
            <p className="text-xs tracking-widest text-[var(--accent)] mb-3">LANDSCAPE URBANISM LAB AT PNU</p>
            <h1 className="text-4xl font-bold leading-tight">Smart Green<br />Studio</h1>
            <p className="mt-5 text-[var(--text-2)] leading-relaxed">공간데이터에서 계획의 근거로.<br />대상지 분석과 근거 해석을 연결하는 조경계획 학습 환경</p>
          </div>
          <div className="text-sm text-[var(--text-3)] leading-7">부산대학교 조경학과 도시조경 연구실<br />공간분석 / 분석 보고서 / AI 연구실</div>
        </section>
        <section className="p-8 md:p-10 flex flex-col justify-center">
          <GraduationCap className="w-8 h-8 text-[var(--accent)] mb-4" />
          <h2 className="text-2xl font-bold mb-3">스튜디오 시작하기</h2>
          <p className="text-sm text-[var(--text-2)] mb-7 leading-6">대상지를 선택하고 공간분석을 실행한 뒤 결과를 비교하고 해석하세요.</p>
          {config.demo && <button data-usage-action="demo" onClick={() => enter({ isLoggedIn: true, studentName: '체험 사용자', studentId: 'demo', courseName: 'Smart Green Studio 공개 체험', courseCode: 'DEMO', authTime: new Date().toISOString() })} className="w-full flex items-center justify-between bg-[var(--accent)] text-[#080B0F] font-bold p-4 rounded-xl">로그인 없이 체험하기 <ArrowRight className="w-5 h-5" /></button>}
          {config.courseLogin && <details className="mt-6 border-t border-[var(--border-hair)] pt-5">
            <summary className="cursor-pointer flex gap-2 items-center text-sm font-semibold"><Lock className="w-4 h-4" /> 수강생 로그인</summary>
            <form onSubmit={login} className="mt-4 space-y-3">
              <label className="block text-xs">수업<select value={courseCode} onChange={e => setCourseCode(e.target.value)} className="block w-full p-3 mt-1 rounded-lg bg-[var(--surface-2)]">{PNU_COURSES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
              <label className="block text-xs">이름<input required maxLength={100} autoComplete="name" value={studentName} onChange={e => setStudentName(e.target.value)} className="block w-full p-3 mt-1 rounded-lg bg-[var(--surface-2)]" /></label>
              <label className="block text-xs">발급 ID<input required pattern="[0-9]{5}" inputMode="numeric" maxLength={5} autoComplete="username" value={studentId} onChange={e => setStudentId(e.target.value)} className="block w-full p-3 mt-1 rounded-lg bg-[var(--surface-2)]" /></label>
              <label className="block text-xs">수업 비밀번호<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full p-3 mt-1 rounded-lg bg-[var(--surface-2)]" /></label>
              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
              <button disabled={busy} className="w-full border border-[var(--accent)] text-[var(--accent)] rounded-lg p-3 disabled:opacity-50">{busy ? '확인 중...' : '로그인'}</button>
            </form>
          </details>}
          {!config.demo && !config.courseLogin && <p>운영자에게 접속 설정을 확인해 주세요.</p>}
          <a data-usage-action="vr" href="https://pnulul.github.io/vr/" target="_blank" rel="noopener noreferrer" className="mt-6 text-sm text-[var(--accent)] underline underline-offset-4">수목 관리 VR 실습 바로가기 ↗</a>
          <UsageSettings />
        </section>
      </div>
    </main>
  );
};
