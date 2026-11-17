export type RadiusOption = 250 | 500 | 1000 | 1500 | 2000;
export type BufferShape = 'circle' | 'rectangle';

export interface AnalysisZone {
  id: string;
  name: string;
  siteName?: string;
  address?: string;
  shapeType: BufferShape;
  geometry: any; // GeoJSON Polygon
  radius: number; // For circle, or indicative size for rectangle
  area: number; // in square meters
  lat: number;
  lng: number;
}

export interface RasterAnalysisStats {
  mean: number;
  min: number;
  max: number;
  median: number;
  classRatio: Record<string, number>;
  validPixelCount: number;
}

export interface AnalysisContext {
  target: AnalysisZone;
  terrain: {
    avgElevation: number;
    avgSlope: number;
    slopeDistribution: { level: string; ratio: number }[];
  };
  landuse: {
    landUseDistribution: { label: string; ratio: number; color: string }[];
    landCoverDistribution: { label: string; ratio: number; color: string }[];
    zoningDistribution: { label: string; ratio: number; color: string }[];
  };
  green: {
    greenRatio: number;
    parkArea: number;
    parkCount: number;
  };
  ecology: {
    ecologyGradeDistribution: { label: string; ratio: number; color: string }[];
  };
  urban: {
    buildingCount: number;
    roadArea: number;
    poiCount: number;
    transitCount: number;
    populationTotal: number;
  };
  climate: {
    avgLst: number;
    minLst?: number;
    maxLst?: number;
    validFeatureCount?: number;
    sourceMode?: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
    datasetId?: string;
    valueField?: string | null;
    fieldStatus?: string;
    fieldError?: string;
    avgTemp: number;
    annualRainfall: number;
    environmentalIndex: number; // e.g. Air Quality or Heat Risk
  };
}

export interface StudentReflectionNote {
  id: string;
  title: string;
  stageKey: string;
  stageLabel: string;
  content: string;
  tags: string[];
  designIdea: string;
  createdAt: string;
  updatedAt: string;
}

export interface KpiData {
  radiusLabel: string;
  radiusMeters: number;
  greenRatio: number; // e.g. 18.5 (%)
  greenRatioSub: string;
  facilitiesCount: number; // e.g. 14
  accessScore: number; // 0-100
  heatRiskIndex: number; // 1 (low) - 5 (critical)
  greenInfraPriority: string; // e.g. "가로수 그늘목 & 빗물정원 시급"
  carbonAbsorptionTons: number; // e.g. 42.5 tCO2/yr
  imperviousRatio: number; // e.g. 74 (%)
}

export interface UrbanPlanData {
  zoningName: string;
  zoningBadgeType: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  floorAreaRatio: number; // 용적률 %
  buildingCoverageRatio: number; // 건폐율 %
  maxFloors: number; // 최고층수
  livingSphere: string; // 생활권역 (e.g. "동북권 근린생활권")
  initPlanProgress: number; // 착수율 %
  completionProgress: number; // 완료율 %
  legalGreenMandate: string; // 법정 조경 확보 의무 비율 (e.g. 대지면적의 15% 이상)
}

export interface LandscapePlanData {
  landscapeZoneName: string;
  zoneBadgeType: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  landscapeType: string; // e.g. "도시·생활경관" | "자연·산림경관" | "수변·하천경관"
  viewCorridor: string; // 주요 조망축 (e.g. "금정산 주조망축 연계")
  recommendedSpecies: string[]; // e.g. ["느티나무", "왕벚나무", "이팝나무", "산철쭉"]
  colorPalette: string; // e.g. "Y-YR 자연수목 계열"
  guidelineTags: string[];
}

export interface DemographicData {
  admDong: string; // 행정동명
  totalPop: string; // e.g. "24,850명"
  households: string; // e.g. "10,210세대"
  agingRatio: string; // e.g. "21.4% (초고령사회 진입)"
  popDensity: string; // e.g. "28,400명/km²"
  vulnerablePopCount: string; // e.g. "어린이·노약자 7,420명 (30.1%)"
  tags: string[];
}

export interface SocioEconomicData {
  dominantUse: string; // e.g. "일반상업 및 고밀 주거혼재"
  commercialFacilities: string; // e.g. "142개소 (음식점, 카페, 판매)"
  schoolsCount: string; // e.g. "초2, 중1, 대학교 인접"
  parkAreaPerCapita: string; // e.g. "3.8 ㎡/인 (법정 6.0㎡ 미달)"
  parkSatisfaction: string; // e.g. "38% (녹지 결핍감 높음)"
  tags: string[];
}

