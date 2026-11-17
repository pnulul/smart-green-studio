import {
  AlgorithmWeights,
  GreenInfraRecommendation,
  GreenInfraType,
  OptimalCandidateSite,
  PresetProfileId,
  WeightPresetProfile,
  SiteAnalysisData,
} from '../types';

export const DEFAULT_WEIGHT_PRESETS: WeightPresetProfile[] = [
  {
    id: 'balanced',
    name: '기본 균형형 (Balanced Standard)',
    shortDesc: '환경·사회·경제적 요소를 고르게 반영한 종합 표준 모델',
    icon: '',
    weights: {
      heatReduction: 70,
      stormwaterRetention: 65,
      carbonAbsorption: 60,
      popDensity: 70,
      vulnerableAccess: 65,
      greenDeficiency: 80,
      transitConnectivity: 75,
      costEfficiency: 60,
    },
  },
  {
    id: 'heat_island',
    name: '도시열섬 완화 집중형 (Urban Heat Cooling)',
    shortDesc: '표면온도 저감, 그늘막 및 바람길 형성을 최우선으로 분석',
    icon: '',
    weights: {
      heatReduction: 100,
      stormwaterRetention: 50,
      carbonAbsorption: 70,
      popDensity: 85,
      vulnerableAccess: 70,
      greenDeficiency: 90,
      transitConnectivity: 65,
      costEfficiency: 45,
    },
  },
  {
    id: 'vulnerable_healing',
    name: '취약계층 힐링·보행접근형 (Vulnerable & Healing)',
    shortDesc: '고령자·어린이 생활반경 내 무장애 쉼터 및 보행로 녹화 우선',
    icon: '',
    weights: {
      heatReduction: 60,
      stormwaterRetention: 40,
      carbonAbsorption: 50,
      popDensity: 90,
      vulnerableAccess: 100,
      greenDeficiency: 85,
      transitConnectivity: 90,
      costEfficiency: 55,
    },
  },
  {
    id: 'flood_resilience',
    name: '침수방재·LID 우수저류형 (Flood Resilience & LID)',
    shortDesc: '불투수면 빗물 유출 저감 및 투수성 식생수로 분산 배치 우선',
    icon: '',
    weights: {
      heatReduction: 50,
      stormwaterRetention: 100,
      carbonAbsorption: 55,
      popDensity: 60,
      vulnerableAccess: 45,
      greenDeficiency: 75,
      transitConnectivity: 60,
      costEfficiency: 70,
    },
  },
  {
    id: 'carbon_neutral',
    name: '탄소중립 생태축 연결형 (Carbon Neutral & Eco-Network)',
    shortDesc: '교목 다층식재, 탄소흡수원 확충 및 산림·하천 생태축 연결',
    icon: '',
    weights: {
      heatReduction: 75,
      stormwaterRetention: 65,
      carbonAbsorption: 100,
      popDensity: 50,
      vulnerableAccess: 40,
      greenDeficiency: 80,
      transitConnectivity: 55,
      costEfficiency: 50,
    },
  },
];

export const GREEN_INFRA_META: Record<
  GreenInfraType,
  {
    label: string;
    badgeColor: string;
    icon: string;
    typicalAreaRange: string;
    description: string;
  }
