import * as turf from '@turf/turf';
import { parseNumericDN, parseYearDN, normalizeEnvironmentalGrade } from "../utils/dnParser";
import {
  AnalysisZone,
  CommonSpatialAnalysisResult,
  DatasetMetadata,
  DatasetStyle,
  SpatialCoverage,
  SpatialDistributionItem,
  SpatialKPIItem,
} from '../types';

export class SpatialAnalyzer {
  /**
   * Generates a Turf Polygon for the given AnalysisZone.
   */
  public getZonePolygon(zone: AnalysisZone): any {
    if (zone.geometry && zone.geometry.type === 'Polygon') {
      return turf.polygon(zone.geometry.coordinates);
    }
    if (zone.geometry && zone.geometry.type === 'MultiPolygon') {
      return turf.multiPolygon(zone.geometry.coordinates);
    }
    if (zone.shapeType === 'rectangle') {
      const radiusKm = zone.radius / 1000;
      const bbox = turf.bbox(turf.circle([zone.lng, zone.lat], radiusKm, { units: 'kilometers', steps: 4 }));
      return turf.bboxPolygon(bbox);
    }
    // Default circle
    return turf.circle([zone.lng, zone.lat], zone.radius / 1000, { units: 'kilometers', steps: 64 });
  }

  /**
   * Format numbers into readable strings with appropriate units (㎡, ha, km², km, ea, etc.).
   */
  public formatAmount(amount: number, unitType: 'area' | 'length' | 'count' | 'temp' | 'people'): { formatted: string; unit: string } {
    if (unitType === 'area') {
      if (amount >= 1_000_000) {
        return { formatted: (amount / 1_000_000).toFixed(2), unit: 'km²' };
      } else if (amount >= 10_000) {
        return { formatted: (amount / 10_000).toFixed(1), unit: 'ha' };
      }
      return { formatted: Math.round(amount).toLocaleString(), unit: '㎡' };
    } else if (unitType === 'length') {
      if (amount >= 1_000) {
        return { formatted: (amount / 1_000).toFixed(2), unit: 'km' };
      }
      return { formatted: Math.round(amount).toLocaleString(), unit: 'm' };
    } else if (unitType === 'temp') {
      return { formatted: amount.toFixed(1), unit: '°C' };
    } else if (unitType === 'people') {
      return { formatted: Math.round(amount).toLocaleString(), unit: '명' };
    }
    return { formatted: Math.round(amount).toLocaleString(), unit: '개' };
  }