export interface NaturalEnvironmentData {
  forestRatio: number; // %
  waterRatio: number; // %
  imperviousRatio: number; // %
  dominantWindDir: string; // e.g. "남남서풍(SSW) · 하절기 바람길"
  avgAnnualTemp: string; // e.g. "14.2 °C"
  annualRainfall: string; // e.g. "1,450 mm"
  averageSlope: string; // e.g. "8.5° (완경사 구릉지)"
  solarAspect: string; // e.g. "남동향(SE) 62%, 남서향(SW) 28%"
  tags: string[];
}

export interface PoiItem {
  id: string;
  category: '식생·공원' | '대중교통' | '교육·공공' | '상업·생활' | '수변·하천';
  /** CSS variable token name (e.g. '--cat-1' ... '--cat-5'), NOT a hex code */
  color: string;
  name: string;
  distanceMeters: number;
  walkingMinutes: number;
  lat: number;
  lng: number;
  interpretation: string;
}

export interface IssueItem {
  id: string;
  severity: 'danger' | 'warning' | 'info' | 'success';
  tag: string;
  title: string;
  description: string;
  domain: '환경' | '사회' | '공간' | '기후';
  linkedGreenInfraId?: string;
}

// ── 그린인프라 유형 ──
export type GreenInfraType =
  | 'pocket_park' // 포켓파크 / 쌈지공원
  | 'rooftop_green' // 옥상 녹화 (Sky Green Roof)
  | 'vertical_garden' // 벽면·수직 정원 (Green Facade)
  | 'pedestrian_green_street' // 보행자 전용 가로숲길 / 녹도
  | 'rain_garden' // 저영향개발(LID) 빗물정원 & 식생수로
  | 'cooling_forest' // 도시 미기후 쿨링 숲
  | 'stream_corridor' // 하천·수변 생태통로
  | 'steep_slope_garden' // 사면보강 테라스 가든
  | 'street_trees'; // 가로수·수목대 (호환용)

// ── 추천 알고리즘 가중치 모델 (MCDA / AHP) ──
export interface AlgorithmWeights {
  heatReduction: number; // 도시열섬 완화 가중치 (0-100)
  stormwaterRetention: number; // 우수 저류 및 침수방재 가중치 (0-100)
  carbonAbsorption: number; // 탄소 흡수 및 생태 연결성 가중치 (0-100)
  popDensity: number; // 인구 밀도 및 유동인구 가중치 (0-100)
  vulnerableAccess: number; // 고령자·어린이 취약계층 접근성 가중치 (0-100)
  greenDeficiency: number; // 기존 녹지 결핍도 보완 가중치 (0-100)
  transitConnectivity: number; // 대중교통 및 보행가로 연계 가중치 (0-100)
  costEfficiency: number; // 시공 경제성 및 사업비 효율 가중치 (0-100)
}

export type PresetProfileId =
  | 'balanced' // 기본 균형형
  | 'heat_island' // 열섬 완화 집중형
  | 'vulnerable_healing' // 취약계층 힐링·접근성형
  | 'flood_resilience' // 침수방재·LID 우수저류형
  | 'carbon_neutral' // 탄소중립 생태축 연결형
  | 'custom'; // 사용자 맞춤형

export interface WeightPresetProfile {
  id: PresetProfileId;
  name: string;
  shortDesc: string;
  icon: string;
  weights: AlgorithmWeights;
}

// ── 그린인프라 최적 설치 위치 후보지 (Candidate Site Hotspot) ──
export interface OptimalCandidateSite {
  id: string;
  name: string;
  type: GreenInfraType;
  typeLabel: string;
  rank: number;
  overallScore: number; // 0-100
  lat: number;
  lng: number;
  approxAddress: string;
  targetAreaM2: number;
  targetLengthM?: number;
  currentLandUse: string;
  suitabilityRationale: string;
  factorScores: {
    factorName: string;
    score: number;
    weightPct: number;
  }[];
  expectedEffects: {
    coolingDelta: string;
    stormwaterRetention: string;
    carbonAbsorption: string;
    beneficiaryPop: string;
  };
  recommendedFlora: string[];
  estimatedBudgetKrw: string;
  geometryType: 'Point' | 'Polygon' | 'LineString';
  coordinates?: any;
}

