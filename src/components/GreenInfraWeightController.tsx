import React, { useState } from 'react';
import {
  Sliders,
  RefreshCw,
  Check,
  Info,
} from 'lucide-react';
import { AlgorithmWeights, PresetProfileId, WeightPresetProfile } from '../types';
import { DEFAULT_WEIGHT_PRESETS } from '../services/greenInfraAlgorithm';

interface GreenInfraWeightControllerProps {
  currentPresetId: PresetProfileId;
  currentWeights: AlgorithmWeights;
  onApplyWeights: (presetId: PresetProfileId, weights: AlgorithmWeights) => void;
  onClose?: () => void;
}

export const GreenInfraWeightController: React.FC<GreenInfraWeightControllerProps> = ({
  currentPresetId,
  currentWeights,
  onApplyWeights,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetProfileId>(currentPresetId);
  const [weights, setWeights] = useState<AlgorithmWeights>({ ...currentWeights });
  const [hasChanged, setHasChanged] = useState(false);

  const handlePresetSelect = (preset: WeightPresetProfile) => {
    setSelectedPreset(preset.id);
    setWeights({ ...preset.weights });
    setHasChanged(true);
  };

  const handleWeightChange = (key: keyof AlgorithmWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
    setSelectedPreset('custom');
    setHasChanged(true);
  };

  const handleReset = () => {
    const defaultPreset = DEFAULT_WEIGHT_PRESETS[0];
    setSelectedPreset(defaultPreset.id);
    setWeights({ ...defaultPreset.weights });
    setHasChanged(true);
  };

  const handleApply = () => {
    onApplyWeights(selectedPreset, weights);
    setHasChanged(false);
    if (onClose) onClose();
  };

  const weightSliders: {
    key: keyof AlgorithmWeights;
    label: string;
    category: '환경·생태' | '사회·인문' | '공간·경제';
    desc: string;
  }[] = [
    {
      key: 'heatReduction',
      label: '도시열섬 완화도 (UHI Cooling)',
      category: '환경·생태',
      desc: '표면온도 저감 및 그늘목·쿨링포그 우선 가중치',
    },
    {
      key: 'stormwaterRetention',
      label: '우수 유출 저감 & LID (Stormwater)',
      category: '환경·생태',
      desc: '불투수면 빗물 침투 및 침수방재 식생수로 우선',
    },
    {
      key: 'carbonAbsorption',
      label: '탄소 흡수 & 생태 연결성 (Eco-Corridor)',
      category: '환경·생태',
      desc: '다층 군락 식재 및 산림·수변 생태축 연결 우선',
    },
    {
      key: 'popDensity',
      label: '인구 밀도 & 보행 유동량 (Pop Density)',
      category: '사회·인문',
      desc: '고밀 상권 및 보행 유동인구 쉼터 수혜도 우선',
    },
    {
      key: 'vulnerableAccess',
      label: '취약계층 접근성 (Vulnerable Access)',
      category: '사회·인문',
      desc: '고령자·어린이 생활반경 내 무장애 쉼터 우선',
    },
    {
      key: 'greenDeficiency',
      label: '기존 공원·녹지 결핍도 (Green Deficiency)',
      category: '공간·경제',
      desc: '1인당 공원면적 미달 구역 쌈지공원 확충 우선',
    },
    {
      key: 'transitConnectivity',
      label: '교통망 & 통학로 연계 (Transit Network)',
      category: '공간·경제',
      desc: '지하철역 및 통학로 보행 가로숲길 조성 우선',
    },
    {
      key: 'costEfficiency',
      label: '시공 경제성 & 사업비 효율 (Cost Efficiency)',
      category: '공간·경제',
      desc: '단위면적당 시공비 및 유지관리 용이성 우선',
    },
  ];

  return (
    <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-hair)] shadow-xl overflow-hidden flex flex-col max-h-[85vh] text-[var(--text-1)]">
      {/* Header */}
      <div className="p-4 bg-[var(--surface-1)] border-b border-[var(--border-hair)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border-hair)]">
            <Sliders className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="text-[var(--text-1)]">MCDA 추천 알고리즘 가중치 제어</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)] font-normal">
                Multi-Criteria Decision
              </span>
            </h3>
            <p className="text-xs text-[var(--text-2)] mt-0.5">
              분석 우선순위에 맞춰 가중치를 조절하면 최적 그린인프라 유형과 설치 위치가 실시간 재계산됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Body: Presets + Sliders */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs">
        {/* Preset Profiles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[var(--text-2)] uppercase tracking-wider text-[11px]">
              분석 목적별 프리셋 프로필 (Presets)
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] flex items-center gap-1 text-[11px] font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>기본값 초기화</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {DEFAULT_WEIGHT_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2.5 rounded-xl text-left border transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[var(--surface-2)] border-[var(--accent)]'
                      : 'bg-[var(--surface-1)] border-[var(--border-hair)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-[var(--text-3)]">PROFILE</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-[#080B0F] flex items-center justify-center text-[10px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <div className={`font-bold text-xs ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>
                      {preset.name.split(' (')[0]}
                    </div>
                    <div className="text-[10px] text-[var(--text-2)] mt-0.5 line-clamp-2 leading-snug">
                      {preset.shortDesc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Weight Sliders */}
        <div className="pt-2 border-t border-[var(--border-hair)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-[var(--text-2)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>세부 의사결정 지표별 가중치 조절 (Weights: 0~100)</span>
              {selectedPreset === 'custom' && (
                <span className="px-1.5 py-0.5 bg-[var(--surface-2)] text-[var(--warn)] border border-[var(--border-hair)] text-[10px] font-bold rounded">
                  사용자 지정
                </span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weightSliders.map((slider) => {
              const val = weights[slider.key];
              return (
                <div
                  key={slider.key}
                  className="p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-1)] text-xs">{slider.label}</span>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-hair)] text-[var(--accent)]">
                      {val}%
                    </span>
                  </div>

                  <p className="text-[10.5px] text-[var(--text-3)] leading-tight">{slider.desc}</p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={val}
                      onChange={(e) => handleWeightChange(slider.key, parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-[var(--surface-2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 bg-[var(--surface-1)] border-t border-[var(--border-hair)] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--text-3)] text-xs">
          <Info className="w-4 h-4 text-[var(--accent)]" />
          <span>가중치 변경 시 상위 추천 유형 및 지도 상 최적 설치 위치가 자동 갱신됩니다.</span>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border-hair)] text-[var(--text-2)] font-medium hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] transition-colors"
            >
              닫기
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[#080B0F] font-bold transition-opacity flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>가중치 적용 및 알고리즘 재실행</span>
          </button>
        </div>
      </div>
    </div>
  );
};