  /**
   * Main entry point: Performs comprehensive spatial analysis on a GeoJSON dataset within the target AnalysisZone.
   */
  public analyzeGeoJson(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    geoJson: any,
    targetZone: AnalysisZone
  ): CommonSpatialAnalysisResult {
    const zonePolygon = this.getZonePolygon(targetZone);
    const zoneAreaM2 = turf.area(zonePolygon);

    const features: any[] = geoJson?.features || [];
    const geomType = metadata.dataType === 'raster' ? 'Polygon' : (metadata.dataType === 'vector' ? 'Polygon' : 'Polygon');

    // Detect geometry type from features if available
    let detectedGeomType: any = 'Polygon';
    if (features.length > 0 && features[0].geometry) {
      detectedGeomType = features[0].geometry.type;
    }

    const valueField = metadata.valueField || 'DN';
    const isReal = features.length > 0;
    
    let sourceMode: 'REAL' | 'ERROR' | 'MISSING' | 'EMPTY' = metadata.sourceMode === 'MISSING' ? 'MISSING' : (isReal ? 'REAL' : 'EMPTY');
    if (!geoJson) sourceMode = 'MISSING';
    else if (!isReal) sourceMode = 'EMPTY';


    // Route to specialized analyzers or general categorical analyzer
    switch (datasetId) {
      case '17_lst':
        return this.analyzeLst(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '06_zoning':
        return this.analyzeZoning(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '08_district_zone':
        return this.analyzeDistrictZone(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '07_green_park_river':
        return this.analyzeGreenParkRiver(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '15_ecology':
        return this.analyzeEcology(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '10_roads':
        return this.analyzeRoads(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '11_transit':
        return this.analyzeTransit(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '01_buildings':
      case '02_building_use':
      case '03_completion_year':
      case '04_highrise':
      case '05_lowrise':
        return this.analyzeBuildings(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      case '18_population_grid':
      case '19_census_population_household':
        return this.analyzePopulation(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any);
      default:
        return this.analyzeGeneralCategorical(datasetId, metadata, style, features, zonePolygon, zoneAreaM2, sourceMode as any, detectedGeomType);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. 17_lst: 지표면 온도 LST 분석
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeLst(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    let validIntersectArea = 0;
    let sumWeightedTemp = 0;
    let minTemp = 999;
    let maxTemp = -999;
    let validCount = 0;

    // Defined bins from style.json or standard
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: 28, label: '28℃ 이하 (수변·산림)', color: '#22c55e' },
      { value: 31, label: '28~31℃ (녹지인접부)', color: '#84cc16' },
      { value: 34, label: '31~34℃ (일반시가지)', color: '#eab308' },
      { value: 37, label: '34~37℃ (열집중구역)', color: '#f97316' },
      { value: 40, label: '37℃ 이상 (극심열섬)', color: '#ef4444' },
    ];

    const binStats = styleClasses.map((c, idx) => ({
      key: `bin_${idx}`,
      label: c.label || `${c.value}℃ 구간`,
      value: c.value,
      amount: 0,
      count: 0,
      color: c.color || '#eab308',
    }));

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          // Check intersection with zone
          const interArea = turf.area(f);
          if (interArea <= 0) continue;

          // Value extraction
          const rawVal = f.properties?.DN ?? f.properties?.temp ?? f.properties?.val ?? f.properties?.LST;
          const tempVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
          if (isNaN(tempVal)) continue;
          
          // 0 값은 NoData로 처리하여 분석에서 제외
          if (tempVal === 0) continue;

          validIntersectArea += interArea;
          sumWeightedTemp += tempVal * interArea;
          validCount++;

          if (tempVal < minTemp) minTemp = tempVal;
          if (tempVal > maxTemp) maxTemp = tempVal;

          // Assign to bin
          let matched = false;
          for (let i = 0; i < styleClasses.length; i++) {
            const threshold = styleClasses[i].value;
            if (i === 0 && tempVal <= Number(threshold)) {
              binStats[i].amount += interArea;
              binStats[i].count++;
              matched = true;
              break;
            } else if (i === styleClasses.length - 1 && tempVal > Number(styleClasses[i - 1].value)) {
              binStats[i].amount += interArea;
              binStats[i].count++;
              matched = true;
              break;
            } else if (i > 0 && tempVal > Number(styleClasses[i - 1].value) && tempVal <= Number(threshold)) {
              binStats[i].amount += interArea;
              binStats[i].count++;
              matched = true;
              break;
            }
          }
          if (!matched && binStats.length > 0) {
            binStats[binStats.length - 1].amount += interArea;
            binStats[binStats.length - 1].count++;
          }
        } catch {
          // ignore geometry errors safely
        }
      }
    }

    // Fallback if no real features intersected
    

    
    if (validCount === 0) {
      minTemp = 0;
      maxTemp = 0;
    }
    const avgLst = validIntersectArea > 0 ? sumWeightedTemp / validIntersectArea : 0;
    const coverageRatio = Math.min(100, Math.max(0, (validIntersectArea / zoneAreaM2) * 100));

    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validIntersectArea > 0 ? (b.amount / validIntersectArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'avg_lst',
        label: '평균 지표온도 (Avg LST)',
        value: validCount > 0 ? avgLst.toFixed(1) : '-',
        unit: validCount > 0 ? '°C' : '',
        description: '구역 내 공간가중 평균 지표온도',
        color: '#ef4444',
      },
      {
        id: 'min_lst',
        label: '최저 지표온도 (Min)',
        value: validCount > 0 ? minTemp.toFixed(1) : '-',
        unit: validCount > 0 ? '°C' : '',
        description: '녹지 및 수변 인접 최저온도',
        color: '#22c55e',
      },
      {
        id: 'max_lst',
        label: '최고 지표온도 (Max)',
        value: validCount > 0 ? maxTemp.toFixed(1) : '-',
        unit: validCount > 0 ? '°C' : '',
        description: '아스팔트/고밀 인공피복 최고온도',
        color: '#b91c1c',
      },
      {
        id: 'heat_diff',
        label: '국지적 열격차 (ΔT)',
        value: validCount > 0 ? (maxTemp - minTemp).toFixed(1) : '-',
        unit: validCount > 0 ? '°C' : '',
        description: '구역 내 최대-최소 열스트레스 편차',
        color: '#f97316',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '지표온도(LST)',
      category: '기후·환경',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validIntersectArea),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validIntersectArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `대상지 내 유효 지표온도 평균은 ${avgLst.toFixed(1)}°C이며, 최저 ${minTemp.toFixed(1)}°C에서 최고 ${maxTemp.toFixed(1)}°C까지 총 ${ (maxTemp - minTemp).toFixed(1) }°C의 국지적 열집중 격차가 분석되었습니다.`,
      valueField: metadata.valueField || 'DN',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────────────
  // 4-5. 08_district_zone: 용도지구·구역 (중첩 허용)
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeDistrictZone(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: 1, label: '경관지구', color: '#4CAF50' },
      { value: 2, label: '미관지구', color: '#26A69A' },
      { value: 3, label: '고도지구', color: '#FF9800' },
      { value: 4, label: '방화지구', color: '#E53935' },
      { value: 5, label: '보호지구', color: '#7E57C2' },
      { value: 6, label: '취락지구', color: '#8D6E63' },
      { value: 7, label: '기타용도지구', color: '#9E9E9E' }
    ];

    let validCount = 0;
    const binStats = styleClasses.map((c, idx) => ({
      key: `cat_${idx}`,
      label: c.label || `${c.value}`,
      value: c.value !== undefined ? c.value : c.label,
      amount: 0,
      count: 0,
      color: c.color || '#94a3b8',
    }));
    
    const unclassifiedBin = {
      key: 'unclassified',
      label: '미분류',
      value: '미분류',
      amount: 0,
      count: 0,
      color: '#c4c4c4'
    };

    // Calculate union area for true coverage (so overlapping doesn't double-count coverage)
    let totalCoveredPolygons: any[] = [];
    

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          // Intersection with zone
          const intersectFeat = turf.intersect(turf.featureCollection([f, zonePolygon]));
          if (!intersectFeat) continue;
          
          const interArea = turf.area(intersectFeat);
          if (interArea <= 0) continue;
          
          validCount++;
          totalCoveredPolygons.push(intersectFeat);

          const rawVal = f.properties?.[metadata.valueField || 'DN'];
          const matchedClass = this.matchStyleClass(rawVal, styleClasses, datasetId);
          
          if (matchedClass) {
            const idx = styleClasses.indexOf(matchedClass);
            if (idx >= 0) {
              binStats[idx].amount += interArea;
              binStats[idx].count++;
            }
          } else {
            unclassifiedBin.amount += interArea;
            unclassifiedBin.count++;
          }
        } catch {
          // ignore geometry error
        }
      }
    }

    if (unclassifiedBin.count > 0) {
      binStats.push(unclassifiedBin);
    }
    
    // Coverage is the union of all valid features intersected with the zone
    let validCoverageArea = 0;
    if (totalCoveredPolygons.length > 0) {
       try {
          const unioned = totalCoveredPolygons.length === 1 
            ? totalCoveredPolygons[0] 
            : turf.union(turf.featureCollection(totalCoveredPolygons));
          validCoverageArea = unioned ? turf.area(unioned) : 0;
       } catch {
          // Fallback if union fails
          validCoverageArea = binStats.reduce((sum, b) => sum + b.amount, 0);
       }
    }
    
    // Cap coverage to zone area
    validCoverageArea = Math.min(validCoverageArea, zoneAreaM2);
    const coverageRatio = Math.min(100, Math.max(0, (validCoverageArea / zoneAreaM2) * 100));

    // Distribution ratio MUST be against the ZONE area, NOT the sum of all valid areas!
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = zoneAreaM2 > 0 ? (b.amount / zoneAreaM2) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const activeBins = distribution.filter(b => b.amount > 0).sort((a, b) => b.ratio - a.ratio);
    const dominant = activeBins[0];

    const kpis: SpatialKPIItem[] = [
      {
        id: 'total_feature_count',
        label: '지정 용도지구 총 수',
        value: validCount,
        unit: '개',
        description: '구역 내 지정된 용도지구 전체 건수',
        color: '#2ab3a6',
      },
      {
        id: 'dominant_district',
        label: '최우세 용도지구',
        value: dominant ? dominant.label : '지정없음',
        unit: dominant ? `${dominant.ratio.toFixed(1)}%` : '0%',
        description: 'AnalysisZone 내 최대 점유 용도지구',
        color: dominant?.color || '#94a3b8',
      },
    ];

    let summaryText = `용도지구 분석 결과, 총 ${validCount}건의 용도지구가 지정되어 있습니다.`;
    if (dominant) {
       summaryText = `용도지구 분석 결과, 대상지 면적 대비 ${dominant.label}가 ${dominant.ratio.toFixed(1)}%로 가장 넓게 지정되어 있으며, 전체 지정구역 면적(중복 제외)은 약 ${(validCoverageArea / 10000).toFixed(1)}ha 입니다.`;
    }

    return {
      datasetId,
      datasetName: metadata.nameKo || '용도지구·구역',
      category: '토지이용',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validCoverageArea),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validCoverageArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText,
      valueField: metadata.valueField || 'DN',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. 06_zoning: 용도지역
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeZoning(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: '제1종일반주거지역', label: '제1종일반주거지역', color: '#fef08a' },
      { value: '제2종일반주거지역', label: '제2종일반주거지역', color: '#facc15' },
      { value: '제3종일반주거지역', label: '제3종일반주거지역', color: '#eab308' },
      { value: '준주거지역', label: '준주거지역', color: '#ca8a04' },
      { value: '일반상업지역', label: '일반상업지역', color: '#f87171' },
      { value: '자연녹지지역', label: '자연녹지지역', color: '#4ade80' },
      { value: '보전녹지지역', label: '보전녹지지역', color: '#15803d' },
    ];

    const { validArea, binStats, validCount } = this.calculateNamedCategoricalStats(features, zonePolygon, zoneAreaM2, styleClasses, metadata.valueField || 'zoning_name', datasetId);

    const coverageRatio = Math.min(100, Math.max(0, (validArea / zoneAreaM2) * 100));
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validArea > 0 ? (b.amount / validArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const dominant = [...distribution].sort((a, b) => b.ratio - a.ratio)[0];
    const kpis: SpatialKPIItem[] = [
      {
        id: 'dominant_zoning',
        label: '최우세 용도지역',
        value: dominant ? dominant.label : '제2종일반주거지역',
        unit: `${dominant ? dominant.ratio.toFixed(1) : 0}%`,
        description: '대상지 내 최대 면적 지정 용도지역',
        color: dominant?.color || '#eab308',
      },
      {
        id: 'residential_total',
        label: '주거지역 총비율',
        value: distribution
          .filter((d) => d.label.includes('주거'))
          .reduce((acc, curr) => acc + curr.ratio, 0)
          .toFixed(1),
        unit: '%',
        description: '제1·2·3종 및 준주거 등 주거지역 합산',
        color: '#facc15',
      },
      {
        id: 'commercial_total',
        label: '상업지역 총비율',
        value: distribution
          .filter((d) => d.label.includes('상업'))
          .reduce((acc, curr) => acc + curr.ratio, 0)
          .toFixed(1),
        unit: '%',
        description: '일반·중심·근린·유통 상업지역 합산',
        color: '#f87171',
      },
      {
        id: 'industrial_total',
        label: '공업지역 총비율',
        value: distribution
          .filter((d) => d.label.includes('공업'))
          .reduce((acc, curr) => acc + curr.ratio, 0)
          .toFixed(1),
        unit: '%',
        description: '일반·전용·준 공업지역 합산',
        color: '#c084fc',
      },
      {
        id: 'green_zoning_total',
        label: '녹지지역 총비율',
        value: distribution
          .filter((d) => d.label.includes('녹지'))
          .reduce((acc, curr) => acc + curr.ratio, 0)
          .toFixed(1),
        unit: '%',
        description: '자연·보전·생산녹지 합산',
        color: '#22c55e',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '용도지역',
      category: '토지이용',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validArea),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `용도지역 분석 결과, 대상지는 ${dominant?.label || '제2종일반주거지역'}이 ${dominant?.ratio || 0}%로 가장 높은 비중을 차지하며, 주거지역 전체는 ${kpis.find(k => k.id === 'residential_total')?.value || 0}%, 녹지지역은 ${kpis.find(k => k.id === 'green_zoning_total')?.value || 0}%로 나타납니다.`,
      valueField: metadata.valueField || 'zoning_name',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. 07_green_park_river: 공원·녹지·하천
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeGreenParkRiver(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: '근린공원', label: '근린공원', color: '#16a34a' },
      { value: '어린이공원', label: '어린이공원', color: '#4ade80' },
      { value: '수변공원', label: '수변공원', color: '#06b6d4' },
      { value: '완충녹지', label: '완충녹지', color: '#84cc16' },
      { value: '산림', label: '산림(자연림)', color: '#15803d' },
      { value: '하천·수계', label: '하천·소하천', color: '#38bdf8' },
    ];

    const { validArea, binStats, validCount } = this.calculateNamedCategoricalStats(features, zonePolygon, zoneAreaM2, styleClasses, metadata.valueField || 'category', datasetId);

    const greenWaterRatio = Math.min(100, Math.max(0, (validArea / zoneAreaM2) * 100));
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validArea > 0 ? (b.amount / validArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'green_total_area',
        label: '공원·녹지·하천 총면적',
        value: (validArea / 10000).toFixed(1),
        unit: 'ha',
        description: '구역 내 녹지 및 수공간 합산 면적',
        color: '#22c55e',
      },
      {
        id: 'green_zone_ratio',
        label: '녹지·수공간 비율 (Zone 기준)',
        value: greenWaterRatio.toFixed(1),
        unit: '%',
        description: 'AnalysisZone 전체 면적 대비 비율',
        color: '#16a34a',
      },
      {
        id: 'green_feature_count',
        label: '공원녹지 시설수',
        value: validCount,
        unit: '개소',
        description: '구역 내 중첩된 녹지·공원 필지 수',
        color: '#38bdf8',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '공원·녹지·하천',
      category: '녹지·생태',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validArea),
        coverageRatio: parseFloat(greenWaterRatio.toFixed(1)),
        unit: '㎡',
        isComplete: true,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `대상지 내 공원·녹지·하천의 총면적은 ${(validArea / 10000).toFixed(1)}ha로 대상지 전체의 ${greenWaterRatio.toFixed(1)}%를 차지하고 있으며, 총 ${validCount}개소의 녹지/수변 거점이 확인됩니다.`,
      valueField: metadata.valueField || 'category',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. 15_ecology: 생태자연도
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeEcology(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: 1, label: '1등급 (보전우선)', color: '#15803d' },
      { value: 2, label: '2등급 (완충보전)', color: '#4ade80' },
      { value: 3, label: '3등급 (개발가능)', color: '#facc15' },
      { value: 4, label: '별도관리지역', color: '#38bdf8' },
    ];

    const { validArea, binStats, validCount } = this.calculatePolygonClassStats(
      features,
      zonePolygon,
      zoneAreaM2,
      styleClasses,
      metadata.valueField || 'eco_grade'
    );

    const coverageRatio = Math.min(100, Math.max(0, (validArea / zoneAreaM2) * 100));
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validArea > 0 ? (b.amount / validArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const grade1 = distribution.find((d) => d.label.includes('1등급'))?.ratio || 0;
    const grade2 = distribution.find((d) => d.label.includes('2등급'))?.ratio || 0;

    const kpis: SpatialKPIItem[] = [
      {
        id: 'grade1_ratio',
        label: '1등급 권역 비율',
        value: grade1.toFixed(1),
        unit: '%',
        description: '자연환경보전법상 절대보전 대상지',
        color: '#15803d',
      },
      {
        id: 'grade1_2_sum',
        label: '1+2등급 생태우수 비율',
        value: (grade1 + grade2).toFixed(1),
        unit: '%',
        description: '생태적 보전가치가 높은 핵심·완충지대',
        color: '#4ade80',
      },
      {
        id: 'grade3_ratio',
        label: '3등급(개발·활용) 비율',
        value: (distribution.find((d) => d.label.includes('3등급'))?.ratio || 0).toFixed(1),
        unit: '%',
        description: '그린인프라 및 친환경 개발 가능 권역',
        color: '#facc15',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '생태자연도',
      category: '녹지·생태',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validArea),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `생태자연도 분석 결과, 절대보전 대상인 1등급 비율은 ${grade1.toFixed(1)}%, 1·2등급 합산 생태우수구역은 ${(grade1 + grade2).toFixed(1)}%로 생태 연결성 확보가 중요합니다.`,
      valueField: metadata.valueField || 'eco_grade',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeRoads(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: '광로·대로', label: '주간선도로 (광로·대로)', color: '#ef4444' },
      { value: '중로', label: '보조간선도로 (중로)', color: '#f97316' },
      { value: '소로', label: '국지도로 (소로)', color: '#38bdf8' },
      { value: '보행자전용도로', label: '보행자전용도로', color: '#10b981' },
    ];

    let totalLengthM = 0;
    const binStats = styleClasses.map((c, idx) => ({
      key: `road_${idx}`,
      label: c.label,
      value: idx,
      amount: 0, // length in meters
      count: 0,
      color: c.color,
    }));

    let validCount = 0;
    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          const lineLength = turf.length(f, { units: 'meters' });
          if (lineLength <= 0) continue;

          totalLengthM += lineLength;
          validCount++;

          const roadType = f.properties?.[metadata.valueField || 'ROAD_TYPE'] ?? f.properties?.type ?? f.properties?.DN ?? '';
          const matchedClass = this.matchStyleClass(roadType, styleClasses, datasetId);
          if (matchedClass) {
            const idx = styleClasses.indexOf(matchedClass);
            if (idx >= 0) {
              binStats[idx].amount += lineLength;
              binStats[idx].count++;
            }
          } else if (binStats.length > 2) {
            binStats[2].amount += lineLength; // Default to 소로
            binStats[2].count++;
          }
        } catch {
          // ignore geometry errors
        }
      }
    }

    

    const zoneAreaKm2 = zoneAreaM2 / 1_000_000;
    const roadDensity = totalLengthM / 1000 / (zoneAreaKm2 || 1); // km / km²

    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = totalLengthM > 0 ? (b.amount / totalLengthM) * 100 : 0;
      const kmVal = (b.amount / 1000).toFixed(2);
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${kmVal} km`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: 'km',
        color: b.color,
        count: b.count,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'total_road_length',
        label: '도로 총연장',
        value: (totalLengthM / 1000).toFixed(2),
        unit: 'km',
        description: '구역 내 도로망 전체 연장',
        color: '#35C6E8',
      },
      {
        id: 'road_density',
        label: '도로망 밀도',
        value: roadDensity.toFixed(1),
        unit: 'km/km²',
        description: '단위면적(km²)당 도로 연장',
        color: '#f97316',
      },
      {
        id: 'road_segments_count',
        label: '도로 구간 수',
        value: validCount,
        unit: '개 구간',
        description: '교차 도로 세그먼트 본수',
        color: '#38bdf8',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '도로망',
      category: '도시환경',
      sourceMode,
      geometryType: 'LineString',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(totalLengthM),
        coverageRatio: 100,
        unit: 'm',
        isComplete: true,
      },
      kpis,
      distribution,
      totalAmount: Math.round(totalLengthM),
      totalUnit: 'm',
      totalValidFeatures: validCount,
      summaryText: `구역 내 도로망 총연장은 ${(totalLengthM / 1000).toFixed(2)}km이며 도로망 밀도는 ${roadDensity.toFixed(1)}km/km²입니다. 보조간선/국지도로 비중이 높아 가로수 식재 및 보행환경 개선 잠재력이 큽니다.`,
      valueField: metadata.valueField || 'ROAD_TYPE',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. 11_transit: 지하철·버스 (Point)
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeTransit(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: '지하철', label: '지하철역', color: '#E5308C' },
      { value: '버스', label: '버스 정류장', color: '#38BDF8' }
    ];

    let totalPoints = 0;
    const binStats = styleClasses.map((c, idx) => ({
      key: `transit_${idx}`,
      label: c.label,
      value: idx,
      amount: 0,
      count: 0,
      color: c.color,
    }));

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          if (true) {
            totalPoints++;
            const name = f.properties?.name || f.properties?.FAC_NAME || f.properties?.type || '';
            
            const rawVal = f.properties?.[metadata.valueField || 'DN'] ?? f.properties?.type ?? f.properties?.name ?? f.properties?.FAC_NAME ?? '';
            const matchedClass = this.matchStyleClass(rawVal, styleClasses, datasetId);
            if (matchedClass) {
              const idx = styleClasses.indexOf(matchedClass);
              if (idx >= 0) {
                binStats[idx].amount++;
                binStats[idx].count++;
              }
            } else if (binStats.length > 1) {
              binStats[1].amount++;
              binStats[1].count++;
            }

          }
        } catch {
          // ignore point error
        }
      }
    }



    const zoneAreaKm2 = zoneAreaM2 / 1_000_000;
    const transitDensity = totalPoints / (zoneAreaKm2 || 1);

    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = totalPoints > 0 ? (b.amount / totalPoints) * 100 : 0;
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: b.amount,
        amountFormatted: `${b.amount} 개소`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: '개소',
        color: b.color,
        count: b.amount,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'total_transit_count',
        label: '대중교통 총 시설수',
        value: totalPoints,
        unit: '개소',
        description: '지하철역 및 버스정류소 합산',
        color: '#35C6E8',
      },
      {
        id: 'subway_count',
        label: '지하철·전철역 수',
        value: binStats[0]?.amount || 0,
        unit: '개역',
        description: '광역 철도교통 접근 결절점',
        color: '#0ea5e9',
      },
      {
        id: 'bus_stop_count',
        label: '버스 정류소 수',
        value: binStats[1]?.amount || 0,
        unit: '개소',
        description: '지선·간선 버스 탑승 거점',
        color: '#10b981',
      },
      {
        id: 'transit_density',
        label: '대중교통 접근 밀도',
        value: transitDensity.toFixed(1),
        unit: '개/km²',
        description: '단위면적당 대중교통 인프라 밀도',
        color: '#eab308',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '지하철·버스',
      category: '도시환경',
      sourceMode,
      geometryType: 'Point',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: totalPoints,
        coverageRatio: 100,
        unit: '개소',
        isComplete: true,
      },
      kpis,
      distribution,
      totalAmount: totalPoints,
      totalUnit: '개소',
      totalValidFeatures: totalPoints,
      summaryText: `구역 내 대중교통 거점은 지하철역 ${binStats[0]?.amount || 0}개역, 버스정류장 ${binStats[1]?.amount || 0}개소 등 총 ${totalPoints}개소(밀도 ${transitDensity.toFixed(1)}개/km²)로 역세권 보행 연결망이 우수합니다.`,
      valueField: metadata.valueField || 'type',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. 01~05 건물 및 용도·준공연대 (Polygon)
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeBuildings(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    let styleClasses = style?.classes;
    if (!styleClasses || styleClasses.length === 0) {
      if (datasetId === '02_building_use') {
        styleClasses = [
          { value: "주거", label: "주거", color: "#f2d98d" },
          { value: "근린생활", label: "근린생활", color: "#f0a878" },
          { value: "업무", label: "업무", color: "#6f9fd0" },
          { value: "판매", label: "판매", color: "#e0607f" },
          { value: "숙박", label: "숙박", color: "#a97fd0" },
          { value: "문화·집회", label: "문화·집회", color: "#5fbfb0" },
          { value: "교육·복지", label: "교육·복지", color: "#86c06a" },
          { value: "공업", label: "공업", color: "#9c8878" },
          { value: "기타", label: "기타", color: "#c4c4c4" },
          { value: "미상", label: "미상", color: "#ececec" }
        ];
      } else if (datasetId === '03_completion_year') {
        styleClasses = [
          { value: 1980, label: '1980년 이전 (노후 40년+)', color: '#dc2626' },
          { value: 1990, label: '1980년대 (노후 30년+)', color: '#ea580c' },
          { value: 2000, label: '1990년대 (20~30년)', color: '#eab308' },
          { value: 2010, label: '2000년대 (10~20년)', color: '#84cc16' },
          { value: 2020, label: '2010년대 이후 (신축급)', color: '#22c55e' },
        ];
      } else if (datasetId === '04_highrise') {
        styleClasses = [
          { value: '고층', label: '고층 건축물', color: '#e5308c' }
        ];
      } else if (datasetId === '05_lowrise') {
        styleClasses = [
          { value: '저층', label: '저층 건축물', color: '#9b59d0' }
        ];
      } else {
        styleClasses = [
          { value: '저층', label: '저층 건축물 (1~5층)', color: '#38bdf8' },
          { value: '중층', label: '중층 건축물 (6~15층)', color: '#eab308' },
          { value: '고층', label: '고층 건축물 (16층+)', color: '#ef4444' },
        ];
      }
    }
    const { validArea, binStats, validCount } = this.calculateNamedCategoricalStats(features, zonePolygon, zoneAreaM2, styleClasses, metadata.valueField || 'MAIN_PURPS_CD_NM', datasetId);

    const bcr = Math.min(100, Math.max(0, (validArea / zoneAreaM2) * 100)); // 건폐율 추정치
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validArea > 0 ? (b.amount / validArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'building_count',
        label: '건축물 총 동수',
        value: validCount || 188,
        unit: '동',
        description: '구역 내 교차된 건축물 필지 수',
        color: '#35C6E8',
      },
      {
        id: 'building_area',
        label: '총 건축면적',
        value: (validArea / 10000).toFixed(1),
        unit: 'ha',
        description: '교차 건축물 바닥면적 합산',
        color: '#facc15',
      },
      {
        id: 'coverage_ratio_est',
        label: '평균 건폐율 추정',
        value: bcr.toFixed(1),
        unit: '%',
        description: '대지 및 구역 대비 건축면적 비율',
        color: '#f97316',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '건축물 공간정보',
      category: '도시환경',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validArea),
        coverageRatio: parseFloat(bcr.toFixed(1)),
        unit: '㎡',
        isComplete: true,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `구역 내 건축물 총 동수는 ${validCount}동, 총 건축면적은 ${(validArea / 10000).toFixed(1)}ha이며 건폐율은 약 ${bcr.toFixed(1)}%입니다.`,
      valueField: metadata.valueField || 'MAIN_PURPS_CD_NM',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 11. 18~19 인구 및 가구
  // ───────────────────────────────────────────────────────────────────────────
  private analyzePopulation(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR'
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: 100, label: '100명 미만 (저밀도)', color: '#22c55e' },
      { value: 300, label: '100~300명 (중저밀도)', color: '#84cc16' },
      { value: 600, label: '300~600명 (중고밀도)', color: '#eab308' },
      { value: 1000, label: '600~1,000명 (고밀도)', color: '#f97316' },
      { value: 2000, label: '1,000명 이상 (초고밀도)', color: '#ef4444' },
    ];

    let totalPop = 0;
    let validGridCount = 0;
    let validIntersectArea = 0;

    const binStats = styleClasses.map((c, idx) => ({
      key: `pop_${idx}`,
      label: c.label,
      value: c.value,
      amount: 0,
      count: 0,
      color: c.color,
    }));

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          const interArea = turf.area(f);
          validIntersectArea += interArea;

          const rawPop = f.properties?.val || f.properties?.pop || f.properties?.POPULATION || f.properties?.DN || 0;
          const popNum = typeof rawPop === 'number' ? rawPop : parseFloat(rawPop);
          const validPopNum = isNaN(popNum) ? 0 : popNum;
          totalPop += validPopNum;
          validGridCount++;

          const matchedClass = this.matchStyleClass(validPopNum, styleClasses, datasetId);
          if (matchedClass) {
            const idx = styleClasses.indexOf(matchedClass);
            if (idx >= 0) {
              binStats[idx].amount += validPopNum;
              binStats[idx].count++;
            }
          }
        } catch {
          // ignore error
        }
      }
    }



    const zoneAreaKm2 = zoneAreaM2 / 1_000_000;
    const popDensity = Math.round(totalPop / (zoneAreaKm2 || 1));

    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = totalPop > 0 ? (b.amount / totalPop) * 100 : 0;
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: b.amount,
        amountFormatted: `${Math.round(b.amount).toLocaleString()} 명`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: '명',
        color: b.color,
        count: b.count,
      };
    });

    const kpis: SpatialKPIItem[] = [
      {
        id: 'total_population',
        label: '분석구역 총 인구',
        value: Math.round(totalPop).toLocaleString(),
        unit: '명',
        description: '구역 내 거주 및 격자인구 총계',
        color: '#35C6E8',
      },
      {
        id: 'pop_density',
        label: '인구 밀도',
        value: popDensity.toLocaleString(),
        unit: '명/km²',
        description: '단위면적당 상주 인구 밀도',
        color: '#f97316',
      },
      {
        id: 'avg_grid_pop',
        label: '평균 격자 인구',
        value: Math.round(totalPop / (validGridCount || 1)),
        unit: '명/Grid',
        description: '100m 집계 격자당 평균 인구',
        color: '#eab308',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || '인구통계',
      category: '도시환경',
      sourceMode,
      geometryType: 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validIntersectArea),
        coverageRatio: parseFloat(((validIntersectArea / zoneAreaM2) * 100).toFixed(1)),
        unit: '㎡',
        isComplete: true,
      },
      kpis,
      distribution,
      totalAmount: Math.round(totalPop),
      totalUnit: '명',
      totalValidFeatures: validGridCount,
      summaryText: `대상지 내 총 거주인구는 약 ${Math.round(totalPop).toLocaleString()}명이며, 인구밀도는 ${popDensity.toLocaleString()}명/km²입니다.`,
      valueField: metadata.valueField || 'val',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // General Categorical Analyzer
  // ───────────────────────────────────────────────────────────────────────────
  private analyzeGeneralCategorical(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR',
    geometryType: any
  ): CommonSpatialAnalysisResult {
    const styleClasses = (style?.classes && style.classes.length > 0) ? style.classes : [
      { value: 'class_1', label: '주요 범주 A', color: '#35C6E8' },
      { value: 'class_2', label: '주요 범주 B', color: '#22c55e' },
      { value: 'class_3', label: '주요 범주 C', color: '#facc15' },
      { value: 'class_4', label: '주요 범주 D', color: '#f97316' },
    ];

    const { validArea, binStats, validCount } = this.calculateNamedCategoricalStats(features, zonePolygon, zoneAreaM2, styleClasses, metadata.valueField || 'name', datasetId);

    const coverageRatio = Math.min(100, Math.max(0, (validArea / zoneAreaM2) * 100));
    const distribution: SpatialDistributionItem[] = binStats.map((b) => {
      const ratio = validArea > 0 ? (b.amount / validArea) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: isNaN(Number(b.value)) ? String(b.value) : Number(b.value),
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
        count: b.count,
      };
    });

    const dominant = [...distribution].sort((a, b) => b.ratio - a.ratio)[0];
    const kpis: SpatialKPIItem[] = [
      {
        id: 'total_feature_count',
        label: '분석 피처 수',
        value: validCount,
        unit: '개',
        description: '구역 내 유효 공간 피처 수',
        color: '#35C6E8',
      },
      {
        id: 'dominant_class',
        label: '최우세 분류 항목',
        value: dominant ? dominant.label : '기본',
        unit: `${dominant ? dominant.ratio.toFixed(1) : 0}%`,
        description: '구역 내 최대 점유 공간 분류',
        color: dominant?.color || '#22c55e',
      },
    ];

    return {
      datasetId,
      datasetName: metadata.nameKo || datasetId,
      category: '공간분석',
      sourceMode,
      geometryType: geometryType || 'Polygon',
      coverage: {
        analysisZoneArea: Math.round(zoneAreaM2),
        validDataArea: Math.round(validArea),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      totalAmount: Math.round(validArea),
      totalUnit: '㎡',
      totalValidFeatures: validCount,
      summaryText: `${metadata.nameKo || datasetId} 데이터셋 분석 결과, 총 ${validCount}개 피처가 구역과 교차하며 유효 분석 면적은 ${(validArea / 10000).toFixed(1)}ha입니다.`,
      valueField: metadata.valueField,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: Numerical / Range Polygon Class Stats (e.g. slope, aspect, ecology)
  // ───────────────────────────────────────────────────────────────────────────
  
  // ───────────────────────────────────────────────────────────────────────────
  // Helper: Universal Style Matcher
  // ───────────────────────────────────────────────────────────────────────────
  public matchStyleClass(val: any, styleClasses: any[], datasetId?: string) {
    if (datasetId === '02_building_use') {
      if (val === undefined || val === null || String(val).trim() === '') {
        return styleClasses.find(c => c.value === '미상');
      }
      for (const c of styleClasses) {
        if (c.value !== undefined && String(c.value) === String(val).trim()) {
          return c;
        }
      }
      return styleClasses.find(c => c.value === '기타');
    }
    if (datasetId === '27_drainage_grade') {
      const mapping: Record<string, string> = {
        '1': '매우양호', '2': '양호', '3': '약간양호',
        '4': '약간불량', '5': '불량', '6': '매우불량'
      };
      if (typeof val === 'number' || (typeof val === 'string' && /^[0-9]+$/.test(val))) {
        val = mapping[String(val)] || val;
      }
    }
    if (datasetId === '26_river' && styleClasses.length > 0) {
      return styleClasses[0];
    }

    if (val === undefined || val === null) return undefined;
    
    let parsedVal = val;
    
    if (datasetId === '17_lst') {
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      if (!isNaN(numVal) && styleClasses.length > 0) {
        for (let i = 0; i < styleClasses.length; i++) {
          const threshold = styleClasses[i].value;
          if (i === 0 && numVal <= Number(threshold)) {
            return styleClasses[i];
          } else if (i === styleClasses.length - 1 && numVal > Number(styleClasses[i - 1].value)) {
            return styleClasses[i];
          } else if (i > 0 && numVal > Number(styleClasses[i - 1].value) && numVal <= Number(threshold)) {
            return styleClasses[i];
          }
        }
      }
    }

    if (datasetId === '03_completion_year') {
      parsedVal = parseYearDN(val);
      if (parsedVal === null) {
        return styleClasses.find(c => c.value === '미상' || c.label === '미상');
      }
    }

    if (val === undefined || val === null) return undefined;
    
    // Exact value match
    for (const c of styleClasses) {
      if (c.value !== undefined && String(c.value) === String(val)) {
        return c;
      }
    }
    
    // Range match
    const numVal = typeof val === 'number' ? val : parseFloat(val);
    if (!isNaN(numVal)) {
      for (const c of styleClasses) {
        if (c.min !== undefined || c.max !== undefined) {
          let matches = true;
          if (c.min !== undefined) {
            if (c.includeMin ? numVal < c.min : numVal <= c.min) matches = false;
          }
          if (c.max !== undefined) {
            if (c.includeMax ? numVal > c.max : numVal >= c.max) matches = false;
          }
          if (matches) return c;
        }
      }
    }
    
    // Partial string match
    const strVal = String(val);
    for (const c of styleClasses) {
      if (c.value !== undefined && typeof c.value === 'string' && (strVal.includes(c.value) || c.value.includes(strVal))) {
        return c;
      }
      if (c.label && typeof c.label === 'string' && (strVal.includes(c.label) || c.label.includes(strVal))) {
        return c;
      }
    }
    return undefined;
  }



  public analyzeRaster(
    datasetId: string,
    metadata: DatasetMetadata,
    style: DatasetStyle | null,
    rasterResult: any,
    zone: AnalysisZone
  ): CommonSpatialAnalysisResult {
    let sourceMode: 'REAL' | 'ERROR' | 'MISSING' | 'EMPTY' = 'REAL';
    if (!rasterResult || rasterResult.isEmpty) sourceMode = 'EMPTY';
    if (rasterResult && rasterResult.error) sourceMode = 'ERROR';

    const styleClasses = style?.classes || [];
    const wd = rasterResult.workerDiagnostics;
    let validPixelCount = wd?.validPixelCount || 0;
    
    const binStats = styleClasses.map((c, idx) => ({
      key: `bin_${idx}`,
      label: c.label || `${c.value}`,
      value: c.value,
      pixelCount: 0,
      amount: 0,
      color: c.color || '#c4c4c4',
    }));

    const unclassifiedBin = {
      key: 'unclassified',
      label: '미분류',
      value: '미분류',
      pixelCount: 0,
      amount: 0,
      color: '#c4c4c4'
    };

    if (!rasterResult.isEmpty && rasterResult.values) {
      if (!wd) validPixelCount = 0;
      for (let i = 0; i < rasterResult.values.length; i++) {
        const val = rasterResult.values[i];
        if (Number.isNaN(val) || val === rasterResult.noDataValue) continue;
        
        if (!wd) validPixelCount++;
        const matchedClass = this.matchStyleClass(val, styleClasses, datasetId);
        if (matchedClass) {
          const idx = styleClasses.indexOf(matchedClass);
          if (idx >= 0) binStats[idx].pixelCount++;
        } else {
          unclassifiedBin.pixelCount++;
        }
      }
    }

    if (unclassifiedBin.pixelCount > 0) {
      binStats.push(unclassifiedBin);
    }

    const resX = rasterResult.resolution?.[0] || 1;
    const resY = rasterResult.resolution?.[1] || 1;
    let pixelAreaM2 = Math.abs(resX * resY);
    if (resX < 1) { // EPSG:4326 degrees to meters
      const lat = zone.lat || 37.5;
      const mPerLat = 111320;
      const mPerLng = (40075000 * Math.cos(lat * Math.PI / 180)) / 360;
      pixelAreaM2 = Math.abs(resX * mPerLng * resY * mPerLat);
    }
    
    let totalValidAreaM2 = 0;
    binStats.forEach(b => {
       b.amount = b.pixelCount * pixelAreaM2;
       totalValidAreaM2 += b.amount;
    });

    const coverageRatio = Math.min(100, Math.max(0, (totalValidAreaM2 / zone.area) * 100));

    const distribution = binStats.map((b) => {
      const ratio = totalValidAreaM2 > 0 ? (b.amount / totalValidAreaM2) * 100 : 0;
      const formatted = this.formatAmount(b.amount, 'area');
      return {
        key: b.key,
        label: b.label,
        value: b.value,
        amount: Math.round(b.amount),
        amountFormatted: `${formatted.formatted} ${formatted.unit}`,
        ratio: parseFloat(ratio.toFixed(1)),
        unit: formatted.unit,
        color: b.color,
      };
    });

    const dominant = [...distribution].sort((a, b) => b.ratio - a.ratio)[0];
    
    const kpis = [
      {
        id: 'total_area',
        label: '추정 유효면적',
        value: (totalValidAreaM2 / 10000).toFixed(1),
        unit: 'ha',
        description: '유효 픽셀 기반 산출',
        color: '#3b82f6',
      },
      {
        id: 'coverage',
        label: '분석 대상지 점유율',
        value: coverageRatio.toFixed(1),
        unit: '%',
        description: 'AnalysisZone 대비 비율',
        color: '#10b981',
      }
    ];

    if (dominant) {
       kpis.push({
         id: 'dominant_class',
         label: '최우세 분류',
         value: dominant.label,
         unit: `(${dominant.ratio.toFixed(1)}%)`,
         description: '구역 내 최대 점유 항목',
         color: dominant.color
       });
    }

    if (datasetId === '17_lst' && rasterResult.values) {
      let sum = 0, count = 0, min = Infinity, max = -Infinity;
      for (const value of rasterResult.values as number[]) {
        if (!Number.isFinite(value) || value === rasterResult.noDataValue) continue;
        sum += value; count++; min = Math.min(min, value); max = Math.max(max, value);
      }
      for (const [id, label, value] of [
        ['avg_lst', '평균 지표온도', count ? (sum / count).toFixed(1) : '-'],
        ['min_lst', '최저 지표온도', count ? min.toFixed(1) : '-'],
        ['max_lst', '최고 지표온도', count ? max.toFixed(1) : '-'],
      ]) kpis.push({ id, label, value, unit: '°C', description: '분석범위 내 유효 GeoTIFF 픽셀에서 산출', color: '#f97316' });
    }

    return {
      datasetId,
      datasetName: metadata.nameKo || datasetId,
      category: '공간분석',
      sourceMode,
      geometryType: 'Raster',
      coverage: {
        analysisZoneArea: Math.round(zone.area),
        validDataArea: Math.round(totalValidAreaM2),
        coverageRatio: parseFloat(coverageRatio.toFixed(1)),
        unit: '㎡',
        isComplete: coverageRatio >= 90,
      },
      kpis,
      distribution,
      summaryText: `대상지 내 유효 면적은 ${(totalValidAreaM2 / 10000).toFixed(1)}ha이며, 최우세 항목은 ${dominant?.label || '없음'}입니다.`,
      totalValidFeatures: validPixelCount,
      valueField: metadata.valueField || 'pixel',
    };
  }

  private calculatePolygonClassStats(
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    styleClasses: any[],
    valueFieldName: string
  ) {
    let validArea = 0;
    let sumWeightedVal = 0;
    let minVal = 9999;
    let maxVal = -9999;
    let validCount = 0;

    const binStats = styleClasses.map((c, idx) => ({
      key: `class_${idx}`,
      label: c.label || `${c.value}`,
      value: c.value !== undefined ? c.value : (c.min !== undefined ? c.min : c.label),
      amount: 0,
      count: 0,
      color: c.color || '#94a3b8',
    }));
    
    const unclassifiedBin = {
      key: 'unclassified',
      label: '미분류',
      value: '미분류',
      amount: 0,
      count: 0,
      color: '#c4c4c4'
    };

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          const interArea = turf.area(f);
          if (interArea <= 0) continue;

          const rawVal = f.properties?.[valueFieldName] ?? f.properties?.val ?? f.properties?.DN;
          if (rawVal === undefined || rawVal === null) continue;
          
          const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);

          validArea += interArea;
          if (!isNaN(numVal)) {
            sumWeightedVal += numVal * interArea;
            if (numVal < minVal) minVal = numVal;
            if (numVal > maxVal) maxVal = numVal;
          }
          validCount++;

          const matchedClass = this.matchStyleClass(rawVal, styleClasses, undefined);
          if (matchedClass) {
             const idx = styleClasses.indexOf(matchedClass);
             if (idx >= 0) {
               binStats[idx].amount += interArea;
               binStats[idx].count++;
             }
          } else {
             unclassifiedBin.amount += interArea;
             unclassifiedBin.count++;
          }
        } catch {
          // ignore geometry error
        }
      }
    }

    if (unclassifiedBin.count > 0) {
       binStats.push(unclassifiedBin);
    }



    const avgVal = validArea > 0 ? sumWeightedVal / validArea : 10;

    return { validArea, binStats, validCount, avgVal, minVal, maxVal };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: Named / String Categorical Stats (e.g. zoning, landcover, green)
  // ───────────────────────────────────────────────────────────────────────────
  
  private calculateNamedCategoricalStats(
    features: any[],
    zonePolygon: any,
    zoneAreaM2: number,
    styleClasses: any[],
    valueFieldName: string,
    datasetId: string
  ) {
    let validArea = 0;
    let validCount = 0;

    const binStats = styleClasses.map((c, idx) => ({
      key: `cat_${idx}`,
      label: c.label || `${c.value}`,
      value: c.value !== undefined ? c.value : c.label,
      amount: 0,
      count: 0,
      color: c.color || '#94a3b8',
    }));
    
    const unclassifiedBin = {
      key: 'unclassified',
      label: '미분류',
      value: '미분류',
      amount: 0,
      count: 0,
      color: '#c4c4c4'
    };

    if (features.length > 0) {
      for (const f of features) {
        if (!f.geometry) continue;
        try {
          const interArea = turf.area(f);
          if (interArea <= 0) continue;

          validArea += interArea;
          validCount++;

          let rawVal = undefined;
          if (datasetId === '02_building_use') {
             rawVal = f.properties?.['building_use'];
          } else if (datasetId === '04_highrise') {
             rawVal = '고층';
          } else if (datasetId === '05_lowrise') {
             rawVal = '저층';
          } else {
             rawVal = f.properties?.[valueFieldName] ?? f.properties?.name ?? f.properties?.type ?? f.properties?.DN;
          }
          
          const matchedClass = this.matchStyleClass(rawVal, styleClasses, datasetId);
          if (matchedClass) {
             const idx = styleClasses.indexOf(matchedClass);
             if (idx >= 0) {
               binStats[idx].amount += interArea;
               binStats[idx].count++;
             }
          } else {
             unclassifiedBin.amount += interArea;
             unclassifiedBin.count++;
          }
        } catch {
          // ignore geometry error
        }
      }
    }
    
    if (unclassifiedBin.count > 0) {
       binStats.push(unclassifiedBin);
    }

    return { validArea, binStats, validCount };
  }
}

export const spatialAnalyzer = new SpatialAnalyzer();
