import React, { useState } from 'react';
import {
  CommonSpatialAnalysisResult,
  DatasetMetadata,
  DatasetStyle,
  SpatialCoverage,
  SpatialDistributionItem,
  SpatialKPIItem,
} from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Layers,
  PieChart as PieIcon,
  BarChart3,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
  Maximize2,
  Table as TableIcon,
} from 'lucide-react';

interface ThematicAnalysisResultProps {
  dataset: DatasetMetadata;
  analysisResult: CommonSpatialAnalysisResult;
  style: DatasetStyle | null;
  sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
}

export const ThematicAnalysisResult: React.FC<ThematicAnalysisResultProps> = ({
  dataset,
  analysisResult,
  style,
  sourceMode,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [sortBy, setSortBy] = useState<'ratio' | 'default'>('default');
  const [isSecondaryMetric, setIsSecondaryMetric] = useState<boolean>(false);

  const { coverage, kpis, distribution, secondaryDistribution, summaryText } = analysisResult;

  if (sourceMode === 'MISSING') {
    return (
      <div className="card border border-[var(--border-hair)] bg-[var(--surface-1)] p-6 rounded-lg text-center h-48 flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
        <h3 className="font-bold text-lg mb-1">데이터 미연결</h3>
        <p className="text-sm text-[var(--text-2)]">실제 데이터가 아직 연결되지 않았습니다.</p>
      </div>
    );
  }

  if (sourceMode === 'ERROR') {
    return (
      <div className="card border border-[var(--border-hair)] bg-[var(--surface-1)] p-6 rounded-lg text-center h-48 flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <h3 className="font-bold text-lg mb-1">분석 오류</h3>
        <p className="text-sm text-[var(--text-2)]">데이터를 불러오거나 분석할 수 없습니다.</p>
      </div>
    );
  }

  if (sourceMode === 'EMPTY' || analysisResult.totalValidFeatures === 0) {
    return (
      <div className="card border border-[var(--border-hair)] bg-[var(--surface-1)] p-6 rounded-lg text-center h-48 flex flex-col items-center justify-center">
        <HelpCircle className="w-8 h-8 text-[var(--text-3)] mb-2" />
        <h3 className="font-bold text-lg mb-1">결과 없음</h3>
        <p className="text-sm text-[var(--text-2)]">분석범위 내 해당 데이터가 없습니다.</p>
      </div>
    );
  }


  // Active distribution based on secondary metric toggle (if applicable)
  const activeItems: SpatialDistributionItem[] = (isSecondaryMetric && secondaryDistribution
    ? secondaryDistribution.items
    : (distribution || [])).filter(item => item.ratio > 0 || item.amount > 0);

  // Sorted items
  const sortedItems = [...activeItems].sort((a, b) => {
    if (sortBy === 'ratio') {
      return b.ratio - a.ratio;
    }
    return 0;
  });

  const canShowPie = activeItems.length <= 8 && activeItems.length > 1;

  return (
    <div className="space-y-6 text-[var(--text-1)]">
      {/* 1. Coverage & Data Quality Indicator Banner */}
      <div className="card p-3.5 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-2)]">데이터 커버리지:</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
              coverage.coverageRatio >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            {coverage.coverageRatio.toFixed(1)}% (유효 분석구역 {coverage.coverageRatio >= 90 ? '전체 포괄' : '부분 포괄'})
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-3)] font-mono">
          <span>
            대상지: <strong className="text-[var(--text-2)]">{(coverage.analysisZoneArea / 10000).toFixed(2)} ha</strong>
          </span>
          <span>•</span>
          <span>
            유효데이터: <strong className="text-[var(--text-1)]">{(coverage.validDataArea / 10000).toFixed(2)} ha</strong>
          </span>
          <span>•</span>
          <span className="text-[11px] text-[var(--text-3)]">구성비 기준: 유효데이터(100%)</span>
        </div>
      </div>

      {/* 2. Key Quantitative KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-2)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            핵심 정량 수치 (Key Indicators)
          </h4>
          <span className="text-[11px] text-[var(--text-3)]">실측 공간연산 기준</span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="card p-3.5 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg flex flex-col justify-between hover:border-[var(--border-strong)] transition-all h-auto min-h-[90px]"
            >
              <div className="text-[11px] font-medium text-[var(--text-2)] mb-1 break-words">{kpi.label}</div>
              <div className="flex items-baseline gap-1.5 my-1 flex-wrap">
                <span className="text-2xl font-bold font-mono tracking-tight" style={{ color: kpi.color || 'var(--text-1)' }}>
                  {kpi.value}
                </span>
                {kpi.unit && <span className="text-xs text-[var(--text-3)] font-semibold">{kpi.unit}</span>}
              </div>
              {kpi.description && <div className="text-[10px] text-[var(--text-3)] mt-1 whitespace-normal">{kpi.description}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Distribution Graph (Horizontal Bar / Pie Chart) */}
      <div className="card p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hair)] pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[var(--text-1)]">
              {dataset.nameKo || dataset.id} 변수별 구성비 그래프
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Secondary metric toggle (e.g. building count vs area) */}
            {secondaryDistribution && (
              <button
                data-usage-action="chart-metric"
                onClick={() => setIsSecondaryMetric(!isSecondaryMetric)}
                className="px-2.5 py-1 text-xs rounded border border-[var(--border-hair)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              >
                {isSecondaryMetric ? '건축면적 기준' : '건물수 기준'}
              </button>
            )}

            {/* Chart Type Toggle */}
            {canShowPie && (
              <div className="flex rounded bg-[var(--surface-2)] p-0.5 border border-[var(--border-hair)]">
                <button
                  data-usage-action="chart-bar"
                  onClick={() => setChartType('bar')}
                  className={`p-1 rounded text-xs flex items-center gap-1 ${
                    chartType === 'bar' ? 'bg-[var(--accent)] text-[#080B0F] font-bold' : 'text-[var(--text-2)]'
                  }`}
                  title="수평 막대형 차트"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  data-usage-action="chart-pie"
                  onClick={() => setChartType('pie')}
                  className={`p-1 rounded text-xs flex items-center gap-1 ${
                    chartType === 'pie' ? 'bg-[var(--accent)] text-[#080B0F] font-bold' : 'text-[var(--text-2)]'
                  }`}
                  title="원형 도넛 차트"
                >
                  <PieIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chart View */}
        <div className="w-full pt-2" style={{ minHeight: '300px', height: `${Math.max(300, sortedItems.length * 36 + 60)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart
                layout="vertical"
                data={sortedItems}
                margin={{ top: 10, right: 30, left: 100, bottom: 5 }}
              >
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SpatialDistributionItem;
                      return (
                        <div className="bg-[#0e141b] border border-[var(--border-hair)] p-2.5 rounded shadow-xl text-xs font-mono z-50 relative">
                          <div className="font-bold text-[var(--text-1)] mb-1 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.label}
                          </div>
                          <div className="text-[var(--text-2)]">
    {data.amountFormatted.includes('㎡') || data.amountFormatted.includes('ha') || data.amountFormatted.includes('km²') ? '면적' : '수치'}: {data.amountFormatted}
  </div>
                          <div className="text-[var(--accent)] font-bold">비율: {data.ratio.toFixed(1)}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ratio" radius={[0, 4, 4, 0]} barSize={24}>
                  {sortedItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || 'var(--accent)'} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={sortedItems}
                  dataKey="ratio"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {sortedItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#35C6E8'} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SpatialDistributionItem;
                      return (
                        <div className="bg-[#0e141b] border border-[var(--border-hair)] p-2.5 rounded shadow-xl text-xs font-mono z-50 relative">
                          <div className="font-bold text-[var(--text-1)] mb-1 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.label}
                          </div>
                          <div className="text-[var(--text-2)]">
    {data.amountFormatted.includes('㎡') || data.amountFormatted.includes('ha') || data.amountFormatted.includes('km²') ? '면적' : '수치'}: {data.amountFormatted}
  </div>
                          <div className="text-[var(--accent)] font-bold">비율: {data.ratio.toFixed(1)}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Detailed Quantitative Breakdown Table */}
      <div className="card p-4 bg-[var(--surface-1)] border border-[var(--border-hair)] rounded-lg space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border-hair)] pb-2.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[var(--text-1)]">상세 분석표 (Detailed Breakdown)</h4>
          </div>

          <button
            data-usage-action="chart-sort"
            onClick={() => setSortBy(sortBy === 'ratio' ? 'default' : 'ratio')}
            className="flex items-center gap-1 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border-hair)]"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>정렬: {sortBy === 'ratio' ? '비율순' : '기본분류순'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hair)] text-[var(--text-3)] font-mono">
                <th className="py-2 px-2.5 font-medium">분류 항목</th>
                <th className="py-2 px-2.5 font-medium text-right">점유 면적/수치</th>
                <th className="py-2 px-2.5 font-medium text-right">구성비 (%)</th>
                {sortedItems.some((i) => i.count !== undefined) && (
                  <th className="py-2 px-2.5 font-medium text-right">피처 수</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hair)]/40 font-mono">
              {sortedItems.map((item) => (
                <tr key={item.key} className="hover:bg-[var(--surface-2)]/60 transition-colors">
                  <td className="py-2 px-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-sans text-[var(--text-1)] font-medium">{item.label}</span>
                  </td>
                  <td className="py-2 px-2.5 text-right text-[var(--text-2)]">{item.amountFormatted}</td>
                  <td className="py-2 px-2.5 text-right font-bold text-[var(--accent)]">
                    {item.ratio.toFixed(1)}%
                  </td>
                  {item.count !== undefined && (
                    <td className="py-2 px-2.5 text-right text-[var(--text-3)]">{item.count.toLocaleString()}개</td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-hair)] font-bold text-[var(--text-1)] font-mono bg-[var(--surface-2)]/40">
                <td className="py-2 px-2.5">합계 (Total)</td>
                <td className="py-2 px-2.5 text-right">
                  {analysisResult.geometryType === 'LineString'
                    ? `${(analysisResult.totalAmount / 1000).toFixed(2)} km`
                    : analysisResult.geometryType === 'Point'
                    ? `${analysisResult.totalAmount.toLocaleString()} 개소`
                    : `${(analysisResult.totalAmount / 10000).toFixed(2)} ha`}
                </td>
                <td className="py-2 px-2.5 text-right text-emerald-400">100.0%</td>
                {sortedItems.some((i) => i.count !== undefined) && (
                  <td className="py-2 px-2.5 text-right text-[var(--text-2)]">
                    {analysisResult.totalValidFeatures.toLocaleString()}개
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Summary Text */}
      {summaryText && (
        <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border-hair)] rounded-lg text-xs leading-relaxed text-[var(--text-2)]">
          <strong className="text-[var(--text-1)] mr-1">분석 요약:</strong>
          {summaryText}
        </div>
      )}
    </div>
  );
};