> = {
  pocket_park: {
    label: '도시형 쿨링 쌈지공원 (Pocket Park)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '150 ~ 500 ㎡',
    description: '고밀 도심 자투리 유휴부지를 활용한 그늘목+쿨링포그+스마트 휴게 쉼터',
  },
  rooftop_green: {
    label: '공공·민간 옥상녹화 (Sky Green Roof)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '200 ~ 800 ㎡',
    description: '건물 옥상 슬라브를 활용한 세둠 매트, 목재 데크 및 경량형 꿀벌·나비 정원',
  },
  vertical_garden: {
    label: '벽면·수직 정원 (Living Green Facade)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '80 ~ 300 ㎡',
    description: '옹벽 및 도로변 건물 입면에 등반식물과 입체 플랜터를 결합한 복사열 차단벽',
  },
  pedestrian_green_street: {
    label: '보행자 전용 가로숲길 / 녹도 (Pedestrian Green Street)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '연장 300 ~ 800 m',
    description: '역세권 통학·통근 가로에 2열 다층 가로수와 투수 블록을 연계한 쿨링 가로망',
  },
  rain_garden: {
    label: '저영향개발(LID) 침투형 빗물정원 & 식생수로',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '100 ~ 400 ㎡',
    description: '도로변 유출수 여과 침투를 위한 자생 초본류 식생수로 및 분산 쇄석 저류조',
  },
  cooling_forest: {
    label: '도시 미기후 쿨링 숲 (Urban Cooling Buffer Forest)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '500 ~ 2,000 ㎡',
    description: '주풍향 바람길 유입부에 침엽·활엽 혼효림을 배치하여 도심 열기를 냉각 배출',
  },
  stream_corridor: {
    label: '수변 생태완충대 & 친수 산책로 (Stream Eco-Corridor)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '연장 400 ~ 1,200 m',
    description: '하천·수계 변 생태축 복원, 수변 정화식물 군락 및 수달·조류 서식처 조성',
  },
  steep_slope_garden: {
    label: '사면보강 테라스 가든 (Terraced Slope Garden)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '200 ~ 600 ㎡',
    description: '구릉지 급경사지에 계단식 조경 플랜터 및 토사유출 방지 자생 지피식물 식재',
  },
  street_trees: {
    label: '가로수 그늘목 & 띠녹지대 (Street Canopy)',
    badgeColor: 'bg-[var(--surface-1)] text-[var(--text-2)] border-[var(--border-hair)]',
    icon: '',
    typicalAreaRange: '연장 200 ~ 600 m',
    description: '보행자 도로변 다층 가로수목 및 띠녹지대 식재를 통한 보행로 그늘막 형성',
  },
};

/**
 * MCDA / AHP 다기준 의사결정 추천 엔진
 */