export interface GreenInfraRecommendation {
  id: string;
  type: GreenInfraType;
  title: string;
  priorityRank: number; // 1, 2, 3...
  locationSuitability: string;
  targetProblem: string; // 해결하려는 문제
  solutionProposal: string; // 제안 상세
  recommendedSpecies: string[];
  expectedEffects: {
    coolingEffect: string; // e.g. "-1.8 °C 도시열섬 완화"
    waterRetention: string; // e.g. "+35% 빗물 유출 저감"
    carbonAbsorption: string; // e.g. "+12.4 tCO2/yr"
    socialBenefit: string; // e.g. "보행자 쉼터 및 휴게공간 350㎡ 확충"
  };
  feasibilityScore: number; // 0-100
  estimatedCostRange: string; // e.g. "중 (약 1.5억 ~ 2.5억원)"
  candidateSites?: OptimalCandidateSite[];
  latOffset?: number; // relative to site center for simulation
  lngOffset?: number;
  radiusMeters?: number;
  isSimulated?: boolean;
}

export interface BuildingGisItem {
  id: string;
  bldName: string;
  floors: number; // 지상층수
  structure: string; // 철근콘크리트, 철골조 등
  mainUsage: string; // 교육연구시설, 제2종근린생활, 업무, 공동주택 등
  grossFloorAreaM2: number; // 연면적 ㎡
  buildingAreaM2: number; // 건축면적 ㎡
  coverageRatioPct: number; // 건폐율 %
  floorAreaRatioPct: number; // 용적률 %
  builtYear: number; // 준공연도
  rooftopAreaM2: number; // 옥상 가용면적 ㎡
  greenRoofPotential: '최우수' | '우수' | '보통' | '부적합';
  structuralLoadCapacity: '고하중(혼합/집약형)' | '중하중(저관리경량)' | '경량형' | '보강필요';
  solarPotentialKw: number; // BIPV/태양광 잠재량 (kW)
  lat: number;
  lng: number;
}

export interface BuildingGisAnalysis {
  totalBuildingsCount: number;
  totalGrossFloorAreaM2: number;
  totalRooftopAreaM2: number;
  greenRoofFeasibleAreaM2: number; // 옥상녹화 가능 면적 ㎡
  greenRoofCoolingPotentialDelta: string; // e.g. "-1.4 °C 표면온도 저감"
  carbonOffsetTonsPerYear: number; // 연간 탄소 상쇄량 (tCO2/년)
  avgBuildingAgeYears: number;
  structureBreakdown: { structure: string; count: number; ratio: number }[];
  usageBreakdown: { usage: string; count: number; areaM2: number; ratio: number }[];
  topGreenRoofCandidates: BuildingGisItem[];
  buildingsList: BuildingGisItem[];
}

// ── 토지 필지 GIS 인벤토리 (Continuous Cadastral Parcel GIS) ──
export interface LandParcelItem {
  pnu: string; // 필지고유번호
  jibun: string; // 지번
  jimok: string; // 지목 (대, 학교용지, 공원, 도로, 잡종지, 전, 답, 임야 등)
  areaM2: number; // 필지 면적 ㎡
  ownership: '국유지' | '시·구유지(공유지)' | '사유지' | '법인/기타';
  publicLandPricePerM2: number; // 개별공시지가 (원/㎡)
  totalLandValueMillionKrw: number; // 공시지가 총액 (백만원)
  zoning: string; // 용도지역
  acquisitionFeasibility: '매우 높음(국공유지)' | '높음(공공협약)' | '중간(민관협력/매입)' | '낮음(고밀사유지)';
  greenInfraSuitabilityScore: number; // 0-100점
  recommendedIntervention: string; // 권장 그린인프라
  lat: number;
  lng: number;
}

export interface LandParcelAnalysis {
  totalParcelsCount: number;
  totalAreaM2: number;
  publicOwnedRatioPct: number; // 국공유지 비율 (%)
  privateOwnedRatioPct: number; // 사유지 비율 (%)
  avgPublicLandPricePerM2: number; // 평균 개별공시지가 (원/㎡)
  /** jimok distribution with color holding CSS variable token name ('--cat-1' ... '--cat-5') */
  jimokDistribution: { jimok: string; count: number; areaM2: number; ratioPct: number; color: string }[];
  /** ownership distribution with color holding CSS variable token name ('--cat-1' ... '--cat-5') */
  ownershipDistribution: { type: string; count: number; areaM2: number; ratioPct: number; color: string }[];
  highFeasibilityParcels: LandParcelItem[]; // 국공유지 및 우선 사업대상 필지
  parcelsList: LandParcelItem[];
}

