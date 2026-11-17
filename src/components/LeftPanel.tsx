import React, { useState, useEffect } from 'react';
import {
  Search,
  Navigation,
  History,
  RefreshCw,
  Trash2,
  ExternalLink,
  Circle,
  Square,
  Crosshair,
  Key,
  MapPin,
  CheckCircle2,
  AlertCircle,
  } from 'lucide-react';
import { RadiusOption, AnalysisHistoryItem, BufferShape } from '../types';
import { geocodingService } from '../services/geocodingService';

interface LeftPanelProps {
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
  multiRadius: boolean;
  setMultiRadius: (val: boolean) => void;
  bufferShape?: BufferShape;
  setBufferShape?: (shape: BufferShape) => void;
  isPickMode?: boolean;
  onTogglePickMode?: (active: boolean) => void;
  onRunAnalyze: () => void;
  isLoading: boolean;
  historyList: AnalysisHistoryItem[];
  onLoadHistory: (item: AnalysisHistoryItem) => void;
  onClearHistory: () => void;
  googleMapsApiKey: string;
  setGoogleMapsApiKey: (key: string) => void;
  vworldKey: string;
  setVworldKey: (key: string) => void;
  kosisKey: string;
  setKosisKey: (key: string) => void;
  onOpenApiSettings?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
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
  multiRadius,
  setMultiRadius,
  bufferShape = 'circle',
  setBufferShape,
  isPickMode = false,
  onTogglePickMode,
  onRunAnalyze,
  isLoading,
  historyList,
  onLoadHistory,
  onClearHistory,
  googleMapsApiKey,
  setGoogleMapsApiKey,
  vworldKey,
  setVworldKey,
  kosisKey,
  setKosisKey,
  onOpenApiSettings,
}) => {
  const [searchInput, setSearchInput] = useState(address);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);

  // Manual coord inputs
  const [manualLat, setManualLat] = useState(lat.toString());
  const [manualLng, setManualLng] = useState(lng.toString());
  const [coordError, setCoordError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(address);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
  }, [address, lat, lng]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      alert('브라우저가 위치 정보를 지원하지 않습니다.');
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
        alert('위치 정보를 가져오지 못했습니다. ' + err.message);
      }
    );
  };

  const bufferSteps: { value: RadiusOption; label: string; sub: string }[] = [
    { value: 250, label: '250m', sub: '근거리' },
    { value: 500, label: '500m', sub: '도보권' },
    { value: 1000, label: '1km', sub: '생활권' },
    { value: 1500, label: '1.5km', sub: '지구권' },
    { value: 2000, label: '2km', sub: '광역권' },
  ];

  return (
    <aside
      id="left-control-panel"
      className="w-full lg:w-84 bg-[var(--bg-panel)] border-r border-[var(--border-hair)] flex flex-col h-full overflow-hidden flex-shrink-0 z-20 text-[var(--text-1)]"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border-hair)] bg-[var(--bg-panel)] flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] mb-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            Landscape GIS Intelligence
          </div>
          <h1 className="text-base font-bold text-[var(--text-1)] tracking-tight">
            대상지 설정 & 분석 콘솔
          </h1>
        </div>
        {onOpenApiSettings && (
          <button
            type="button"
            onClick={onOpenApiSettings}
            className="p-1.5 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--accent)] border border-[var(--border-hair)] transition-colors flex items-center gap-1 text-[11px] font-semibold"
            title="API 및 지도 서비스 설정"
          >
            <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>API</span>
          </button>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--divider)]">
        {/* ── 01. 대상지 입력 ── */}
        <section className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[var(--surface-2)] text-[var(--text-1)] text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              대상지 위치 설정
            </span>
            <button
              type="button"
              id="gps-location-btn"
              onClick={handleGetCurrentLocation}
              className="text-[11px] text-[var(--accent)] hover:underline font-medium flex items-center gap-1 bg-[var(--surface-1)] hover:bg-[var(--surface-2)] px-2 py-0.5 rounded-lg border border-[var(--border-hair)] transition-colors"
            >
              <Navigation className="w-3 h-3 text-[var(--accent)]" /> GPS 위치
            </button>
          </div>

          {/* Site Name */}
          <div>
            <label htmlFor="site-name-input" className="block text-xs font-medium text-[var(--text-2)] mb-1">
              대상지 명칭
            </label>
            <input
              id="site-name-input"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="예: 부산대 장전캠퍼스 녹지네트워크"
              className="w-full h-9 px-3 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] transition-colors"
            />
          </div>

          {/* Address Search */}
          <div>
            <label htmlFor="address-search-input" className="block text-xs font-medium text-[var(--text-2)] mb-1 flex items-center justify-between">
              <span>주소 또는 지명 검색</span>
              <span className="text-[10px] text-[var(--text-3)] font-normal">도로명 / 지번 / 건물명</span>
            </label>
            <form onSubmit={handleSearch} className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  id="address-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="예: 부산 금정구 부산대학로63번길 2"
                  className="w-full h-9 pl-3 pr-2 text-xs bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-xl focus:outline-none focus:border-[var(--accent-dim)] text-[var(--text-1)] placeholder-[var(--text-3)] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchInput.trim()}
                className="px-3 h-9 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-xl text-xs font-bold border border-[var(--border-hair)] transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>검색</span>
              </button>
            </form>

            {searchSuccess && (
              <div className="mt-2 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)] text-[11px] text-[var(--success)] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{searchSuccess}</span>
              </div>
            )}
            {searchError && (
              <div className="mt-2 p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)] text-[11px] text-[var(--warn)] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Pick on Map Toggle */}
          {onTogglePickMode && (
            <button
              type="button"
              onClick={() => onTogglePickMode(!isPickMode)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isPickMode
                  ? 'bg-[var(--accent)] text-[#080B0F] border-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                  : 'bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] border-[var(--border-hair)]'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{isPickMode ? '지점 선택 모드 ON (지도 클릭)' : '지도에서 직접 지점 선택'}</span>
            </button>
          )}

          {/* Lat / Lng Direct Inputs */}
          <div className="p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] space-y-2">
            <div className="text-[11px] font-medium text-[var(--text-3)] flex justify-between">
              <span>좌표 직접 입력 (WGS84)</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[9px] text-[var(--text-3)]">위도 (Lat)</span>
                <input
                  id="lat-coord-input"
                  type="text"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full h-7 px-2 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg font-mono text-[var(--text-1)]"
                />
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-3)]">경도 (Lng)</span>
                <input
                  id="lng-coord-input"
                  type="text"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full h-7 px-2 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg font-mono text-[var(--text-1)]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyManualCoords}
              className="w-full py-1 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-medium text-[var(--text-1)] rounded-lg border border-[var(--border-hair)] transition-colors"
            >
              좌표 적용
            </button>
            {coordError && <div className="text-[10px] text-[var(--warn)]">{coordError}</div>}
          </div>
        </section>

        {/* ── 02. 분석 반경 및 형태 설정 ── */}
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[var(--surface-2)] text-[var(--text-1)] text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              공간 분석 반경 (Buffer)
            </span>
            <button
              type="button"
              id="multi-radius-toggle-btn"
              onClick={() => setMultiRadius(!multiRadius)}
              className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-colors ${
                multiRadius
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                  : 'bg-[var(--surface-1)] text-[var(--text-3)] border-[var(--border-hair)]'
              }`}
            >
              다중 버퍼 {multiRadius ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Shape Selector: Circle vs Rectangle */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-3)] mb-1.5">버퍼 형태 선택</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setBufferShape && setBufferShape('circle')}
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
                type="button"
                onClick={() => setBufferShape && setBufferShape('rectangle')}
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
          </div>

          {/* Buffer Distance Steps */}
          <div className="grid grid-cols-5 gap-1">
            {bufferSteps.map((step) => (
              <button
                key={step.value}
                id={`radius-step-btn-${step.value}`}
                type="button"
                onClick={() => setRadius(step.value)}
                className={`py-2 px-1 rounded-xl text-center transition-colors ${
                  radius === step.value
                    ? 'bg-[var(--surface-2)] text-[var(--accent)] font-bold border border-[var(--accent-dim)]'
                    : 'bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] border border-[var(--border-hair)]'
                }`}
              >
                <div className="text-xs font-bold">{step.label}</div>
                <div className="text-[9px] opacity-75">{step.sub}</div>
              </button>
            ))}
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            id="run-analysis-main-btn"
            onClick={onRunAnalyze}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-2 shadow-lg"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>공간 인벤토리 연산 중...</span>
              </>
            ) : (
              <>
                
                <span>공간 특성 종합 분석 실행</span>
              </>
            )}
          </button>
        </section>

        {/* ── 03. 최근 분석 이력 ── */}
        <section className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[var(--text-3)]" />
              분석 이력 ({historyList.length})
            </span>
            {historyList.length > 0 && (
              <button
                type="button"
                id="clear-history-btn"
                onClick={onClearHistory}
                className="text-[10px] text-[var(--text-3)] hover:text-[var(--warn)] flex items-center gap-0.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> 비우기
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {historyList.length > 0 ? (
              historyList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLoadHistory(item)}
                  className="w-full text-left p-2 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] cursor-pointer transition-colors text-xs flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-1.5">
                    <div className="font-bold text-[var(--text-1)] truncate group-hover:text-[var(--accent)]">{item.siteName}</div>
                    <div className="text-[10px] text-[var(--text-3)] truncate">{item.address}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-[var(--accent)]">{item.radius}m</span>
                    <span className="text-[9px] text-[var(--text-3)] block">{item.timestamp}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-[11px] text-[var(--text-3)] text-center py-3">분석 이력이 없습니다.</div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};
