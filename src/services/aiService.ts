import { GoogleGenAI } from '@google/genai';
import { AI_SYSTEM_INSTRUCTION, DEFAULT_GEMINI_MODEL, aiPrompt, type AiHistoryItem } from '../config/ai';
import { apiUrl } from './resourceService';

export async function serverAiAvailable(): Promise<boolean> {
  const url = apiUrl('ai/status');
  if (!url) return false;
  try {
    const response = await fetch(url, { credentials: 'include' });
    return response.ok && (await response.json()).configured === true;
  } catch { return false; }
}

export async function askAi(question: string, context: unknown, history: AiHistoryItem[], apiKey?: string, model = DEFAULT_GEMINI_MODEL) {
  if (apiKey?.trim()) {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim(), httpOptions: { timeout: 60000 } });
    const result = await ai.models.generateContent({
      model: model.trim() || DEFAULT_GEMINI_MODEL,
      contents: aiPrompt(question, context, history),
      config: { systemInstruction: AI_SYSTEM_INSTRUCTION, maxOutputTokens: 3000 },
    });
    if (!result.text?.trim()) throw new Error('AI 응답이 비어 있습니다. 다시 시도해 주세요.');
    return result.text;
  }
  const url = apiUrl('ai/chat');
  if (!url) throw new Error('Gemini API 키를 입력하면 AI 대화를 시작할 수 있습니다.');
  const response = await fetch(url, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context, history }), signal: AbortSignal.timeout(65000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'AI 서버에 연결하지 못했습니다.');
  return result.answer as string;
}
