import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header, DesignStageKey } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { CenterMap } from './components/CenterMap';
import { KpiRibbon } from './components/KpiRibbon';
import { BottomDomainCards } from './components/BottomDomainCards';
import { RightAnalysisPanel } from './components/RightAnalysisPanel';
import { ComparisonModal } from './components/ComparisonModal';
import { GreenInfraSimulatorModal } from './components/GreenInfraSimulatorModal';
import { GreenInfraWeightController } from './components/GreenInfraWeightController';
import { CandidateSiteDetailModal } from './components/CandidateSiteDetailModal';
import { StudentAuthGate } from './components/StudentAuthGate';
import { SetupView } from './components/views/SetupView';
import { AnalysisTabsView } from './components/views/AnalysisTabsView';
import { AiReportView } from './components/views/AiReportView';
import { AiResearchLabView } from './components/views/AiResearchLabView';
import { ApiKeySettingsModal } from './components/ApiKeySettingsModal';
import { NewsMonitorSection } from './components/NewsMonitorSection';
import { PRESET_SITES } from './data/presetSites';
import { geocodingService } from './services/geocodingService';
import { loggerService } from './services/loggerService';
import { googleSearchService, GoogleSearchItem } from './services/googleSearchService';
import {
  calculateGreenInfraSuitability,
  DEFAULT_WEIGHT_PRESETS,
} from './services/greenInfraAlgorithm';
import { buildAnalysisContext } from './services/analysisContextBuilder';
import { apiUrl } from './services/resourceService';
import {
  SiteAnalysisData,
  RadiusOption,
  AnalysisHistoryItem,
  GreenInfraRecommendation,
  OptimalCandidateSite,
  AlgorithmWeights,
  PresetProfileId,
  GeoJsonLayerItem,
  CustomGeoJsonItem,
  GeoJsonLayerKey,
  StudentAuthSession,
  BufferShape,
  AnalysisContext,
  CommonSpatialAnalysisResult,
} from './types';

