import { useSyncExternalStore } from 'react';
import { MapPin } from 'lucide-react';
import {
  getUsagePreference, requestLocationSharing, setUsageEnabled, stopLocationSharing,
  subscribeUsage, usageAvailable,
} from '../services/usageTelemetry';

const locationText = {
  unshared: '위치 미공유', shared: '대략적인 접속 위치 공유 중',
  denied: '브라우저에서 위치 공유를 거부했습니다.', unavailable: '접속 위치를 확인할 수 없습니다.',
};

export function UsageSettings({ compact = false }: { compact?: boolean }) {
  const pref = useSyncExternalStore(subscribeUsage, getUsagePreference);
  if (!usageAvailable) return null;
  const controls = (
    <div className="space-y-2 text-xs leading-relaxed text-[var(--text-2)]">
      <p>체험 개선을 위해 방문 시각과 누른 기능을 익명 방문 번호로 연구실 Google 시트에 기록합니다.</p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={pref.enabled} onChange={e => setUsageEnabled(e.target.checked)} />
        익명 이용 기록 허용
      </label>
      {pref.enabled && <>
        <p>접속 위치 공유는 선택입니다. 허용하면 위도와 경도를 0.1도 단위로 반올림해 이번 방문에 기록합니다.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={pref.locating || pref.location === 'shared' ? stopLocationSharing : requestLocationSharing}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hair)] px-2 py-1.5 text-[var(--accent)]">
            <MapPin size={14} />{pref.locating ? '요청 취소' : pref.location === 'shared' ? '위치 공유 중지' : '접속 위치 공유'}
          </button>
          <span aria-live="polite">{pref.locating ? '위치 확인 중…' : locationText[pref.location]}</span>
        </div>
      </>}
    </div>
  );
  if (!compact) return <section data-usage-private className="mt-5 border-t border-[var(--border-hair)] pt-4">{controls}</section>;
  return <details data-usage-private className="relative">
    <summary className="cursor-pointer whitespace-nowrap rounded-lg border border-[var(--border-hair)] px-2 py-1.5 text-xs text-[var(--text-2)]">이용 기록</summary>
    <div className="absolute right-0 mt-2 w-64 max-w-[85vw] rounded-xl border border-[var(--border-hair)] bg-[var(--bg-canvas)] p-4 shadow-xl z-50">{controls}</div>
  </details>;
}
