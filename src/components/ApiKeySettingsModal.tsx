import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';
import { geocodingService, ApiTestResult } from '../services/geocodingService';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleMapsApiKey: string;
  onSaveGoogleMapsApiKey: (key: string) => void;
  vworldKey: string;
  onSaveVworldKey: (key: string) => void;
  kosisKey: string;
  onSaveKosisKey: (key: string) => void;
  googleSearchApiKey?: string;
  onSaveGoogleSearchApiKey?: (key: string) => void;
  googleSearchEngineId?: string;
  onSaveGoogleSearchEngineId?: (key: string) => void;
}

export const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({
  isOpen,
  onClose,
  googleMapsApiKey,
  onSaveGoogleMapsApiKey,
  vworldKey,
  onSaveVworldKey,
  kosisKey,
  onSaveKosisKey,
  googleSearchApiKey = '',
  onSaveGoogleSearchApiKey,
  googleSearchEngineId = '',
  onSaveGoogleSearchEngineId,
}) => {
  const [googleKeyInput, setGoogleKeyInput] = useState(googleMapsApiKey);
  const [vworldKeyInput, setVworldKeyInput] = useState(vworldKey);
  const [kosisKeyInput, setKosisKeyInput] = useState(kosisKey);
  const [googleSearchKeyInput, setGoogleSearchKeyInput] = useState(googleSearchApiKey);
  const [googleSearchCxInput, setGoogleSearchCxInput] = useState(googleSearchEngineId);

  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showVworldKey, setShowVworldKey] = useState(false);
  const [showKosisKey, setShowKosisKey] = useState(false);
  const [showGoogleSearchKey, setShowGoogleSearchKey] = useState(false);
  const [showGoogleSearchCx, setShowGoogleSearchCx] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    google?: ApiTestResult;
    vworld?: ApiTestResult;
    kosis?: ApiTestResult;
  }>({});

  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    setGoogleKeyInput(googleMapsApiKey);
    setVworldKeyInput(vworldKey);
    setKosisKeyInput(kosisKey);
    setGoogleSearchKeyInput(googleSearchApiKey);
    setGoogleSearchCxInput(googleSearchEngineId);
  }, [googleMapsApiKey, vworldKey, kosisKey, googleSearchApiKey, googleSearchEngineId, isOpen]);

  if (!isOpen) return null;

  const handleTestAll = async () => {
    setIsTesting(true);
    try {
      const [gRes, vRes, kRes] = await Promise.all([
        geocodingService.testGoogleMapsApiKey(googleKeyInput),
        geocodingService.testVworldApiKey(vworldKeyInput),
        geocodingService.testKosisApiKey(kosisKeyInput),
      ]);
      setTestResults({
        google: gRes,
        vworld: vRes,
        kosis: kRes,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveGoogleMapsApiKey(googleKeyInput.trim());
    onSaveVworldKey(vworldKeyInput.trim());
    onSaveKosisKey(kosisKeyInput.trim());
    if (onSaveGoogleSearchApiKey) onSaveGoogleSearchApiKey(googleSearchKeyInput.trim());
    if (onSaveGoogleSearchEngineId) onSaveGoogleSearchEngineId(googleSearchCxInput.trim());

    try {
      localStorage.setItem('sgs_google_maps_api_key', googleKeyInput.trim());
      localStorage.setItem('sgs_vworld_key', vworldKeyInput.trim());
      localStorage.setItem('sgs_kosis_key', kosisKeyInput.trim());
      localStorage.setItem('sgs_google_search_key', googleSearchKeyInput.trim());
      localStorage.setItem('sgs_google_search_cx', googleSearchCxInput.trim());
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }

    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      onClose();
    }, 900);
  };

  const renderBadge = (keyVal: string, testRes?: ApiTestResult) => {
    if (testRes) {
      if (testRes.status === 'success') {
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--success)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border-hair)]">
            <CheckCircle2 className="w-3 h-3" /> 정상 연동
          </span>
        );
      }
      if (testRes.status === 'failed') {
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--warn)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border-hair)]">
            <AlertCircle className="w-3 h-3" /> 오류 발생
          </span>
        );
      }
    }
    if (keyVal && keyVal.trim().length > 5) {
      return (
        <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border-hair)]">
          설정됨
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-[var(--text-3)] bg-[var(--surface-1)] px-2 py-0.5 rounded-full border border-[var(--border-hair)]">
        미설정 (기본 OSM/CARTO 작동)
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#080B0F]/90 backdrop-blur-md animate-fade-in no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-settings-title"
    >
      <div className="w-full max-w-xl bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-hair)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-1)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-hair)] flex items-center justify-between bg-[var(--surface-1)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 id="api-settings-title" className="text-base font-bold tracking-tight">
                지도 및 공간 데이터 API Key 설정
              </h2>
              <p className="text-xs text-[var(--text-3)] mt-0.5">
                Google Maps, 국토교통부 V-World, KOSIS 통계청 Open API 연동 관리
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Security Notice */}
          <div className="p-3 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)] flex items-start gap-2.5 text-xs text-[var(--text-2)]">
            <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-[var(--text-1)] block">
                클라이언트 로컬 브라우저 보안 보관 (LocalStorage)
              </span>
              <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
                입력하신 API Key는 외부 서버로 전송되거나 소스코드에 하드코딩되지 않으며, 사용자 본인의
                브라우저 LocalStorage에만 안전하게 보관됩니다. Key가 없어도 OSM과 CARTO 기반으로 모든 기본
                공간분석이 완벽히 작동합니다.
              </p>
            </div>
          </div>

          {/* 1. Google Maps Platform API Key */}
          <div className="space-y-1.5 p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
            <div className="flex items-center justify-between">
              <label htmlFor="modal-google-api-key" className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
                <span>Google Maps Platform API Key</span>
                <span className="text-[10px] text-[var(--accent)] font-normal">(지오코딩 & 고해상도 타일)</span>
              </label>
              {renderBadge(googleKeyInput, testResults.google)}
            </div>
            <div className="relative">
              <input
                id="modal-google-api-key"
                type={showGoogleKey ? 'text' : 'password'}
                value={googleKeyInput}
                onChange={(e) => setGoogleKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full h-9 px-3 pr-9 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg focus:outline-none focus:border-[var(--accent-dim)] font-mono text-[var(--text-1)]"
              />
              <button
                type="button"
                onClick={() => setShowGoogleKey(!showGoogleKey)}
                className="absolute right-2.5 top-2.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                {showGoogleKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {testResults.google?.message && (
              <p className={`text-[11px] mt-1 ${testResults.google.status === 'success' ? 'text-[var(--success)]' : 'text-[var(--warn)]'}`}>
                {testResults.google.message}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] pt-0.5">
              <span>Geocoding API 및 Maps JavaScript API 활성화 필요</span>
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                Google Cloud 콘솔 발급 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* 2. V-World Open API Key */}
          <div className="space-y-1.5 p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
            <div className="flex items-center justify-between">
              <label htmlFor="modal-vworld-api-key" className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
                <span>국토교통부 V-World Open API Key</span>
                <span className="text-[10px] text-[var(--text-3)] font-normal">(국내 공공 지적도·지오코더)</span>
              </label>
              {renderBadge(vworldKeyInput, testResults.vworld)}
            </div>
            <div className="relative">
              <input
                id="modal-vworld-api-key"
                type={showVworldKey ? 'text' : 'password'}
                value={vworldKeyInput}
                onChange={(e) => setVworldKeyInput(e.target.value)}
                placeholder="V-World 인증키 입력"
                className="w-full h-9 px-3 pr-9 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg focus:outline-none focus:border-[var(--accent-dim)] font-mono text-[var(--text-1)]"
              />
              <button
                type="button"
                onClick={() => setShowVworldKey(!showVworldKey)}
                className="absolute right-2.5 top-2.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                {showVworldKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {testResults.vworld?.message && (
              <p className={`text-[11px] mt-1 ${testResults.vworld.status === 'success' ? 'text-[var(--success)]' : 'text-[var(--warn)]'}`}>
                {testResults.vworld.message}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] pt-0.5">
              <span>국가공간정보포털 2.0 인증키</span>
              <a
                href="https://www.vworld.kr/dev/v4dv_apikey_s001.do"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                V-World 발급 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* 3. KOSIS 통계청 API Key */}
          <div className="space-y-1.5 p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
            <div className="flex items-center justify-between">
              <label htmlFor="modal-kosis-api-key" className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
                <span>통계청 KOSIS 국가통계포털 API Key</span>
                <span className="text-[10px] text-[var(--text-3)] font-normal">(센서스 인구·가구·노령화)</span>
              </label>
              {renderBadge(kosisKeyInput, testResults.kosis)}
            </div>
            <div className="relative">
              <input
                id="modal-kosis-api-key"
                type={showKosisKey ? 'text' : 'password'}
                value={kosisKeyInput}
                onChange={(e) => setKosisKeyInput(e.target.value)}
                placeholder="KOSIS 인증키 입력"
                className="w-full h-9 px-3 pr-9 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg focus:outline-none focus:border-[var(--accent-dim)] font-mono text-[var(--text-1)]"
              />
              <button
                type="button"
                onClick={() => setShowKosisKey(!showKosisKey)}
                className="absolute right-2.5 top-2.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                {showKosisKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {testResults.kosis?.message && (
              <p className={`text-[11px] mt-1 ${testResults.kosis.status === 'success' ? 'text-[var(--success)]' : 'text-[var(--warn)]'}`}>
                {testResults.kosis.message}
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] pt-0.5">
              <span>통계청 OpenAPI 서비스 키</span>
              <a
                href="https://kosis.kr/openapi"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                KOSIS 발급 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* 4. Google Custom Search API Key */}
          <div className="space-y-1.5 p-3.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)]">
            <div className="flex items-center justify-between">
              <label htmlFor="modal-google-search-api-key" className="text-xs font-bold text-[var(--text-1)] flex items-center gap-1.5">
                <span>Google Custom Search API 연동</span>
                <span className="text-[10px] text-[var(--text-3)] font-normal">(뉴스 모니터링)</span>
              </label>
              {renderBadge(googleSearchKeyInput)}
            </div>
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="modal-google-search-api-key"
                  type={showGoogleSearchKey ? 'text' : 'password'}
                  value={googleSearchKeyInput}
                  onChange={(e) => setGoogleSearchKeyInput(e.target.value)}
                  placeholder="Google API Key 입력 (AIzaSy...)"
                  className="w-full h-9 px-3 pr-9 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg focus:outline-none focus:border-[var(--accent-dim)] font-mono text-[var(--text-1)]"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSearchKey(!showGoogleSearchKey)}
                  className="absolute right-2.5 top-2.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  {showGoogleSearchKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  id="modal-google-search-cx"
                  type={showGoogleSearchCx ? "text" : "password"}
                  value={googleSearchCxInput}
                  onChange={(e) => setGoogleSearchCxInput(e.target.value)}
                  placeholder="Search Engine ID (CX) 입력"
                  className="w-full h-9 px-3 text-xs bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg focus:outline-none focus:border-[var(--accent-dim)] font-mono text-[var(--text-1)] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSearchCx(!showGoogleSearchCx)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                  title={showGoogleSearchCx ? "숨기기" : "보기"}
                >
                  {showGoogleSearchCx ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-3)] pt-0.5">
              <span>검색엔진 ID(CX)와 API Key 모두 필요</span>
              <a
                href="https://developers.google.com/custom-search/v1/overview"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                가이드 보기 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-hair)] bg-[var(--surface-1)] flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestAll}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-semibold border border-[var(--border-hair)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span>{isTesting ? '연결 테스트 중...' : '연결 테스트'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold text-xs shadow-lg transition-opacity flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg ? '저장 완료!' : '설정 저장'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
