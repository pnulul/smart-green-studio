import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, LoaderCircle, KeyRound } from 'lucide-react';
import type { SiteAnalysisData, AlgorithmWeights, PresetProfileId, AnalysisContext, CommonSpatialAnalysisResult, StudentAuthSession } from '../../types';
import type { GoogleSearchItem } from '../../services/googleSearchService';
import { buildAiResearchContext } from '../../services/analysisContextBuilder';
import { askAi, serverAiAvailable } from '../../services/aiService';
import { DEFAULT_GEMINI_MODEL } from '../../config/ai';
import { loggerService } from '../../services/loggerService';

interface Props {
  session?: StudentAuthSession | null;
  currentSite: SiteAnalysisData;
  currentWeights: AlgorithmWeights;
  currentPresetId: PresetProfileId;
  analysisContext: AnalysisContext;
  spatialAnalysisResults?: Record<string, CommonSpatialAnalysisResult & { status: string; errorMessage?: string }>;
  newsResults: GoogleSearchItem[];
}
type Message = { id: string; role: 'user' | 'ai'; content: string };
const QUESTIONS = ['공간분석 결과를 종합해 주세요.', '대상지의 주요 제약과 기회를 설명해 주세요.', '조경계획 대안을 비교할 판단 기준을 제안해 주세요.', '계획을 결정하기 전에 더 확인해야 할 근거는 무엇인가요?'];

