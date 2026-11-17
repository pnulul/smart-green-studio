import React, { useRef, useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Upload,
  FileCode,
  Trash2,
  Plus,
  Info,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { GeoJsonLayerItem, CustomGeoJsonItem, GeoJsonLayerKey } from '../types';
import { parseAndValidateGeoJson } from '../services/geoJsonService';

interface GeoJsonLayerPanelProps {
  layers: GeoJsonLayerItem[];
  onToggleLayer: (key: GeoJsonLayerKey) => void;
  onChangeLayerOpacity: (key: GeoJsonLayerKey, opacity: number) => void;
  customLayers: CustomGeoJsonItem[];
  onAddCustomLayer: (layer: CustomGeoJsonItem) => void;
  onRemoveCustomLayer: (id: string) => void;
  onToggleCustomLayer: (id: string) => void;
  onChangeCustomLayerOpacity: (id: string, opacity: number) => void;
  onClose?: () => void;
}

export const GeoJsonLayerPanel: React.FC<GeoJsonLayerPanelProps> = ({
  layers,
  onToggleLayer,
  onChangeLayerOpacity,
  customLayers,
  onAddCustomLayer,
  onRemoveCustomLayer,
  onToggleCustomLayer,
  onChangeCustomLayerOpacity,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'layers' | 'upload' | 'legend'>('layers');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const customItem = parseAndValidateGeoJson(text, file.name);
        onAddCustomLayer(customItem);
        setUploadSuccess(`'${file.name}' (${customItem.featureCount}개 피처) 레이어가 성공적으로 추가되었습니다.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        setUploadError(err.message || 'GeoJSON 파일 파싱에 실패했습니다.');
      }
    };
    reader.onerror = () => {
      setUploadError('파일을 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsText(file);
  };

  const handleLoadSampleStreamGeoJson = () => {
    const sampleGeoJson = {
      type: 'FeatureCollection',
      name: 'SampleGreenWay',
      features: [
        {
          type: 'Feature',
          properties: {
            name: '온천천 생태하천 친수 녹도망',
            type: '수변 녹도 (Stream Greenway)',
            length: '1.4 km',
            coolingBenefit: '-2.8 °C 수변 증발산 냉각',
            ecoGrade: '1등급 생태축',
            color: '#35C6E8',
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [129.076, 35.231],
              [129.078, 35.234],
              [129.081, 35.237],
              [129.085, 35.239],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: '부산대-장전역 청년 쿨링 파고라 벨트',
            type: '보행자 쌈지 쉼터 벨트',
            area: '850 ㎡',
            coolingBenefit: '-2.1 °C 그늘목 쉼터',
            color: '#35C6E8',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [129.0775, 35.2325],
                [129.0792, 35.2330],
                [129.0788, 35.2342],
                [129.0770, 35.2338],
                [129.0775, 35.2325],
              ],
            ],
          },
        },
      ],
    };

    const customItem: CustomGeoJsonItem = {
      id: `custom-sample-${Date.now()}`,
      name: '온천천 친수녹도 샘플 데이터셋',
      fileName: 'sample_stream_greenway.geojson',
      featureCount: 2,
      visible: true,
      opacity: 0.85,
      color: '#35C6E8',
      data: sampleGeoJson,
      uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddCustomLayer(customItem);
    setUploadSuccess('온천천 생태녹도 샘플 GeoJSON 데이터셋이 지도에 등록되었습니다.');
  };

  return (
    <div className="w-80 sm:w-96 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-hair)] overflow-hidden flex flex-col text-xs text-[var(--text-1)] no-print">
      {/* Panel Top Header */}
      <div className="p-3.5 bg-[var(--bg-panel)] text-[var(--text-1)] flex items-center justify-between border-b border-[var(--border-hair)]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-bold text-sm text-[var(--text-1)]">공간 데이터 레이어 제어</h3>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              data-usage-action="layer-close"
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-1)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border-hair)] bg-[var(--bg-panel)] px-2 pt-1 gap-1">
        <button
          data-usage-action="layers-tab"
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`px-3 py-1.5 font-medium rounded-t-lg transition-colors text-xs flex items-center gap-1.5 ${
            activeTab === 'layers'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border-t border-l border-r border-[var(--border-hair)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>공간 레이어 ({layers.length})</span>
        </button>

        <button
          data-usage-action="upload-tab"
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 font-medium rounded-t-lg transition-colors text-xs flex items-center gap-1.5 ${
            activeTab === 'upload'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border-t border-l border-r border-[var(--border-hair)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>GeoJSON 추가 {customLayers.length > 0 && `(${customLayers.length})`}</span>
        </button>

        <button
          data-usage-action="legend-tab"
          type="button"
          onClick={() => setActiveTab('legend')}
          className={`px-3 py-1.5 font-medium rounded-t-lg transition-colors text-xs flex items-center gap-1.5 ${
            activeTab === 'legend'
              ? 'bg-[var(--surface-2)] text-[var(--accent)] border-t border-l border-r border-[var(--border-hair)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>통합 범례</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-3.5 max-h-[380px] overflow-y-auto space-y-3 custom-scrollbar">
        {/* TAB 1: Main Spatial Layers */}
        {activeTab === 'layers' && (
          <div className="space-y-2.5">
            {layers.map((layer) => (
              <div
                key={layer.key}
                className={`p-2.5 rounded-xl border transition-colors ${
                  layer.visible
                    ? 'bg-[var(--surface-1)] border-[var(--accent-dim)]'
                    : 'bg-[var(--surface-1)] border-[var(--border-hair)] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      data-usage-action="layer-toggle"
                      type="button"
                      onClick={() => onToggleLayer(layer.key)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        layer.visible
                          ? 'bg-[var(--accent)] text-[#080B0F]'
                          : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                      }`}
                    >
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <span className="font-bold text-xs text-[var(--text-1)]">{layer.label}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-hair)] text-[var(--text-2)]">
                    {layer.category}
                  </span>
                </div>

                <p className="text-[10.5px] text-[var(--text-2)] mt-1 pl-7 leading-snug">{layer.description}</p>

                {/* Opacity Slider */}
                {layer.visible && (
                  <div className="mt-2 pl-7 flex items-center gap-2 pt-1 border-t border-[var(--border-hair)]">
                    <span className="text-[10px] text-[var(--text-3)] whitespace-nowrap">투명도</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={layer.opacity}
                      onChange={(e) => onChangeLayerOpacity(layer.key, parseFloat(e.target.value))}
                      className="w-full h-1 bg-[var(--surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <span className="font-mono text-[10px] text-[var(--text-2)] min-w-[28px] text-right">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Custom Layers Section */}
            {customLayers.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-hair)] space-y-2">
                <div className="font-bold text-[11px] text-[var(--text-2)] flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>사용자 업로드 GeoJSON ({customLayers.length})</span>
                </div>

                {customLayers.map((cLayer) => (
                  <div
                    key={cLayer.id}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      cLayer.visible
                        ? 'bg-[var(--surface-1)] border-[var(--accent-dim)]'
                        : 'bg-[var(--surface-1)] border-[var(--border-hair)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <button
                          data-usage-action="layer-toggle"
                          type="button"
                          onClick={() => onToggleCustomLayer(cLayer.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            cLayer.visible
                              ? 'bg-[var(--accent)] text-[#080B0F]'
                              : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text-1)]'
                          }`}
                        >
                          {cLayer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <span className="font-bold text-xs text-[var(--text-1)] truncate">{cLayer.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border-hair)]">
                          {cLayer.featureCount} Features
                        </span>
                        <button
                          data-usage-action="layer-remove"
                          type="button"
                          onClick={() => onRemoveCustomLayer(cLayer.id)}
                          className="p-1 text-[var(--text-3)] hover:text-[var(--danger)] transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cLayer.visible && (
                      <div className="mt-2 pl-7 flex items-center gap-2 pt-1 border-t border-[var(--border-hair)]">
                        <span className="text-[10px] text-[var(--text-3)] whitespace-nowrap">투명도</span>
                        <input
                          type="range"
                          min={0.1}
                          max={1.0}
                          step={0.05}
                          value={cLayer.opacity}
                          onChange={(e) => onChangeCustomLayerOpacity(cLayer.id, parseFloat(e.target.value))}
                          className="w-full h-1 bg-[var(--surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                        />
                        <span className="font-mono text-[10px] text-[var(--text-2)] min-w-[28px] text-right">
                          {Math.round(cLayer.opacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GeoJSON Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[var(--surface-1)] rounded-xl border border-dashed border-[var(--border-hair)] text-center hover:border-[var(--accent)] transition-colors">
              <Upload className="w-6 h-6 text-[var(--accent)] mx-auto mb-1.5" />
              <div className="font-bold text-[var(--text-1)] text-xs">GeoJSON 파일 업로드 (.geojson, .json)</div>
              <p className="text-[10.5px] text-[var(--text-3)] mt-1">
                대상지 분석에 추가하고 싶은 공간 폴리곤/라인/포인트 데이터를 불러옵니다.
              </p>

              <input
                ref={fileInputRef}
                data-usage-action="layer-upload"
                type="file"
                accept=".geojson,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="geojson-upload-input"
              />

              <label
                htmlFor="geojson-upload-input"
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-hair)] font-medium cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>내 컴퓨터에서 파일 선택</span>
              </label>
            </div>

            {/* Pre-made sample dataset button */}
            <div className="p-2.5 bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)] flex items-center justify-between">
              <div>
                <div className="font-bold text-[var(--text-1)] text-xs flex items-center gap-1">
                  <span>샘플 생태축 GeoJSON 불러오기</span>
                </div>
                <div className="text-[10px] text-[var(--text-3)] mt-0.5">
                  온천천 수변녹도 및 청년 쿨링벨트 시연 데이터
                </div>
              </div>
              <button
                data-usage-action="layer-sample"
                type="button"
                onClick={handleLoadSampleStreamGeoJson}
                className="px-2.5 py-1 bg-[var(--surface-2)] hover:bg-[var(--surface-1)] border border-[var(--border-hair)] text-[var(--accent)] rounded-lg font-medium text-[11px] transition-colors"
              >
                추가
              </button>
            </div>

            {/* Upload Feedback */}
            {uploadSuccess && (
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--accent-dim)] flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--danger)] border border-[var(--danger)]/40 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Legend */}
        {activeTab === 'legend' && (
          <div className="space-y-3 text-xs">
            {layers
              .filter((l) => l.visible)
              .map((l) => (
                <div key={l.key} className="p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)]">
                  <div className="font-bold text-[var(--text-1)] text-xs mb-1.5">{l.label}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {l.legend.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0 border border-[var(--border-hair)]"
                          style={{ backgroundColor: item.color?.startsWith('--') ? `var(${item.color})` : item.color }}
                        />
                        <div className="truncate">
                          <span className="font-medium text-[var(--text-2)] text-[11px] truncate">{item.label}</span>
                          {item.desc && <div className="text-[9.5px] text-[var(--text-3)] truncate">{item.desc}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
