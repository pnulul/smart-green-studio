import React from 'react';
import { TreePine, MapPin, Gauge, Droplets, Leaf } from 'lucide-react';
import { KpiData } from '../types';

interface KpiRibbonProps {
  kpi: KpiData;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({ kpi }) => {
  const isDeficit = kpi.greenRatio < 15;
  const isImperviousAlert = kpi.imperviousRatio > 70;

  return (
    <div id="kpi-ribbon-container" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-[var(--bg-panel)] border-b border-[var(--border-hair)] flex-shrink-0">
      {/* 1. Analysis Buffer */}
      <div id="kpi-card-buffer" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            분석 반경 권역
          </span>
          <MapPin className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl font-bold text-[var(--text-1)] tracking-tight">{kpi.radiusMeters}</span>
          <span className="text-xs font-medium text-[var(--text-3)]">m</span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1">{kpi.radiusLabel}</div>
      </div>

      {/* 2. Green Ratio */}
      <div id="kpi-card-green-ratio" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDeficit ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'}`}></span>
            추정 녹지율
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border border-[var(--border-hair)] bg-[var(--surface-2)] ${isDeficit ? 'text-[var(--warn)]' : 'text-[var(--text-2)]'}`}>
            {isDeficit ? '녹지 결핍' : kpi.greenRatio < 30 ? '보통' : '우수'}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className={`text-xl font-bold tracking-tight ${isDeficit ? 'text-[var(--warn)]' : 'text-[var(--text-1)]'}`}>{kpi.greenRatio}</span>
          <span className="text-xs font-medium text-[var(--text-3)]">%</span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1">{kpi.greenRatioSub}</div>
      </div>

      {/* 3. Facilities Count */}
      <div id="kpi-card-facilities" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            주요 시설 (POI)
          </span>
          <TreePine className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl font-bold text-[var(--text-1)] tracking-tight">{kpi.facilitiesCount}</span>
          <span className="text-xs font-medium text-[var(--text-3)]">개소</span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1">OSM 인프라 및 녹지 피처</div>
      </div>

      {/* 4. Accessibility Score */}
      <div id="kpi-card-access-score" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            접근성 지수
          </span>
          <Gauge className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-xl font-bold text-[var(--text-1)] tracking-tight">{kpi.accessScore}</span>
          <span className="text-xs font-medium text-[var(--text-3)]">/ 100점</span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1">대중교통 & 생활보행 연계</div>
      </div>

      {/* 5. Impervious & Water */}
      <div id="kpi-card-impervious" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isImperviousAlert ? 'bg-[var(--warn)]' : 'bg-[var(--accent)]'}`}></span>
            불투수면 비율
          </span>
          <Droplets className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className={`text-xl font-bold tracking-tight ${isImperviousAlert ? 'text-[var(--warn)]' : 'text-[var(--text-1)]'}`}>{kpi.imperviousRatio}</span>
          <span className="text-xs font-medium text-[var(--text-3)]">%</span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1">우수 유출 및 열환경 영향</div>
      </div>

      {/* 6. Green Infra Priority */}
      <div id="kpi-card-priority" className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between group">
        <div className="text-[11px] font-medium text-[var(--text-2)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            최우선 도입 시설
          </span>
          <Leaf className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors" />
        </div>
        <div className="mt-1">
          <span className="text-sm font-bold text-[var(--text-1)] leading-tight line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
            {kpi.greenInfraPriority}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-3)] truncate mt-1 flex items-center gap-1">
          
          <span>맞춤형 식재 및 시설 권장</span>
        </div>
      </div>
    </div>
  );
};


