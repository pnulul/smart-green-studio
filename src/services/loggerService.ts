import { apiUrl } from './resourceService';

export interface LogEntry {
  timestamp: string;
  student_id: string;
  session_id: string;
  action: string;
  stage?: string;
  dataset_id?: string;
  dataset_name?: string;
  site_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  buffer_shape?: string;
  buffer_size?: number | string;
  status?: string;
  duration_ms?: number;
  details: string;
}

const generateSessionId = () => `session_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
let currentSessionId = generateSessionId();

export const loggerService = {
  resetSession: () => {
    currentSessionId = generateSessionId();
  },

  log: (studentId: string, action: string, details: string, extra?: Partial<LogEntry>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      student_id: studentId,
      session_id: currentSessionId,
      action,
      details,
      ...extra
    };

    // 1. Send to central backend (non-blocking)
    const endpoint = apiUrl('log');
    if (endpoint && studentId !== 'demo') fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      credentials: 'include',
    }).catch(err => {
      console.warn('[Logger] Failed to send log to server:', err);
    });

    // 2. Fallback to localStorage
    try {
      const existing = localStorage.getItem('sgs_usage_logs');
      const logs: any[] = existing ? JSON.parse(existing) : [];
      logs.push(entry);
      localStorage.setItem('sgs_usage_logs', JSON.stringify(logs));
      
      console.log(`[LOG] ${studentId} | ${action} | ${details}`);
    } catch (e) {
      console.warn('Failed to save log locally', e);
    }
  },
  
  exportLogs: () => {
    try {
      const existing = localStorage.getItem('sgs_usage_logs');
      if (!existing) {
        alert('저장된 로그가 없습니다.');
        return;
      }
      
      const blob = new Blob([existing], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sgs_usage_logs_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export logs', e);
    }
  },

  clearLogs: () => {
    localStorage.removeItem('sgs_usage_logs');
    console.log('[LOG] Logs cleared.');
  }
};