// ── 데이터기반 조경계획 데이터 인벤토리 매트릭스 ──
export type InventoryRole = 'layer' | 'diagram' | 'metric';
export type InventoryStatus = 'connected' | 'needsUpload' | 'notSupported';

export interface DataInventoryItem {
  categoryNumber: number;
  categoryName: string;
  dataName: string;
  description: string;
  spatialScale: string;
  source: string;
  fileFormat: string;
  purpose: string;
  integrationStatus: '완벽 연계' | '공간 모델 연동' | '참조 및 확장 지원';
  dashboardModule: string;
  role: InventoryRole;
  status: InventoryStatus;
}

export interface LandUseSegment {
  label: string;
  pct: number;
  /** CSS variable token name (e.g. '--cat-1' ... '--cat-5'), NOT a hex code */
  color: string;
  areaHa?: number;
}

export interface BuildingData {
  totalCount: string;
  avgFloors: string;
  coverageRatio: string;
  avgBuiltYear: string;
  /** usage distribution with color holding CSS variable token name ('--cat-1' ... '--cat-5') */
  usageDistribution: { label: string; pct: number; color: string }[];
}

export interface ClimateMonthData {
  month: string;
  temp: number; // °C
  rain: number; // mm
  solarRad: number; // MJ/m²
}

export interface AccessibilityRadarItem {
  category: string;
  score: number; // 0-100
  fullMark: number;
}

export interface GoogleNewsArticle {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  snippet: string;
  url: string;
  category: '도시재생' | '공원·녹지' | '기후·환경' | '교통·보행' | '지역현안';
  tags: string[];
  sentiment?: '기회' | '현안' | '갈등' | '개선';
}

export interface UrbanNewsItem {
  category: string;
  badgeClass: string;
  title: string;
  description: string;
  date: string;
  url?: string;
  source?: string;
}

// ── 대상지 분석 프로세스 단계 (Site Analysis Process Stages) ──
export type LandscapeDesignStage =
  | 'setup' // 01 대상지 설정
  | 'analysis' // 02 주제별 공간분석
  | 'ai_report' // 03 AI 해석 및 보고서
  | 'ai_lab'; // 04 AI 연구실

export type AnalysisTab = '종합' | '지형환경' | '토지이용·계획' | '녹지·생태환경' | '도시환경' | '기후환경' | '수문환경';

export interface DatasetMetadata {
  id: string;
  folder: string;
  nameKo: string;
  nameEn: string;
  description: string;
  category: string;
  dataType: 'vector' | 'raster';
  geometryType: string;
  mapFile: string;
  styleFile: string;
  sourceMode: string;
  analysisType: string;
  valueField: string | null;
  labelField: string | null;
  unit: string | null;
  sourceLayer?: string;
  noDataValues?: number[];
}

export interface DatasetStyleClass {
  value?: string | number;
  min?: number;
  max?: number;
  includeMin?: boolean;
  includeMax?: boolean;
  color: string;
  label: string;
  radius?: number;
}

export interface DatasetStyle {
  configured: boolean;
  field: string | null;
  type?: 'category' | 'range';
  fillOpacity?: number;
  classes: DatasetStyleClass[];
}

export interface CatalogItem {
  id: string;
  folder: string;
  nameKo: string;
  nameEn: string;
  category: string;
  enabled: boolean;
}

export interface DatasetDiagnosticInfo {
  datasetId: string;
  folder: string;
  url: string;
  httpStatus: number | string;
  parseStatus: 'SUCCESS' | 'EMPTY' | 'INVALID_JSON' | 'NOT_FOUND';
  featureCount: number;
  geometryType: string;
  propertyFields: string[];
  valueField: string | null;
  sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
  loaded: boolean;
  rendered: boolean;
  fieldError?: string | null;
  intersectingFeaturesCount?: number;
  featureCountBeforeClip?: number;
  featureCountAfterClip?: number;
  dnSampleValues?: any[];
  normalizedDnSample?: any[];
  matchedStyleCount?: number;
  unmatchedStyleCount?: number;
  calculatedStats?: {
    avg?: number;
    min?: number;
    max?: number;
    validCount?: number;
  } | null;
}