export default function App() {
  // PNU Student Authentication Session
  const [authSession, setAuthSession] = useState<StudentAuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('pnu_landscape_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Landscape Design Process Active Stage
  const [activeStage, setActiveStage] = useState<DesignStageKey>('setup');

  useEffect(() => {
    if (authSession?.studentId) {
      loggerService.log(authSession.studentId, 'CHANGE_STAGE', `Navigated to stage: ${activeStage}`, {
        stage: activeStage,
        site_name: currentSite?.siteName
      });
    }
  }, [activeStage, authSession?.studentId]);

  // Current active analysis dataset
  const [currentSite, setCurrentSite] = useState<SiteAnalysisData>(PRESET_SITES.pnu);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('pnu');

  // Input form state
  const [siteName, setSiteName] = useState<string>(PRESET_SITES.pnu.siteName);
  const [address, setAddress] = useState<string>(PRESET_SITES.pnu.address);
  const [lat, setLat] = useState<number>(PRESET_SITES.pnu.lat);
  const [lng, setLng] = useState<number>(PRESET_SITES.pnu.lng);
  const [radius, setRadius] = useState<RadiusOption>(500);
  const [multiRadius, setMultiRadius] = useState<boolean>(false);
  const [bufferShape, setBufferShape] = useState<BufferShape>('circle');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // API Keys State
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [vworldKey, setVworldKey] = useState<string>('');
  const [kosisKey, setKosisKey] = useState<string>('');
  const [googleSearchApiKey, setGoogleSearchApiKey] = useState<string>('');
  const [googleSearchEngineId, setGoogleSearchEngineId] = useState<string>('');
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState<boolean>(false);

  // MCDA Recommendation Algorithm State
  const [currentPresetId, setCurrentPresetId] = useState<PresetProfileId>('balanced');
  const [currentWeights, setCurrentWeights] = useState<AlgorithmWeights>(
    DEFAULT_WEIGHT_PRESETS[0].weights
  );

  // GeoJSON Layer Control State
  const [geoJsonLayers, setGeoJsonLayers] = useState<GeoJsonLayerItem[]>(() =>
    []
  );
  const [customGeoJsonLayers, setCustomGeoJsonLayers] = useState<CustomGeoJsonItem[]>([]);

  // Modals & Inspectors
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<OptimalCandidateSite | null>(null);

  // History & CSV
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem[]>([]);
  const [loadedCsvTypes, setLoadedCsvTypes] = useState<string[]>([]);
  const [climateOverride, setClimateOverride] = useState<Partial<AnalysisContext['climate']>>({});
  const [newsResults, setNewsResults] = useState<GoogleSearchItem[]>([]);
  const [spatialAnalysisResults, setSpatialAnalysisResults] = useState<Record<string, CommonSpatialAnalysisResult & { status: string; errorMessage?: string; }>>({});

  // Load local storage on mount
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem('sgs_history_v2');
      if (savedHist) setHistoryList(JSON.parse(savedHist));

      const savedGg = localStorage.getItem('sgs_google_maps_api_key');
      if (savedGg) setGoogleMapsApiKey(savedGg);

      const savedVw = localStorage.getItem('sgs_vworld_key');
      if (savedVw) setVworldKey(savedVw);

      const savedKs = localStorage.getItem('sgs_kosis_key');
      if (savedKs) setKosisKey(savedKs);

      const savedGs = localStorage.getItem('sgs_google_search_key');
      if (savedGs) setGoogleSearchApiKey(savedGs);

      const savedGscx = localStorage.getItem('sgs_google_search_cx');
      if (savedGscx) setGoogleSearchEngineId(savedGscx);
    } catch (e) {
      console.warn('Storage read error', e);
    }
  }, []);

  // Save history helper
  const saveToHistory = useCallback((site: SiteAnalysisData) => {
    setHistoryList((prev) => {
      const filtered = prev.filter((h) => h.address !== site.address);
      const newItem: AnalysisHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        siteName: site.siteName,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        radius: site.activeRadius,
        greenRatio: site.kpi.greenRatio,
        facilitiesCount: site.kpi.facilitiesCount,
        accessScore: site.kpi.accessScore,
        priority: site.kpi.greenInfraPriority,
      };
      const updated = [newItem, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('sgs_history_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Recalculate Green Infra Suitability with new Weights
  const handleApplyWeights = (presetId: PresetProfileId, newWeights: AlgorithmWeights) => {
    setCurrentPresetId(presetId);
    setCurrentWeights(newWeights);

    const { recommendations, candidateSites } = calculateGreenInfraSuitability(
      newWeights,
      {
        lat: currentSite.lat,
        lng: currentSite.lng,
        greenRatio: currentSite.kpi.greenRatio,
        imperviousRatio: currentSite.kpi.imperviousRatio,
        heatRiskIndex: currentSite.kpi.heatRiskIndex,
        transitCount: currentSite.pois.filter((p) => p.category === '대중교통').length || 3,
        commercialCount: currentSite.pois.filter((p) => p.category === '상업·생활').length || 15,
        eduCount: currentSite.pois.filter((p) => p.category === '교육·공공').length || 2,
        hasRiver: currentSite.natural.waterRatio > 5,
        isSteepSlope:
          currentSite.natural.averageSlope.includes('구릉') ||
          currentSite.natural.averageSlope.includes('경사'),
        agingRatioVal: parseFloat(currentSite.demographic.agingRatio) || 18.4,
      }
    );

    const updatedSite: SiteAnalysisData = {
      ...currentSite,
      greenInfraRecommendations: recommendations,
      candidateSites,
      kpi: {
        ...currentSite.kpi,
        greenInfraPriority: `${recommendations[0]?.title || '그린인프라'} 최우선 도입`,
      },
    };

    setCurrentSite(updatedSite);
    setIsWeightModalOpen(false);
    loggerService.log(authSession?.studentId || 'unknown', 'APPLY_WEIGHTS', `Applied weights preset: ${presetId}`, {
      stage: activeStage,
      site_name: currentSite.siteName
    });
  };

  // Preset Selection Handler
  const handleSelectPreset = (key: string) => {
    const target = PRESET_SITES[key];
    if (!target) return;

    setSelectedPresetKey(key);
    setCurrentSite(target);
    setSiteName(target.siteName);
    setAddress(target.address);
    setLat(target.lat);
    setLng(target.lng);
    setRadius(target.activeRadius);
    saveToHistory(target);
    loggerService.log(authSession?.studentId || 'unknown', 'SITE_SELECT', `Selected preset site: ${key}`, {
      site_name: target.siteName,
      latitude: target.lat,
      longitude: target.lng,
      buffer_size: target.activeRadius,
      buffer_shape: 'circle',
      stage: activeStage
    });
  };

  // Start the local 19-dataset pipeline without waiting for external OSM services.
  const [analysisRequest, setAnalysisRequest] = useState(0);
  const handleRunAnalyze = async () => {
    const selectedSite = { ...currentSite, siteName, address, lat, lng, activeRadius: radius,
      pois: [], candidateSites: [], greenInfraRecommendations: [] };
    setCurrentSite(selectedSite);
    setGeoJsonLayers([]);
    setSpatialAnalysisResults({});
    setActiveStage('analysis');
    setAnalysisRequest(n => n + 1);
    saveToHistory(selectedSite);
  };

  // Load from History
  const handleLoadHistory = (item: AnalysisHistoryItem) => {
    setSiteName(item.siteName);
    setAddress(item.address);
    setLat(item.lat);
    setLng(item.lng);
    setRadius(item.radius);
    loggerService.log(authSession?.studentId || 'unknown', 'LOAD_HISTORY', `Loaded history item: ${item.siteName}`);

    const foundPresetKey = Object.keys(PRESET_SITES).find(
      (k) => PRESET_SITES[k].address === item.address
    );
    if (foundPresetKey) {
      handleSelectPreset(foundPresetKey);
    } else {
      handleRunAnalyze();
    }
  };

  const handleClearHistory = () => {
    setHistoryList([]);
    try {
      localStorage.removeItem('sgs_history_v2');
      loggerService.log(authSession?.studentId || 'unknown', 'CLEAR_HISTORY', `Cleared local history`);
    } catch (e) {}
  };

  // GeoJSON Layer Handlers
  const handleToggleGeoJsonLayer = (key: GeoJsonLayerKey) => {
    setGeoJsonLayers((prev) => {
      const target = prev.find(l => l.key === key);
      if (target) {
        loggerService.log(authSession?.studentId || 'unknown', !target.visible ? 'LAYER_ON' : 'LAYER_OFF', `Layer: ${target.label || key}`, {
          site_name: currentSite?.siteName,
          stage: activeStage,
          details: `Layer ${target.label || key} ${!target.visible ? 'ON' : 'OFF'}`
        });
      }
      return prev.map((l) => (l.key === key ? { ...l, visible: !l.visible } : l));
    });
  };

  const handleChangeGeoJsonLayerOpacity = (key: GeoJsonLayerKey, opacity: number) => {
    setGeoJsonLayers((prev) =>
      prev.map((l) => (l.key === key ? { ...l, opacity } : l))
    );
  };

  // Custom GeoJSON Layer Handlers
  const handleAddCustomGeoJsonLayer = (item: CustomGeoJsonItem) => {
    setCustomGeoJsonLayers((prev) => [item, ...prev]);
    loggerService.log(authSession?.studentId || 'unknown', 'ADD_CUSTOM_LAYER', `Added custom layer: ${item.name}`);
  };

  const handleRemoveCustomGeoJsonLayer = (id: string) => {
    setCustomGeoJsonLayers((prev) => prev.filter((l) => l.id !== id));
  };

  const handleToggleCustomGeoJsonLayer = (id: string) => {
    setCustomGeoJsonLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleChangeCustomGeoJsonLayerOpacity = (id: string, opacity: number) => {
    setCustomGeoJsonLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  // Export PDF Report
  const handleExportPdf = () => {
    loggerService.log(authSession?.studentId || 'unknown', 'PDF_PRINT', `Printed PDF report`, {
      stage: activeStage,
      site_name: currentSite.siteName,
      status: 'success'
    });
    const origTitle = document.title;
    document.title = `[SmartGreenStudio]_${currentSite.siteName}_그린인프라_분석리포트`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 2000);
  };

  // Green infra selection
  const handleSelectGreenInfra = (_gi: GreenInfraRecommendation) => {
    loggerService.log(authSession?.studentId || 'unknown', 'SELECT_GREEN_INFRA', `Selected GI recommendation: ${_gi.title}`);
    setGeoJsonLayers((prev) =>
      prev.map((l) => (l.key === 'candidateSites' ? { ...l, visible: true } : l))
    );
  };

  const analysisContext = useMemo(() => {
    return buildAnalysisContext(
      {
        ...currentSite,
        lat,
        lng,
        address,
        siteName,
        activeRadius: radius,
      },
      bufferShape,
      climateOverride
    );
  }, [currentSite, lat, lng, address, siteName, radius, bufferShape, climateOverride]);

  // If user is not authenticated for PNU Landscape Urbanism Studio, show gate
  if (!authSession || !authSession.isLoggedIn) {
    return (
      <StudentAuthGate
        onLoginSuccess={(session) => {
          setAuthSession(session);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-screen bg-[var(--bg-canvas)] font-sans text-[var(--text-1)] overflow-x-hidden">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-[1000] w-full">
        <Header
          activeStage={activeStage}
          onSelectStage={setActiveStage}
          onSelectPreset={handleSelectPreset}
          onOpenCompare={() => setIsCompareOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onExportPdf={handleExportPdf}
          onOpenApiSettings={() => setIsApiSettingsOpen(true)}
          selectedPresetKey={selectedPresetKey}
          session={authSession}
          onSwitchStudent={() => {
            const endpoint = apiUrl('auth/logout');
            if (endpoint) void fetch(endpoint, { method: 'POST', credentials: 'include' });
            try {
              localStorage.removeItem('pnu_landscape_session');
            } catch {}
            setAuthSession(null);
          }}
        />
      </div>

      {/* ── Main 3-Column Workspace Shell ── */}
      <div className="flex-1 flex flex-col lg:flex-row relative min-h-[calc(100vh-64px)]">
        {/* Left Control Panel (Visible in Analysis Stage) */}
        {activeStage === 'analysis' && (
          <div className="sticky top-[64px] h-[calc(100vh-64px)] z-40 flex-shrink-0">
            <LeftPanel
              siteName={siteName}
              setSiteName={setSiteName}
              address={address}
              setAddress={setAddress}
              lat={lat}
              setLat={(newLat) => {
                setLat(newLat);
                setCurrentSite((prev) => ({ ...prev, lat: newLat }));
              }}
              lng={lng}
              setLng={(newLng) => {
                setLng(newLng);
                setCurrentSite((prev) => ({ ...prev, lng: newLng }));
              }}
              radius={radius}
              setRadius={(r) => {
                setRadius(r);
                setCurrentSite((prev) => ({ ...prev, activeRadius: r }));
              }}
              multiRadius={multiRadius}
              setMultiRadius={setMultiRadius}
              bufferShape={bufferShape}
              setBufferShape={setBufferShape}
              onRunAnalyze={handleRunAnalyze}
              isLoading={isLoading}
              historyList={historyList}
              onLoadHistory={handleLoadHistory}
              onClearHistory={handleClearHistory}
              googleMapsApiKey={googleMapsApiKey}
              setGoogleMapsApiKey={setGoogleMapsApiKey}
              vworldKey={vworldKey}
              setVworldKey={setVworldKey}
              kosisKey={kosisKey}
              setKosisKey={setKosisKey}
              onOpenApiSettings={() => setIsApiSettingsOpen(true)}
            />
          </div>
        )}

        {/* Left Control Panel: Stage 01 Setup View */}
        {activeStage === 'setup' && (
          <div className="sticky top-[64px] h-[calc(100vh-64px)] z-40 flex-shrink-0 border-r border-[var(--border-hair)] bg-[var(--bg-panel)] overflow-hidden flex flex-col">
            <SetupView
              siteName={siteName}
              setSiteName={setSiteName}
              address={address}
              setAddress={setAddress}
              lat={lat}
              setLat={(newLat) => {
                setLat(newLat);
                setCurrentSite((prev) => ({ ...prev, lat: newLat }));
              }}
              lng={lng}
              setLng={(newLng) => {
                setLng(newLng);
                setCurrentSite((prev) => ({ ...prev, lng: newLng }));
              }}
              radius={radius}
              setRadius={(r) => {
                setRadius(r);
                setCurrentSite((prev) => ({ ...prev, activeRadius: r }));
              }}
              bufferShape={bufferShape}
              setBufferShape={setBufferShape}
              onConfirm={async () => {
                await handleRunAnalyze();
                setActiveStage('analysis');
              }}
              isLoading={isLoading}
              onOpenApiSettings={() => setIsApiSettingsOpen(true)}
              googleMapsApiKey={googleMapsApiKey}
              vworldKey={vworldKey}
            />
          </div>
        )}

        {/* Center Column: Map (Top) + News Monitor (Bottom) */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          {/* Map Area */}
          <div className={`relative w-full ${activeStage === 'setup' ? 'h-[calc(100vh-64px)] min-h-[500px]' : 'h-[60vh] min-h-[450px]'} flex-shrink-0`}>
            <CenterMap
              data={{
                ...currentSite,
                lat,
                lng,
                address,
                siteName,
                activeRadius: radius,
                pois: [], candidateSites: [],
              }}
              radius={radius}
              multiRadius={multiRadius}
              bufferShape={bufferShape}
              geoJsonLayers={geoJsonLayers}
              onToggleGeoJsonLayer={handleToggleGeoJsonLayer}
              onChangeGeoJsonLayerOpacity={handleChangeGeoJsonLayerOpacity}
              customGeoJsonLayers={customGeoJsonLayers}
              onAddCustomGeoJsonLayer={handleAddCustomGeoJsonLayer}
              onRemoveCustomGeoJsonLayer={handleRemoveCustomGeoJsonLayer}
              onToggleCustomGeoJsonLayer={handleToggleCustomGeoJsonLayer}
              onChangeCustomGeoJsonLayerOpacity={handleChangeCustomGeoJsonLayerOpacity}
              onSelectCandidateSite={(candidate) => setSelectedCandidate(candidate)}
              onSelectGreenInfra={handleSelectGreenInfra}
              googleMapsApiKey={googleMapsApiKey}
              vworldKey={vworldKey}
              onRunAnalyze={handleRunAnalyze}
              isLoading={isLoading}
            />
          </div>

          {/* ── News Monitor Section (Below Map in Center Column) ── */}
          {activeStage !== 'setup' && (
            <NewsMonitorSection
              currentSite={currentSite}
              googleSearchApiKey={googleSearchApiKey}
              googleSearchEngineId={googleSearchEngineId}
              onOpenApiSettings={() => setIsApiSettingsOpen(true)}
              onResultsChange={setNewsResults}
              session={authSession}
            />
          )}
        </main>

        {/* Right Panel for Analysis and AI Reports */}
        {(
          <aside className={`${activeStage === 'setup' ? 'hidden' : 'flex'} sticky top-[64px] h-[calc(100vh-64px)] w-full lg:w-[540px] xl:w-[620px] bg-[var(--bg-canvas)] border-l border-[var(--border-hair)] flex-col z-40 flex-shrink-0`}>
            <div className={activeStage === 'analysis' ? 'h-full' : 'hidden'}>
              <AnalysisTabsView
                context={analysisContext}
                analysisRequest={analysisRequest}
                onRunningChange={setIsLoading}
                onUpdateClimateContext={setClimateOverride}
                onAnalysisResultsChange={setSpatialAnalysisResults}
                session={authSession}
              />
            </div>
            {activeStage === 'ai_report' && (
              <AiReportView
                context={analysisContext}
                spatialAnalysisResults={spatialAnalysisResults}
                onExportPdf={handleExportPdf}
                session={authSession}
              />
            )}
            <div className={activeStage === 'ai_lab' ? 'h-full' : 'hidden'}>
              <AiResearchLabView
                session={authSession}
                currentSite={currentSite}
                currentWeights={currentWeights}
                currentPresetId={currentPresetId}
                analysisContext={analysisContext}
                spatialAnalysisResults={spatialAnalysisResults}
                newsResults={newsResults}
              />
            </div>
          </aside>
        )}
      </div>

      {/* ── Modals ── */}
      <ApiKeySettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
        googleMapsApiKey={googleMapsApiKey}
        onSaveGoogleMapsApiKey={setGoogleMapsApiKey}
        vworldKey={vworldKey}
        onSaveVworldKey={setVworldKey}
        kosisKey={kosisKey}
        onSaveKosisKey={setKosisKey}
        googleSearchApiKey={googleSearchApiKey}
        onSaveGoogleSearchApiKey={setGoogleSearchApiKey}
        googleSearchEngineId={googleSearchEngineId}
        onSaveGoogleSearchEngineId={setGoogleSearchEngineId}
      />

      <ComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentSite={currentSite}
      />

      <GreenInfraSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        siteData={currentSite}
      />

      {/* MCDA Weight Controller Modal */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center p-4 bg-[#080B0F]/90 backdrop-blur-md animate-fade-in no-print">
          <div className="w-full max-w-3xl">
            <GreenInfraWeightController
              currentPresetId={currentPresetId}
              currentWeights={currentWeights}
              onApplyWeights={handleApplyWeights}
              onClose={() => setIsWeightModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Candidate Site Deep Inspector Modal */}
      {selectedCandidate && (
        <CandidateSiteDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onFocusOnMap={(focusLat, focusLng) => {
            setLat(focusLat);
            setLng(focusLng);
            setCurrentSite((prev) => ({ ...prev, lat: focusLat, lng: focusLng }));
          }}
        />
      )}
    </div>
  );
}