export function calculateGreenInfraSuitability(
  weights: AlgorithmWeights,
  envParams: {
    lat: number;
    lng: number;
    greenRatio: number;
    imperviousRatio: number;
    heatRiskIndex: number;
    transitCount: number;
    commercialCount: number;
    eduCount: number;
    hasRiver: boolean;
    isSteepSlope: boolean;
    agingRatioVal: number;
  }
): {
  recommendations: GreenInfraRecommendation[];
  candidateSites: OptimalCandidateSite[];
} {
  const {
    lat,
    lng,
    greenRatio,
    imperviousRatio,
    heatRiskIndex,
    transitCount,
    commercialCount,
    eduCount,
    hasRiver,
    isSteepSlope,
    agingRatioVal,
  } = envParams;

  // 1. Compute Type Specific Suitability Scores (0-100) based on MCDA Weights
  const typesToEvaluate: GreenInfraType[] = [
    'pocket_park',
    'pedestrian_green_street',
    'rooftop_green',
    'vertical_garden',
    'rain_garden',
    'cooling_forest',
  ];

  if (hasRiver) typesToEvaluate.push('stream_corridor');
  if (isSteepSlope) typesToEvaluate.push('steep_slope_garden');

  const scoredTypes = typesToEvaluate.map((t) => {
    let score = 0;
    const factorBreakdown: { factorName: string; score: number; weightPct: number }[] = [];

    // Factor 1: Heat Reduction
    let heatScore = 60;
    if (t === 'cooling_forest' || t === 'pocket_park') {
      heatScore = heatRiskIndex >= 4 ? 98 : heatRiskIndex === 3 ? 88 : 70;
    } else if (t === 'pedestrian_green_street' || t === 'vertical_garden') {
      heatScore = imperviousRatio > 70 ? 92 : 78;
    } else if (t === 'rooftop_green') {
      heatScore = imperviousRatio > 65 ? 88 : 72;
    } else if (t === 'rain_garden') {
      heatScore = 68;
    }
    factorBreakdown.push({
      factorName: '도시열섬 완화',
      score: heatScore,
      weightPct: weights.heatReduction,
    });

    // Factor 2: Stormwater / LID
    let waterScore = 50;
    if (t === 'rain_garden') {
      waterScore = imperviousRatio > 70 ? 98 : 86;
    } else if (t === 'rooftop_green' || t === 'pocket_park') {
      waterScore = imperviousRatio > 60 ? 84 : 70;
    } else if (t === 'stream_corridor') {
      waterScore = hasRiver ? 95 : 40;
    } else if (t === 'pedestrian_green_street') {
      waterScore = 75;
    }
    factorBreakdown.push({
      factorName: '우수저류 및 LID',
      score: waterScore,
      weightPct: weights.stormwaterRetention,
    });

    // Factor 3: Carbon Sequestration
    let carbonScore = 60;
    if (t === 'cooling_forest') carbonScore = 96;
    else if (t === 'stream_corridor') carbonScore = 92;
    else if (t === 'pedestrian_green_street') carbonScore = 88;
    else if (t === 'pocket_park') carbonScore = 80;
    else if (t === 'rooftop_green') carbonScore = 74;
    factorBreakdown.push({
      factorName: '탄소흡수·생태성',
      score: carbonScore,
      weightPct: weights.carbonAbsorption,
    });

    // Factor 4: Population Density & Flow
    let popScore = 60;
    if (t === 'pocket_park' || t === 'pedestrian_green_street') {
      popScore = commercialCount > 10 ? 95 : 82;
    } else if (t === 'rooftop_green') {
      popScore = commercialCount > 10 ? 90 : 75;
    } else if (t === 'vertical_garden') {
      popScore = 80;
    }
    factorBreakdown.push({
      factorName: '인구밀도·유동인구',
      score: popScore,
      weightPct: weights.popDensity,
    });

    // Factor 5: Vulnerable Population Access
    let vulnScore = 60;
    if (t === 'pocket_park') {
      vulnScore = agingRatioVal > 18 ? 96 : 82;
    } else if (t === 'pedestrian_green_street') {
      vulnScore = eduCount >= 2 || agingRatioVal > 18 ? 94 : 80;
    } else if (t === 'steep_slope_garden') {
      vulnScore = 70;
    }
    factorBreakdown.push({
      factorName: '취약계층 접근성',
      score: vulnScore,
      weightPct: weights.vulnerableAccess,
    });

    // Factor 6: Green Deficiency (녹지 결핍도)
    let defScore = 50;
    if (greenRatio < 15) {
      defScore = t === 'pocket_park' || t === 'pedestrian_green_street' || t === 'rooftop_green' ? 98 : 88;
    } else if (greenRatio < 25) {
      defScore = 85;
    } else {
      defScore = 65;
    }
    factorBreakdown.push({
      factorName: '기존 녹지 결핍도',
      score: defScore,
      weightPct: weights.greenDeficiency,
    });

    // Factor 7: Transit Connectivity
    let transitScore = 60;
    if (t === 'pedestrian_green_street') {
      transitScore = transitCount >= 4 ? 98 : transitCount >= 2 ? 88 : 72;
    } else if (t === 'pocket_park') {
      transitScore = transitCount >= 2 ? 90 : 75;
    } else if (t === 'vertical_garden') {
      transitScore = 82;
    }
    factorBreakdown.push({
      factorName: '교통망 연계성',
      score: transitScore,
      weightPct: weights.transitConnectivity,
    });

    // Factor 8: Cost & Feasibility
    let costScore = 70;
    if (t === 'vertical_garden' || t === 'pocket_park') costScore = 88;
    else if (t === 'rain_garden') costScore = 85;
    else if (t === 'pedestrian_green_street') costScore = 78;
    else if (t === 'rooftop_green') costScore = 75;
    else if (t === 'cooling_forest') costScore = 65;
    factorBreakdown.push({
      factorName: '시공 경제성',
      score: costScore,
      weightPct: weights.costEfficiency,
    });

    // Weighted Average Calculation
    const totalWeight = factorBreakdown.reduce((sum, f) => sum + f.weightPct, 0);
    const weightedSum = factorBreakdown.reduce((sum, f) => sum + f.score * f.weightPct, 0);
    score = Math.round(weightedSum / (totalWeight || 1));

    return {
      type: t,
      score,
      factorBreakdown,
    };
  });

  // Sort by final score descending
  scoredTypes.sort((a, b) => b.score - a.score);

  // 2. Generate Recommendations & Concrete Candidate Site Hotspots
  const recommendations: GreenInfraRecommendation[] = [];
  const candidateSites: OptimalCandidateSite[] = [];

  // Distinct offsets for spatial candidate placement
  const spatialConfigs: Record<
    GreenInfraType,
    {
      dlat: number;
      dlng: number;
      areaM2: number;
      lengthM?: number;
      landUse: string;
      budget: string;
      cooling: string;
      water: string;
      carbon: string;
      social: string;
      flora: string[];
      geom: 'Point' | 'Polygon' | 'LineString';
      solution: string;
      rationale: string;
    }
  > = {
    pocket_park: {
      dlat: 0.0016,
      dlng: -0.0019,
      areaM2: 380,
      landUse: '일반상업지 이면 유휴지 (시유지 필지)',
      budget: '약 1.6억 ~ 2.2억원',
      cooling: '-2.4 °C 표면온도 저감',
      water: '+35% 우수 침투 저류',
      carbon: '+5.8 tCO2/년',
      social: '일평균 1,400명 보행 휴식 및 쿨링 쉼터 제공',
      flora: ['느티나무', '이팝나무', '배롱나무', '수국', '맥문동', '눈향나무'],
      geom: 'Polygon',
      solution: '소경목+대교목 다층 그늘숲, 투수성 블록, 안개형 쿨링포그 파고라 및 스마트 벤치 설치',
      rationale: '상업 밀집지 보행 유동인구가 집중되는 결절점으로 불투수면 열섬 완화 및 그늘 휴게 공간 긴급 필요',
    },
    pedestrian_green_street: {
      dlat: -0.0014,
      dlng: 0.0018,
      areaM2: 1200,
      lengthM: 650,
      landUse: '주요 역세권 통학·보행 연결도로 (폭 15m 가로)',
      budget: '약 2.8억 ~ 3.9억원',
      cooling: '-1.9 °C 보행 체감온도 저감',
      water: '+26% 가로변 빗물 유출 지연',
      carbon: '+11.4 tCO2/년',
      social: '보행 친화도 88% 향상 및 안전한 통학로 확보',
      flora: ['왕벚나무', '단풍나무', '화살나무', '조팝나무', '옥잠화', '수수꽃다리'],
      geom: 'LineString',
      solution: '기존 1열 가로수를 2열 다층 연속 캐노피로 확장하고 하부 식생 띠녹지대 조성',
      rationale: '지하철역 및 버스정류장 연계 보행량이 최다인 주동선으로 직사광선 차단 및 미세먼지 저감 최우선',
    },
    rooftop_green: {
      dlat: 0.0021,
      dlng: 0.0014,
      areaM2: 520,
      landUse: '행정복지센터 및 공공복합청사 평슬라브 옥상',
      budget: '약 1.8억 ~ 2.6억원',
      cooling: '최상층 냉방에너지 18.5% 절감',
      water: '+48% 옥상 우수 일시 저류',
      carbon: '+7.2 tCO2/년',
      social: '주민 옥상 커뮤니티 정원 및 조망 힐링 공간',
      flora: ['세둠류(기린초, 땅채송화)', '비비추', '붓꽃', '백리향', '구절초'],
      geom: 'Polygon',
      solution: '초경량 인공토 세둠 매트, 목재 데크 휴게 쉼터, 생물다양성 꿀벌·나비 정원 조성',
      rationale: '지상부 녹지 확충 공간이 부족한 고밀 상업·공공시설 옥상을 입체적으로 활용하여 열섬 완화',
    },
    vertical_garden: {
      dlat: -0.0022,
      dlng: -0.0015,
      areaM2: 240,
      lengthM: 120,
      landUse: '도로변 콘크리트 구조물 옹벽 및 건물 입면',
      budget: '약 1.1억 ~ 1.7억원',
      cooling: '-3.8 °C 벽면 복사열 차단',
      water: '+15% 벽면 수분 증발산',
      carbon: '+3.9 tCO2/년',
      social: '회색 인공구조물 시각적 차폐 및 미관 90% 개선',
      flora: ['담쟁이덩굴', '줄사철나무', '송악', '황금사철', '인동덩굴'],
      geom: 'LineString',
      solution: '와이어 등반 지지틀 시스템 및 자동 점적관수 일체형 모듈러 입체녹화',
      rationale: '도로변 반사열과 인공 구조물의 삭막한 경관을 개선하고 통행자 쾌적성을 극대화',
    },
    rain_garden: {
      dlat: 0.0011,
      dlng: 0.0026,
      areaM2: 290,
      landUse: '도로 사면 저지대 집수구역 및 공영주차장 완충대',
      budget: '약 1.4억 ~ 2.0억원',
      cooling: '-1.5 °C 주변 증발산 쿨링',
      water: '+62% 강우 초기오염우수 정화 및 저류',
      carbon: '+4.5 tCO2/년',
      social: '도심 침수 위험 분산 완충 및 수생태 교육장',
      flora: ['물억새', '꽃창포', '부들', '노랑꽃창포', '버드나무', '골풀'],
      geom: 'Polygon',
      solution: '침투형 쇄석 기층, 토양여과층, 자생 수변초화류 식생수로 및 오버플로우 배수구 설치',
      rationale: '불투수율이 높은 집수구역에 분산형 자연 침투 시스템을 구축하여 집중호우 침수 피해를 예방',
    },
    cooling_forest: {
      dlat: -0.0028,
      dlng: 0.0025,
      areaM2: 1500,
      landUse: '외곽 간선도로변 완충녹지대 및 바람길 유입부',
      budget: '약 3.5억 ~ 5.2억원',
      cooling: '-3.2 °C 광역 미기후 냉각',
      water: '+40% 토양 침투 및 지하수 함양',
      carbon: '+18.5 tCO2/년',
      social: '산림 치유 산책로 및 소음·분진 완충림',
      flora: ['소나무', '편백나무', '참나무', '산벚나무', '산수유', '진달래'],
      geom: 'Polygon',
      solution: '침엽수와 활엽수 혼효 다층군락 조성, 바람길 유도 숲가꾸기 및 황토 산책로',
      rationale: '주풍향인 바람길 통로에 냉각 숲을 형성하여 도심 내부로 신선한 공기를 유입',
    },
    stream_corridor: {
      dlat: 0.0025,
      dlng: 0.0035,
      areaM2: 2400,
      lengthM: 800,
      landUse: '하천변 둔치 및 제방 완충녹지축',
      budget: '약 4.2억 ~ 6.5억원',
      cooling: '-3.0 °C 수변 증발산 냉각',
      water: '+70% 하천 홍수 완충 및 수질 개선',
      carbon: '+16.0 tCO2/년',
      social: '친수 여가 산책로 및 생태 관찰 탐방로 제공',
      flora: ['버드나무', '물억새', '달뿌리풀', '갈대', '붓꽃', '수련'],
      geom: 'LineString',
      solution: '자연형 호안 복원, 수변 식생완충림대 및 야생동물 생태통로(Eco-corridor) 연결',
      rationale: '단절된 수변 생태계를 복원하고 시민 친수 힐링 공간을 제공하는 핵심 생태축',
    },
    steep_slope_garden: {
      dlat: -0.0030,
      dlng: -0.0022,
      areaM2: 450,
      landUse: '구릉지 자연사면 및 절토사면 구간',
      budget: '약 1.7억 ~ 2.5억원',
      cooling: '-2.2 °C 사면 토양온도 저감',
      water: '+50% 급경사지 토사유출 방지',
      carbon: '+5.2 tCO2/년',
      social: '재해위험지구 경관 개선 및 테라스 쉼터',
      flora: ['담쟁이', '철쭉', '구절초', '벌개미취', '조팝나무', '황금사철'],
      geom: 'Polygon',
      solution: '계단식 식생 포켓 플랜터, 식생네트 토양 안정화 및 전망형 벤치',
      rationale: '급경사지의 산사태·토사유출 위험을 식생공법으로 방지하고 입체 테라스 녹화',
    },
    street_trees: {
      dlat: -0.0018,
      dlng: 0.0015,
      areaM2: 800,
      lengthM: 450,
      landUse: '보행자 전용도로 및 통학로 가로변',
      budget: '약 2.1억 ~ 3.0억원',
      cooling: '-1.8 °C 보행로 표면온도 저감',
      water: '+25% 가로변 빗물 유출 지연',
      carbon: '+8.5 tCO2/년',
      social: '보행 쾌적도 향상 및 보행자 그늘막 형성',
      flora: ['이팝나무', '느티나무', '왕벚나무', '화살나무', '회양목'],
      geom: 'LineString',
      solution: '보행자 도로변 다층 가로수목 및 띠녹지대 식재',
      rationale: '보행 유동인구 밀집 가로변 보행자 일사 차단 및 미기후 개선',
    },
  };

  scoredTypes.forEach((item, index) => {
    const rank = index + 1;
    const cfg = spatialConfigs[item.type];
    const meta = GREEN_INFRA_META[item.type];
    const cLat = lat + cfg.dlat;
    const cLng = lng + cfg.dlng;

    // 1. Concrete Candidate Site Hotspot
    let polyCoords: [number, number][] | undefined = undefined;
    let lineCoords: [number, number][] | undefined = undefined;

    if (cfg.geom === 'Polygon') {
      const d = 0.0006;
      polyCoords = [
        [cLat - d, cLng - d * 1.3],
        [cLat + d * 1.1, cLng - d],
        [cLat + d * 0.9, cLng + d * 1.2],
        [cLat - d * 0.8, cLng + d * 1.1],
      ];
    } else if (cfg.geom === 'LineString') {
      const d = 0.0012;
      lineCoords = [
        [cLat - d, cLng - d * 0.8],
        [cLat - d * 0.3, cLng],
        [cLat + d * 0.4, cLng + d * 0.6],
        [cLat + d, cLng + d * 1.2],
      ];
    }

    const candidate: OptimalCandidateSite = {
      id: `candidate-${item.type}-${rank}`,
      name: `[후보지 #${rank}] ${meta.label}`,
      type: item.type,
      typeLabel: meta.label,
      rank,
      overallScore: item.score,
      lat: cLat,
      lng: cLng,
      approxAddress: `대상지 중심에서 ${Math.round(Math.sqrt(cfg.dlat * cfg.dlat + cfg.dlng * cfg.dlng) * 111000)}m 지점 (${cfg.landUse.slice(0, 18)}...)`,
      targetAreaM2: cfg.areaM2,
      targetLengthM: cfg.lengthM,
      currentLandUse: cfg.landUse,
      suitabilityRationale: cfg.rationale,
      factorScores: item.factorBreakdown,
      expectedEffects: {
        coolingDelta: cfg.cooling,
        stormwaterRetention: cfg.water,
        carbonAbsorption: cfg.carbon,
        beneficiaryPop: cfg.social,
      },
      recommendedFlora: cfg.flora,
      estimatedBudgetKrw: cfg.budget,
      geometryType: cfg.geom,
      coordinates: cfg.geom === 'Polygon' ? polyCoords : cfg.geom === 'LineString' ? lineCoords : [cLat, cLng],
    };

    candidateSites.push(candidate);

    // 2. High-level Recommendation
    recommendations.push({
      id: `rec-${item.type}`,
      type: item.type,
      title: `${rank}순위: ${meta.label}`,
      priorityRank: rank,
      locationSuitability: cfg.landUse,
      targetProblem: cfg.rationale,
      solutionProposal: cfg.solution,
      recommendedSpecies: cfg.flora,
      expectedEffects: {
        coolingEffect: cfg.cooling,
        waterRetention: cfg.water,
        carbonAbsorption: cfg.carbon,
        socialBenefit: cfg.social,
      },
      feasibilityScore: item.score,
      estimatedCostRange: cfg.budget,
      candidateSites: [candidate],
      latOffset: cfg.dlat,
      lngOffset: cfg.dlng,
      radiusMeters: Math.round(Math.sqrt(cfg.areaM2 / Math.PI) * 1.4),
      isSimulated: true,
    });
  });

  return {
    recommendations,
    candidateSites,
  };
}