export interface LoadedDatasetResult {
  datasetId: string;
  folder: string;
  metadata: DatasetMetadata | null;
  style: DatasetStyle | null;
  geoJson: any | null;
  rasterBuffer: ArrayBuffer | null;
  diagnostics: DatasetDiagnosticInfo;
  analysis?: CommonSpatialAnalysisResult | null;
}

export interface SpatialCoverage {
  analysisZoneArea: number; // total zone area in m2
  validDataArea: number; // data existing intersecting area in m2
  coverageRatio: number; // 0 ~ 100 (%)
  unit: string;
  isComplete: boolean;
}

export interface SpatialKPIItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  color?: string;
  badge?: string;
}

export interface SpatialDistributionItem {
  key: string;
  label: string;
  value: string | number; // raw value or category index
  amount: number; // area in m2, length in m, or count
  amountFormatted: string; // e.g. "301,500 ㎡" or "12.4 km"
  ratio: number; // 0 ~ 100 (%)
  unit: string; // '㎡', 'ha', 'km²', 'km', '개', '동', '명', '세대'
  color: string; // hex color from style.json
  count?: number; // feature count
}

export interface CommonSpatialAnalysisResult {
  totalAreaM2?: number;
  datasetId: string;
  datasetName: string;
  category: string;
  sourceMode: 'REAL' | 'MISSING' | 'EMPTY' | 'ERROR';
  geometryType?: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString' | 'Point' | 'MultiPoint' | 'Raster' | 'Unknown';
  coverage?: SpatialCoverage;
  kpis: SpatialKPIItem[];
  distribution: SpatialDistributionItem[];
  secondaryDistribution?: {
    metricName: string;
    items: SpatialDistributionItem[];
  };
  totalAmount?: number;
  totalUnit?: string;
  totalValidFeatures: number;
  summaryText: string;
  valueField: string | null;
  diagnostics?: DatasetDiagnosticInfo;
}

export interface LandscapeStageInfo {
  id: LandscapeDesignStage;
  stepNumber: string;
  title: string;
  englishTitle: string;
  shortDesc: string;
  icon: string;
}

// ── OSM 세부 수목 & 가로수목 현황 데이터 ──
export interface OsmTreeItem {
  id: string;
  lat: number;
  lng: number;
  species?: string;
  genus?: string;
  heightM?: number;
  canopyRadiusM: number;
  isStreetTree?: boolean;
}

export interface TreesAnalysisData {
  totalTreesCount: number;
  canopyCoverageRatio: number; // 수관 피복률 (%)
  treeDensityPerHectare: number; // ha당 수목 본수
  speciesBreakdown: { species: string; count: number; ratio: number; tag: string }[];
  shadedWalkwayRatio: number; // 그늘 보행로 비율 (%)
  carbonSequestrationTonsPerYear: number; // 연간 탄소 흡수량 (tCO2/년)
  treesList: OsmTreeItem[];
}

// ── OSM 세부 보행로 & 보행친화도 네트워크 데이터 ──
export interface OsmPedestrianSegment {
  id: string;
  name?: string;
  highwayType: string;
  lengthM: number;
  hasShade: boolean;
  surface?: string;
  isAccessible: boolean;
  coordinates: [number, number][];
}

export interface PedestrianAnalysisData {
  totalFootwayLengthM: number; // 총 보행로 연장 (m)
  sidewalkRatio: number; // 보차 분리 및 보행전용로 비율 (%)
  walkabilityScore: number; // 보행 친화도 점수 (0-100)
  pedestrianSafetyIndex: number; // 보행 안전 지수 (0-100)
  shadedPathLengthM: number; // 수목 그늘 보행로 연장 (m)
  segments: OsmPedestrianSegment[];
}

// ── 기후 회복력 및 수문/미기후 정량 지표 ──
export interface ClimateResilienceData {
  twosfcaAccessibilityScore: number; // 2SFCA 공원녹지 접근성/형평성 점수 (0-100)
  scsCnRetentionRate: number; // SCS-CN 우수 저류 및 유출 저감률 (%)
  utciComfortLevel: string; // UTCI 체감온도 쾌적성 등급 (예: "경미한 열스트레스")
  uhiMitigationPotential: number; // UHI 표면온도 저감 잠재량 (°C)
  ecologicalCorridorScore: number; // 생태축 연결성 지수 (0-100)
}