export const AiResearchLabView: React.FC<Props> = ({ session, currentSite, spatialAnalysisResults = {}, newsResults }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [serverReady, setServerReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const context = buildAiResearchContext(currentSite, spatialAnalysisResults, newsResults);
  const count = Object.keys(context.analyses).length;
  const ready = !!apiKey.trim() || serverReady;
  useEffect(() => { serverAiAvailable().then(setServerReady); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, busy]);
  // 대상지를 바꾸면 이전 대상지의 대화가 섞이지 않도록 초기화합니다.
  const targetKey = `${currentSite.lat}:${currentSite.lng}:${currentSite.activeRadius}`;
  useEffect(() => { setMessages([]); setError(''); }, [targetKey]);
  const targetRef = useRef(targetKey);
  targetRef.current = targetKey;
  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    if (!ready) { setError('Gemini API 키를 연결하면 AI 대화를 시작할 수 있습니다. 공간분석과 보고서는 키 없이 이용할 수 있습니다.'); return; }
    const requestTarget = targetKey;
    setBusy(true); setError('');
    const started = Date.now();
    const history = messages.slice(-8);
    setMessages(prev => [...prev, { id: `${started}-u`, role: 'user', content: question }]); setInput('');
    try {
      const answer = await askAi(question, context, history, apiKey, model);
      if (targetRef.current !== requestTarget) return;
      setMessages(prev => [...prev, { id: `${started}-a`, role: 'ai', content: answer }]);
      loggerService.log(session?.studentId || 'demo', 'AI_ANSWER', '공간분석 기반 AI 답변 수신', { stage: 'ai_lab', site_name: currentSite.siteName, status: 'success', duration_ms: Date.now() - started });
    } catch (e) {
      if (targetRef.current === requestTarget) setError(apiKey ? 'AI 응답을 받지 못했습니다. 입력한 API 키와 모델, Google AI Studio의 사용 한도를 확인해 주세요.' : e instanceof Error ? e.message : 'AI 연결에 실패했습니다.');
    } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)] text-[var(--text-1)]">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="border-b border-[var(--border-hair)] pb-4">
          <p className="text-xs text-[var(--accent)] mb-2">EVIDENCE TO DECISION</p>
          <h2 className="text-xl font-bold">AI 연구실</h2>
          <p className="text-sm text-[var(--text-2)] mt-2">대상지의 공간분석 결과를 해석하고 계획의 판단 근거를 검토합니다.</p>
        </div>
        <div className="card p-4 border border-[var(--border-hair)] bg-[var(--surface-1)] rounded-xl">
          <h3 className="font-semibold text-sm">{currentSite.siteName || '선택한 대상지'}</h3>
          <p className="text-xs text-[var(--text-2)] mt-2">분석 반경 {currentSite.activeRadius}m / 완료한 공간분석 {count}개 / 지역 뉴스 {newsResults.length}건</p>
          {!count && <p className="text-xs text-[var(--warn)] mt-3">공간분석 탭에서 분석을 먼저 실행하면 실제 산출 결과를 대화에 활용합니다.</p>}
        </div>
        <details open={!serverReady} className="p-4 border border-[var(--border-hair)] bg-[var(--surface-1)] rounded-xl">
          <summary data-usage-action="ai-setup" className="text-sm font-semibold cursor-pointer"><KeyRound className="inline w-4 h-4 mr-2" />{serverReady ? '수업용 AI 연결됨 / 개인 키 설정' : 'AI 연결 설정'}</summary>
          <div className="mt-4 space-y-3">
            <label className="text-xs block">Gemini API 키<input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Google AI Studio에서 발급한 키" className="block mt-1 w-full bg-[var(--surface-2)] p-3 rounded-lg" /></label>
            <label className="text-xs block">모델<input value={model} onChange={e => setModel(e.target.value)} className="block mt-1 w-full bg-[var(--surface-2)] p-3 rounded-lg" /></label>
            <p className="text-xs text-[var(--text-3)] leading-5">개인 키는 이 탭의 메모리에서만 사용하며 저장하지 않습니다. 질문과 분석 요약은 Google Gemini로 전송됩니다. API 사용 요금과 한도는 해당 키의 계정에 적용됩니다.</p>
            <a data-usage-action="ai-key-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] underline">Google AI Studio에서 키 발급 ↗</a>
          </div>
        </details>
        <div className="flex flex-wrap gap-2">{QUESTIONS.map(q => <button data-usage-action="ai-prompt" key={q} onClick={() => setInput(q)} className="text-xs text-[var(--text-2)] p-2 rounded-lg border border-[var(--border-hair)] hover:text-[var(--accent)]">{q}</button>)}</div>
        {!messages.length && <p className="text-sm text-[var(--text-3)] leading-7 py-5">분석된 수치와 공간적 특성에 관해 질문하세요.<br />AI는 해석과 대안 검토를 돕고, 최종 계획은 사용자가 결정합니다.</p>}
        {messages.map(msg => <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center shrink-0">{msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[var(--accent)]" />}</div>
          <div className="p-4 max-w-[88%] bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl text-sm leading-7 whitespace-pre-wrap">{msg.content}</div>
        </div>)}
        {busy && <div role="status" className="flex gap-2 text-sm text-[var(--accent)]"><LoaderCircle className="w-4 h-4 animate-spin" /> 분석 근거를 검토하고 있습니다...</div>}
        {error && <p role="alert" className="text-sm text-red-400 p-3 border border-red-400/30 rounded-xl">{error}</p>}
        <div ref={end} />
      </div>
      <form data-usage-submit="ai-send" onSubmit={e => { e.preventDefault(); void send(); }} className="p-4 border-t border-[var(--border-hair)] flex gap-2 bg-[var(--surface-1)]">
        <textarea aria-label="AI 질문" value={input} maxLength={4000} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder="분석 결과에 관해 질문하세요" className="flex-1 min-h-14 max-h-32 bg-[var(--surface-2)] rounded-xl p-3 text-sm resize-y" />
        <button data-usage-action="ai-send" type="submit" aria-label="질문 보내기" disabled={busy || !input.trim()} className="w-14 bg-[var(--accent)] rounded-xl text-[#080B0F] flex items-center justify-center disabled:opacity-40"><Send className="w-5 h-5" /></button>
      </form>
    </div>
  );
};
