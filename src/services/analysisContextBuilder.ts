import { SiteAnalysisData, AnalysisContext, BufferShape } from '../types';
import { buildAnalysisZone } from '../utils/geometryUtils';

export const buildAnalysisContext = (
  site: SiteAnalysisData,
  bufferShape: BufferShape,
  climateOverride?: Partial<AnalysisContext['climate']>
): AnalysisContext => {
  const targetZone = buildAnalysisZone(
    site.lat,
    site.lng,
    site.activeRadius,
    bufferShape,
    site.siteName
  );

  return {
    target: {
      ...targetZone,
      id: `${site.id}:${site.lat}:${site.lng}:${site.activeRadius}:${bufferShape}`,
      siteName: site.siteName,
      address: site.address,
    },
    terrain: {
      avgElevation: 0,
      avgSlope: parseFloat(site.natural.averageSlope) || 0,
      slopeDistribution: []
    },
    landuse: {
      landUseDistribution: [],
      landCoverDistribution: [],
      zoningDistribution: []
    },
    green: {
      greenRatio: 0,
      parkArea: 0,
      parkCount: 0,
    },
    ecology: {
      ecologyGradeDistribution: []
    },
    urban: {
      buildingCount: 0,
      roadArea: 0,
      poiCount: site.pois.length,
      transitCount: site.pois.filter(p => p.category === '대중교통').length,
      populationTotal: 0,
    },
    climate: {
      avgLst: climateOverride?.avgLst ?? 0,
      minLst: climateOverride?.minLst,
      maxLst: climateOverride?.maxLst,
      validFeatureCount: climateOverride?.validFeatureCount,
      sourceMode: climateOverride?.sourceMode || 'MISSING',
      datasetId: climateOverride?.datasetId || '17_lst',
      valueField: climateOverride?.valueField,
      fieldStatus: climateOverride?.fieldStatus,
      fieldError: climateOverride?.fieldError,
      avgTemp: 0,
      annualRainfall: 0,
      environmentalIndex: 0,
    }
  };
};

export function buildAiResearchContext(
  currentSite: any,
  spatialAnalysisResults: Record<string, any>,
  newsResults: any[]
) {
  // Exclude unsupported/removed datasets
  const excludedDatasets = ['12_slope', '13_aspect', '16_environmental_value'];
  const validAnalyses = {};
  
  if (spatialAnalysisResults) {
    for (const [key, value] of Object.entries(spatialAnalysisResults)) {
      if (value.status === 'success' && !excludedDatasets.includes(key)) {
        validAnalyses[key] = {
          kpis: value.kpis,
          distribution: value.distribution,
          coverageRatio: value.coverage?.coverageRatio,
          summaryText: value.summaryText,
        };
      }
    }
  }

  // Build the minimal relevant context for AI
  return {
    site: {
      siteName: currentSite?.siteName,
      address: currentSite?.address,
      radius: currentSite?.activeRadius,
      lat: currentSite?.lat,
      lng: currentSite?.lng,
    },
    analyses: validAnalyses,
    news: newsResults,
  };
}