// ── 지리 공간 데이터 레이어 (GeoJSON Layers) ──
export type GeoJsonLayerKey =
  | 'landUseZonation' // 토지 이용 현황 폴리곤
  | 'demographicGrid' // 인구 밀도 및 취약계층 격자
  | 'transitNetwork' // 교통망 & 대중교통 거점
  | 'pedestrianWalkways' // OSM 보행로 네트워크 & 그늘보행로
  | 'treesCanopy' // OSM 수목 및 가로수 캐노피
  | 'existingParks' // 기존 공원 및 식생 군락
  | 'heatIslandGrid' // 도시 열섬 및 지표면 온도
  | 'lidSuitability' // LID 빗물저류 침수 취약지
  | 'ecologicalCorridors' // 생태축 연결성 & 바람길 코리도
  | 'candidateSites' // 추천 그린인프라 최적 설치 위치
  | 'customUploaded'; // 사용자 정의 GeoJSON

export interface GeoJsonLayerItem {
  key: GeoJsonLayerKey;
  label: string;
  category: '기본 현황' | '환경·기후' | '그린인프라 전략' | '사용자 데이터';
  visible: boolean;
  opacity: number; // 0.1 - 1.0
  /** CSS variable token name (e.g. '--cat-1' ... '--cat-5'), NOT a hex code */
  color: string;
  description: string;
  legend: { label: string; /** CSS variable token name ('--cat-1' ... '--cat-5'), NOT a hex code */ color: string; desc?: string }[];
  geoJsonData?: any; // GeoJSON FeatureCollection
}

export interface CustomGeoJsonItem {
  id: string;
  name: string;
  fileName: string;
  featureCount: number;
  visible: boolean;
  opacity: number;
  /** CSS variable token name (e.g. '--cat-1' ... '--cat-5'), NOT a hex code */
  color: string;
  data: any; // GeoJSON FeatureCollection
  uploadedAt: string;
}

export interface LayerToggleState {
  bufferRings: boolean;
  vegetationNDVI: boolean;
  transitCatchment: boolean;
  poiDensity: boolean;
  aspectSolar: boolean;
  landUsePolygons: boolean;
  heatIslandRisk: boolean;
  proposedGreenInfra: boolean;
  opacity: number; // 0.1 ~ 1.0
}

export interface SiteAnalysisData {
  id: string;
  siteName: string;
  address: string;
  lat: number;
  lng: number;
  activeRadius: RadiusOption;
  kpi: KpiData;
  urban: UrbanPlanData;
  landscape: LandscapePlanData;
  demographic: DemographicData;
  socioEconomic: SocioEconomicData;
  natural: NaturalEnvironmentData;
  summary: string;
  issues: IssueItem[];
  greenInfraRecommendations: GreenInfraRecommendation[];
  candidateSites?: OptimalCandidateSite[];
  landUse: LandUseSegment[];
  building: BuildingData;
  climateMonthly: ClimateMonthData[];
  accessibilityRadar: AccessibilityRadarItem[];
  pois: PoiItem[];
  news: UrbanNewsItem[];
  treesData?: TreesAnalysisData;
  pedestrianData?: PedestrianAnalysisData;
  buildingGis?: BuildingGisAnalysis;
  parcelGis?: LandParcelAnalysis;
  climateResilience?: ClimateResilienceData;
  multiBufferComparison?: {
    radius: number;
    greenRatio: number;
    facilitiesCount: number;
    transitCount: number;
    accessScore: number;
    primaryPriority: string;
  }[];
}

export interface AnalysisHistoryItem {
  id: string;
  timestamp: number;
  siteName: string;
  address: string;
  lat: number;
  lng: number;
  radius: RadiusOption;
  greenRatio: number;
  facilitiesCount: number;
  accessScore: number;
  priority: string;
}

// ── PNU 부산대학교 조경학과 도시조경 연구실 (Landscape Urbanism Lab at PNU) 수강생/수업 인증 세션 ──
export interface StudentAuthSession {
  isLoggedIn: boolean;
  studentName: string;
  studentId: string;
  courseName: string;
  courseCode: string;
  authTime: string;
}

export interface StudentSpatialMemo {
  id: string;
  siteName: string;
  studentName: string;
  studentId: string;
  courseName?: string;
  content: string;
  tags: string[];
  createdAt: string;
}


