import React, { useState } from 'react';
import { RadiusOption, BufferShape } from '../../types';
import {
  Search,
  MapPin,
  Square,
  Circle,
  Crosshair,
  Key,
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { geocodingService } from '../../services/geocodingService';

interface SetupViewProps {
  siteName: string;
  setSiteName: (name: string) => void;
  address: string;
  setAddress: (addr: string) => void;
  lat: number;
  setLat: (lat: number) => void;
  lng: number;
  setLng: (lng: number) => void;
  radius: RadiusOption;
  setRadius: (r: RadiusOption) => void;
  bufferShape: BufferShape;
  setBufferShape: (shape: BufferShape) => void;
  onConfirm: () => void;
  isLoading: boolean;
  onOpenApiSettings: () => void;
  googleMapsApiKey?: string;
  vworldKey?: string;
}

const RADIUS_OPTIONS: RadiusOption[] = [250, 500, 1000, 1500, 2000];

export const SetupView: React.FC<SetupViewProps> = ({
  siteName,
  setSiteName,
  address,
  setAddress,
  lat,
  setLat,
  lng,
  setLng,
  radius,
  setRadius,
  bufferShape,
  setBufferShape,
  onConfirm,
  isLoading,
  onOpenApiSettings,
  googleMapsApiKey,
  vworldKey,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);

  // Direct Coord inputs
  const [manualLat, setManualLat] = useState(lat.toString());
  const [manualLng, setManualLng] = useState(lng.toString());
  const [coordError, setCoordError] = useState<string | null>(null);

  // Sync coords when lat/lng change from outside (e.g. map click)
  React.useEffect(() => {
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
  }, [lat, lng]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchSuccess(null);

    try {
      const result = await geocodingService.geocode(query, {
        googleApiKey: googleMapsApiKey,
        vworldKey: vworldKey,
      });

      if (result) {
        setLat(result.lat);
        setLng(result.lng);
        setAddress(result.displayName);
        setSiteName(result.siteName || query);
        setSearchSuccess(`'${result.displayName}' 위치가 선택되었습니다.`);
        setTimeout(() => setSearchSuccess(null), 4000);
      } else {
        setSearchError('검색 결과를 찾을 수 없습니다. 주소나 지명을 다시 확인해주세요.');
      }
    } catch (err: any) {
      setSearchError('Geocoding 서비스 연결을 확인해주세요. ' + (err?.message || ''));
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyManualCoords = async () => {
    setCoordError(null);
    const parsedLat = parseFloat(manualLat);
    const parsedLng = parseFloat(manualLng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setCoordError('유효한 숫자 형식의 위도와 경도를 입력해주세요.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setCoordError('위도는 -90 ~ 90 사이의 값이어야 합니다.');
      return;
    }
    if (parsedLng < -180 || parsedLng > 180) {
      setCoordError('경도는 -180 ~ 180 사이의 값이어야 합니다.');
      return;
    }

    setLat(parseFloat(parsedLat.toFixed(6)));
    setLng(parseFloat(parsedLng.toFixed(6)));

    // Reverse geocode to get human address
    try {
      const rev = await geocodingService.reverseGeocode(parsedLat, parsedLng, {
        googleApiKey: googleMapsApiKey,
        vworldKey,
      });
      setAddress(rev.address);
      setSiteName(rev.siteName || '직접 지정 지점');
      setSearchSuccess('좌표가 적용되었습니다.');
      setTimeout(() => setSearchSuccess(null), 3000);
    } catch {
      setAddress(`위도 ${parsedLat.toFixed(5)}, 경도 ${parsedLng.toFixed(5)}`);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('브라우저가 GPS 위치 조회를 지원하지 않습니다.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const cLat = parseFloat(pos.coords.latitude.toFixed(6));
        const cLng = parseFloat(pos.coords.longitude.toFixed(6));
        setLat(cLat);
        setLng(cLng);
        try {
          const rev = await geocodingService.reverseGeocode(cLat, cLng, {
            googleApiKey: googleMapsApiKey,
            vworldKey,
          });
          setAddress(rev.address);
          setSiteName('내 현재 위치');
        } catch {
          setAddress(`현재 위치 (${cLat.toFixed(4)}, ${cLng.toFixed(4)})`);
          setSiteName('내 현재 위치');
        }
      },
      (err) => {
        setSearchError('위치 정보를 가져오지 못했습니다: ' + err.message);
      }
    );
  };

  return (
    <div className="flex flex-col bg-[var(--bg-panel)] text-[var(--text-1)] w-80 sm:w-88 xl:w-96 h-full p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="border-b border-[var(--border-hair)] pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <h1 className="text-base font-bold tracking-tight">대상지 설정 콘솔</h1>
          </div>
          <p className="text-[var(--text-3)] text-xs mt-0.5">
            주소 검색 · 지도 클릭 · 좌표 입력으로 공간을 선택합니다.
          </p>
        </div>
        <button
          data-usage-action="header-api-settings-btn"
          type="button"
          onClick={onOpenApiSettings}
          className="p-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--accent)] border border-[var(--border-hair)] transition-colors flex items-center gap-1 text-[11px] font-semibold"
          title="API 및 지도 서비스 설정"
        >
          <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden sm:inline">API</span>
        </button>
      </div>

      {/* ── 01. 주소 및 지명 검색 ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="setup-search-input" className="text-xs font-bold text-[var(--text-2)] flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-[var(--surface-2)] text-[var(--text-1)] text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            <span>주소 · 지명 검색</span>
          </label>
          <button
            data-usage-action="gps-location-btn"
            type="button"
            onClick={handleGetCurrentLocation}
            className="text-[10px] text-[var(--accent)] hover:underline flex items-center gap-1 font-medium bg-[var(--surface-1)] hover:bg-[var(--surface-2)] px-2 py-0.5 rounded-lg border border-[var(--border-hair)] transition-colors"
          >
            내 GPS 위치
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              id="setup-search-input"
              type="text"
              className="w-full h-9 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl pl-8 pr-2 text-xs focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] transition-colors"
              placeholder="예: 부산대학교, 해운대구 우동..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-3)]" />
          </div>
          <button
            data-usage-action="search-site"
            type="submit"
            disabled={isSearching || !searchInput.trim()}
            className="px-3.5 h-9 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-xl text-xs font-bold border border-[var(--border-hair)] transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : '검색'}
          </button>
        </form>

        {/* Feedback Notices */}
        {searchSuccess && (
          <div className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)] text-[11px] text-[var(--success)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{searchSuccess}</span>
          </div>
        )}
        {searchError && (
          <div className="p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)] text-[11px] text-[var(--warn)] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* ── 02. 지도 클릭 선택 모드 & 좌표 직접입력 ── */}
      <div className="space-y-2 pt-1 border-t border-[var(--border-hair)]">
        <label className="text-xs font-bold text-[var(--text-2)] flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[var(--surface-2)] text-[var(--text-1)] text-[10px] flex items-center justify-center font-bold">
            2
          </span>
          <span>공간 위치 지정 방식</span>
        </label>

        {/* Direct Coord inputs */}
        <div className="p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] space-y-2">
          <div className="text-[11px] font-medium text-[var(--text-3)] flex justify-between">
            <span>좌표 직접 입력 (WGS84)</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <span className="text-[9px] text-[var(--text-3)]">위도 (Lat)</span>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full h-7 px-2 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg font-mono text-[var(--text-1)]"
              />
            </div>
            <div>
              <span className="text-[9px] text-[var(--text-3)]">경도 (Lng)</span>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full h-7 px-2 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg font-mono text-[var(--text-1)]"
              />
            </div>
          </div>
          <button
            data-usage-action="apply-coords"
            type="button"
            onClick={handleApplyManualCoords}
            className="w-full py-1 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-1)] rounded-lg border border-[var(--border-hair)] transition-colors"
          >
            좌표 적용
          </button>
          {coordError && <div className="text-[10px] text-[var(--warn)]">{coordError}</div>}
        </div>
      </div>

      {/* ── 03. 분석 형태 및 반경 ── */}
      <div className="space-y-2.5 pt-1 border-t border-[var(--border-hair)]">
        <label className="text-xs font-bold text-[var(--text-2)] flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-[var(--surface-2)] text-[var(--text-1)] text-[10px] flex items-center justify-center font-bold">
            3
          </span>
          <span>분석 형태 및 반경 (AnalysisZone)</span>
        </label>

        {/* Buffer Shape */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            data-usage-action="circle"
            type="button"
            onClick={() => setBufferShape('circle')}
            className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
              bufferShape === 'circle'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
          >
            <Circle className="w-3.5 h-3.5" />
            <span>원형 (Circle)</span>
          </button>
          <button
            data-usage-action="rectangle"
            type="button"
            onClick={() => setBufferShape('rectangle')}
            className={`py-1.5 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
              bufferShape === 'rectangle'
                ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                : 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>사각형 (Square)</span>
          </button>
        </div>

        {/* Radius Steps */}
        <div className="grid grid-cols-5 gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              data-usage-action={'radius-step-btn-' + r}
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              className={`py-1.5 px-1 rounded-xl text-center transition-colors border ${
                radius === r
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold border-[var(--accent-dim)]'
                  : 'bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] border-[var(--border-hair)]'
              }`}
            >
              <div className="text-xs font-bold">{r >= 1000 ? `${r / 1000}km` : `${r}m`}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Currently Selected Target Summary Card ── */}
      <div className="p-3 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)] space-y-1.5">
        <div className="text-[10px] font-bold uppercase text-[var(--accent)] tracking-wider">
          선택된 대상지 현황
        </div>
        <div className="font-bold text-xs text-[var(--text-1)] truncate flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <span className="truncate">{siteName || '선택 지점'}</span>
        </div>
        <div className="text-[11px] text-[var(--text-2)] truncate">{address}</div>
        <div className="text-[10px] text-[var(--text-3)] font-mono flex justify-between pt-1 border-t border-[var(--border-hair)]">
          <span>좌표: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
          <span>범위: {bufferShape === 'rectangle' ? '사각형' : '원형'} {radius}m</span>
        </div>
      </div>

      {/* ── Action Trigger: 공간 특성 종합 분석 실행 ── */}
      <div className="pt-1">
        <button
          type="button"
          id="confirm-start-analysis-btn"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full py-3 bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>공간 인벤토리 연산 중...</span>
            </>
          ) : (
            <>
              
              <span>공간 특성 종합 분석 실행</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
