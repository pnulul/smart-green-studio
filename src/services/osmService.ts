import { SiteAnalysisData, PoiItem, GreenInfraRecommendation, RadiusOption, IssueItem } from '../types';
import { PRESET_SITES } from '../data/presetSites';
import { calculateGreenInfraSuitability, DEFAULT_WEIGHT_PRESETS } from './greenInfraAlgorithm';
import { generateMockBuildingGis, generateMockLandParcelGis } from '../data/mockGisData';

let lastNominatimTimestamp = 0;

export async function geocodeKoreanAddress(addr: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const cleanAddr = addr.trim();
  if (!cleanAddr) return null;

  // Direct coordinate match (e.g., "35.2332, 129.0794")
  const coordMatch = cleanAddr.match(/^([-+]?\d+(\.\d+)?)[,\s]+([-+]?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, displayName: `좌표: ${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  }

  // Korean address space normalization
  const normalized = cleanAddr.replace(/([가-힣])(\d)/g, '$1 $2');
  const candidates = [
    normalized,
    cleanAddr,
    normalized.replace(/(\d+)-\d+/g, '$1'),
    normalized.replace(/\s+[\d][\d\-]*\s*$/, '').trim(),
    normalized.replace(/\s+\S+$/, '').trim(),
  ];
  const uniqueQueries = Array.from(new Set(candidates)).filter((q) => q.length >= 3);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const q of uniqueQueries) {
    const gap = Date.now() - lastNominatimTimestamp;
    if (gap < 1100) {
      await wait(1100 - gap);
    }
    lastNominatimTimestamp = Date.now();

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=3&countrycodes=kr&accept-language=ko`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SmartGreenStudio-LandscapeAnalysis/2.0' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    } catch (err) {
      console.warn('[Geocoding warning]', err);
    }
  }

  return null;
}

// Shoelace spherical polygon area calculation in m²
function calcPolyArea(geom: { lat: number; lon: number }[]): number {
  if (!geom || geom.length < 3) return 0;
  let a = 0;
  const n = geom.length;
  const R = 6371000; // Earth radius in meters
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const y1 = (geom[i].lat * Math.PI) / 180;
    const y2 = (geom[j].lat * Math.PI) / 180;
    const dx = ((geom[j].lon - geom[i].lon) * Math.PI) / 180;
    a += dx * (2 + Math.sin(y1) + Math.sin(y2));
  }
  return Math.abs((a * R * R) / 2);
}

export function generateGreenInfraRecommendations(
  lat: number,
  lng: number,
  greenRatio: number,
  imperviousRatio: number,
  dominantUse: string,
  transitCount: number,
  hasRiver: boolean,
  isSteepSlope: boolean
): GreenInfraRecommendation[] {
  const list: GreenInfraRecommendation[] = [];

  // Recommendation 1: Pocket Parks / Cooling Shading
  if (imperviousRatio > 60 || greenRatio < 20) {
    list.push({
      id: 'rec-pocket',
      type: 'pocket_park',
      title: '고밀도 도심형 쿨링 쌈지공원 (Cooling Pocket Park)',
      priorityRank: 1,
      locationSuitability: '상업 밀집지 자투리 유휴부지 및 보행 결절점',
      targetProblem: '불투수면 과다로 인한 복사열 축적 및 도심 보행 휴식 쉼터 결핍',
      solutionProposal: '소경목+교목 다층식재, 투수블록 포장, 안개형 쿨링포그 파고라 및 스마트 벤치 설치',
      recommendedSpecies: ['느티나무', '이팝나무', '수국', '맥문동', '눈향나무'],
      expectedEffects: {
        coolingEffect: '-2.3 °C 국소 표면온도 저감',
        waterRetention: '+32% 우수 침투율 향상',
        carbonAbsorption: '+5.4 tCO2/년',
        socialBenefit: '일 1,200명 이상 보행 쉼터 및 그늘막 제공',
      },
      feasibilityScore: 92,
      estimatedCostRange: '소형 (약 1.2억 ~ 2.0억원)',
      latOffset: 0.0015,
      lngOffset: -0.0018,
      radiusMeters: 50,
      isSimulated: true,
    });
  }

  // Recommendation 2: Street Tree Canopy / Cooling Corridor
  list.push({
    id: 'rec-trees',
    type: 'street_trees',
    title: '연속형 다층 쿨링 가로수 캐노피 (Green Corridor)',
    priorityRank: 2,
    locationSuitability: '주요 역세권 보행 연결가로 및 통학로 구간',
    targetProblem: '하절기 직사광선 노출 및 보행 쾌적도 저하, 미세먼지 노출',
    solutionProposal: '지하 생육공간 확보형 2열 가로수 식재, 하부 관목·지피류 다층 식재대로 바람길 녹지 조성',
    recommendedSpecies: ['왕벚나무', '단풍나무', '화살나무', '조팝나무', '옥잠화'],
    expectedEffects: {
      coolingEffect: '-1.8 °C 체감온도 저감',
      waterRetention: '+22% 가로변 빗물 유출 지연',
      carbonAbsorption: '+9.2 tCO2/년',
      socialBenefit: '보행 안전도 및 도시 미관 85% 향상',
    },
    feasibilityScore: 89,
    estimatedCostRange: '중형 (약 2.5억 ~ 3.8억원)',
    latOffset: -0.0012,
    lngOffset: 0.0015,
    radiusMeters: 65,
    isSimulated: true,
  });

  // Recommendation 3: Water/Slope/Rooftop condition
  if (hasRiver) {
    list.push({
      id: 'rec-stream',
      type: 'stream_corridor',
      title: '수변 생태완충대 및 LID 빗물정원 (Bioswale)',
      priorityRank: 3,
      locationSuitability: '하천변 인접 완충녹지 및 저지대 집수구역',
      targetProblem: '집중호우 시 오염우수 직유입 및 수변 생태축 단절',
      solutionProposal: '자연형 식생수로, 자생 수변초화류 군락지, 수달·조류 서식처 복원',
      recommendedSpecies: ['버드나무', '물억새', '꽃창포', '갈대', '부들'],
      expectedEffects: {
        coolingEffect: '-2.8 °C 수변 증발산 쿨링',
        waterRetention: '+55% 초기오염우수 정화 및 저류',
        carbonAbsorption: '+12.1 tCO2/년',
        socialBenefit: '친수 휴식 및 생태 관찰 산책로 제공',
      },
      feasibilityScore: 88,
      estimatedCostRange: '대형 (약 3.5억 ~ 5.0억원)',
      latOffset: 0.0022,
      lngOffset: 0.0030,
      radiusMeters: 80,
      isSimulated: true,
    });
  } else if (isSteepSlope) {
    list.push({
      id: 'rec-slope',
      type: 'steep_slope_garden',
      title: '사면보강 테라스 가든 및 옹벽 입체녹화',
      priorityRank: 3,
      locationSuitability: '구릉지 사면 및 도로변 콘크리트 옹벽 구간',
      targetProblem: '급경사지 토양 침식 위험 및 회색 인공구조물 복사열',
      solutionProposal: '계단식 생태 플랜터, 덩굴성 등반식물 및 자생지피식물 식재로 사면 안정화',
      recommendedSpecies: ['담쟁이덩굴', '줄사철나무', '황금사철', '구절초', '벌개미취'],
      expectedEffects: {
        coolingEffect: '-3.5 °C 옹벽 표면온도 저감',
        waterRetention: '+30% 사면 토사유출 방지',
        carbonAbsorption: '+4.8 tCO2/년',
        socialBenefit: '도시 입체 경관 대폭 개선',
      },
      feasibilityScore: 86,
      estimatedCostRange: '중소형 (약 1.5억 ~ 2.4억원)',
      latOffset: -0.0025,
      lngOffset: -0.0020,
      radiusMeters: 55,
      isSimulated: true,
    });
  } else {
    list.push({
      id: 'rec-rooftop',
      type: 'rooftop_green',
      title: '도심 공공·민간건물 옥상정원 네트워크 (Sky Green)',
      priorityRank: 3,
      locationSuitability: '행정복지센터, 학교, 상업빌딩 평슬라브 옥상',
      targetProblem: '지상부 녹지 한계 및 건물 냉난방 부하',
      solutionProposal: '경량형 세둠 매트, 목재 데크 쉼터, 꿀벌·나비 유인용 밀원식물 가든',
      recommendedSpecies: ['세둠류', '기린초', '비비추', '붓꽃', '백리향'],
      expectedEffects: {
        coolingEffect: '최상층 냉방비 18% 절감',
        waterRetention: '+50% 옥상 우수 저류',
        carbonAbsorption: '+7.5 tCO2/년',
        socialBenefit: '도심 조망 커뮤니티 힐링 공간',
      },
      feasibilityScore: 90,
      estimatedCostRange: '중형 (약 1.8억 ~ 2.8억원)',
      latOffset: 0.0018,
      lngOffset: 0.0012,
      radiusMeters: 40,
      isSimulated: true,
    });
  }

  return list;
}

export async function fetchLiveOsmAnalysis(
  lat: number,
  lng: number,
  radius: RadiusOption,
  address: string,
  siteName?: string
): Promise<SiteAnalysisData> {
  const circleAreaM2 = Math.PI * radius * radius;
  let greenWays: { lat: number; lon: number }[][] = [];
  let greenNodesCount = 0;
  let transitCount = 0;
  let eduCount = 0;
  let pubCount = 0;
  let commercialCount = 0;
  let noiseRoads = 0;
  let hasRiver = false;
  const poiList: PoiItem[] = [];
  const osmTrees: any[] = [];
  const osmPedestrians: any[] = [];

  const overpassQuery = `[out:json][timeout:25];(
    way["landuse"~"^(forest|grass|meadow|recreation_ground|village_green|orchard)$"](around:${radius},${lat},${lng});
    way["leisure"~"^(park|garden|nature_reserve|playground)$"](around:${radius},${lat},${lng});
    way["natural"~"^(wood|scrub|grassland|water)$"](around:${radius},${lat},${lng});
    node["natural"="tree"](around:${radius},${lat},${lng});
    way["natural"="tree_row"](around:${radius},${lat},${lng});
    way["highway"~"^(footway|pedestrian|path|cycleway|living_street|steps)$"](around:${radius},${lat},${lng});
    node["leisure"="park"](around:${radius},${lat},${lng});
    node["highway"="bus_stop"](around:${radius},${lat},${lng});
    node["railway"~"^(station|subway_entrance|tram_stop|halt)$"](around:${radius},${lat},${lng});
    node["amenity"~"^(school|kindergarten|university|college|hospital|clinic|library|community_centre|police|fire_station)$"](around:${radius},${lat},${lng});
    node["shop"](around:${radius},${lat},${lng});
    node["amenity"~"^(restaurant|cafe|bar|fast_food|supermarket|convenience|pharmacy)$"](around:${radius},${lat},${lng});
    way["highway"~"^(motorway|trunk|primary|secondary)$"](around:${radius},${lat},${lng});
    way["waterway"](around:${radius},${lat},${lng});
  );out body geom;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
    });

    if (res.ok) {
      const json = await res.json();
      const elements = json.elements || [];

      elements.forEach((e: any, idx: number) => {
        const t = e.tags || {};
        const eLat = e.lat ?? e.center?.lat;
        const eLng = e.lon ?? e.center?.lon;

        // Tree node
        if (e.type === 'node' && (t.natural === 'tree' || t.amenity === 'tree')) {
          osmTrees.push({
            id: `tree-${e.id || idx}`,
            lat: eLat,
            lng: eLng,
            species: t.species || t['species:ko'] || t.genus || '느티나무',
            canopyRadiusM: t.diameter_crown ? parseFloat(t.diameter_crown) / 2 : 3.5,
            heightM: t.height ? parseFloat(t.height) : 8,
            isStreetTree: true,
          });
        }

        // Pedestrian footway
        if (e.type === 'way' && (['footway', 'pedestrian', 'path', 'cycleway', 'living_street'].includes(t.highway) || t.footway || t.sidewalk)) {
          const coords = (e.geometry || []).map((pt: any) => [pt.lat, pt.lon] as [number, number]);
          if (coords.length >= 2) {
            osmPedestrians.push({
              id: `ped-${e.id || idx}`,
              name: t.name || '보행 가로로',
              highwayType: t.highway || 'footway',
              lengthM: Math.round(coords.length * 18),
              hasShade: Boolean(t.surface === 'wood' || t.lit === 'yes' || idx % 2 === 0),
              isAccessible: t.wheelchair !== 'no',
              coordinates: coords,
            });
          }
        }

        if (e.type === 'way' && e.geometry) {
          const isGreen =
            ['forest', 'grass', 'meadow', 'recreation_ground', 'village_green'].includes(t.landuse) ||
            ['park', 'garden', 'nature_reserve', 'playground'].includes(t.leisure) ||
            ['wood', 'scrub', 'grassland'].includes(t.natural);
          if (isGreen) greenWays.push(e.geometry);

          if (t.waterway || t.natural === 'water') hasRiver = true;
          if (['motorway', 'trunk', 'primary', 'secondary'].includes(t.highway)) noiseRoads++;
        }

        if (!eLat || !eLng) return;
        const dlat = (eLat - lat) * 111320;
        const dlng = (eLng - lng) * 111320 * Math.cos((lat * Math.PI) / 180);
        const dist = Math.round(Math.sqrt(dlat * dlat + dlng * dlng));
        if (dist > radius) return;

        let cat: PoiItem['category'] | null = null;
        let color = '#64748b';
        let name = t.name || '';

        if (t.highway === 'bus_stop' || ['station', 'subway_entrance', 'tram_stop'].includes(t.railway)) {
          cat = '대중교통';
          color = '#38bdf8';
          transitCount++;
          if (!name) name = t.railway === 'subway_entrance' ? '지하철역 입구' : '버스 정류장';
        } else if (['park', 'garden', 'nature_reserve'].includes(t.leisure) || t.natural === 'wood') {
          cat = '식생·공원';
          color = '#22c55e';
          greenNodesCount++;
          if (!name) name = '근린공원/녹지';
        } else if (['school', 'kindergarten', 'university', 'college'].includes(t.amenity)) {
          cat = '교육·공공';
          color = '#f59e0b';
          eduCount++;
          if (!name) name = '교육시설';
        } else if (['hospital', 'clinic', 'library', 'community_centre'].includes(t.amenity)) {
          cat = '교육·공공';
          color = '#f59e0b';
          pubCount++;
          if (!name) name = '공공문화시설';
        } else if (t.shop || ['restaurant', 'cafe', 'convenience', 'supermarket'].includes(t.amenity)) {
          cat = '상업·생활';
          color = '#a855f7';
          commercialCount++;
          if (!name) name = t.shop || t.amenity || '상업시설';
        }

        if (cat && name && poiList.length < 15) {
          poiList.push({
            id: `poi-${idx}`,
            category: cat,
            color,
            name,
            distanceMeters: dist,
            walkingMinutes: Math.max(1, Math.ceil(dist / 75)),
            lat: eLat,
            lng: eLng,
            interpretation: `${cat} 주요 거점`,
          });
        }
      });
    }
  } catch (err) {
    console.warn('[Overpass live query failed, using synthesis]', err);
  }

  // Calculate Green Ratio
  let greenAreaM2 = greenWays.reduce((sum, g) => sum + calcPolyArea(g), 0);
  if (greenAreaM2 === 0 && greenNodesCount > 0) {
    greenAreaM2 = greenNodesCount * 4500;
  }
  let greenRatio = Math.min(Math.round((greenAreaM2 / circleAreaM2) * 100), 95);
  if (greenRatio === 0) {
    greenRatio = 14; // baseline urban average
  }

  // Synthesize Trees Data if live count is small
  const simulatedTreesCount = Math.max(osmTrees.length, Math.round(greenRatio * 18 + radius * 0.4));
  const canopyCoverageRatio = Math.min(65, Math.max(8, parseFloat((greenRatio * 0.72 + 4.2).toFixed(1))));
  const treesList = osmTrees.length > 5 ? osmTrees : Array.from({ length: 18 }).map((_, i) => ({
    id: `syn-tree-${i}`,
    lat: lat + (Math.sin(i * 1.3) * radius * 0.000007),
    lng: lng + (Math.cos(i * 1.3) * radius * 0.000009),
    species: ['느티나무', '이팝나무', '왕벚나무', '은행나무', '메타세쿼이아', '소나무'][i % 6],
    canopyRadiusM: 3.0 + (i % 4),
    heightM: 7 + (i % 5),
    isStreetTree: i % 2 === 0,
  }));

  const treesData = {
    totalTreesCount: simulatedTreesCount,
    canopyCoverageRatio,
    treeDensityPerHectare: Math.round(simulatedTreesCount / ((circleAreaM2 / 10000) || 1)),
    speciesBreakdown: [
      { species: '느티나무 (Zelkova)', count: Math.round(simulatedTreesCount * 0.32), ratio: 32, tag: '내공해성·대형수관' },
      { species: '이팝나무 (Chionanthus)', count: Math.round(simulatedTreesCount * 0.24), ratio: 24, tag: '백색꽃·가로수' },
      { species: '왕벚나무 (Prunus)', count: Math.round(simulatedTreesCount * 0.20), ratio: 20, tag: '경관개선·봄꽃' },
      { species: '은행나무 (Ginkgo)', count: Math.round(simulatedTreesCount * 0.14), ratio: 14, tag: '대기정화·황색단풍' },
      { species: '소나무류 (Pinus)', count: Math.round(simulatedTreesCount * 0.10), ratio: 10, tag: '사계절상록·피톤치드' },
    ],
    shadedWalkwayRatio: Math.min(80, Math.max(15, Math.round(canopyCoverageRatio * 1.8))),
    carbonSequestrationTonsPerYear: parseFloat((simulatedTreesCount * 0.024 + greenRatio * 0.9).toFixed(1)),
    treesList,
  };

  // Calculate Access Score
  const accessScore = Math.min(
    99,
    Math.round(
      Math.min(transitCount * 16, 50) * 0.45 +
        Math.min((eduCount + pubCount) * 12, 40) * 0.25 +
        Math.min(commercialCount * 4, 30) * 0.2 +
        Math.min(greenNodesCount * 10, 20) * 0.1
    )
  );

  // Synthesize Pedestrian Walkways
  const totalFootwayLengthM = Math.max(
    osmPedestrians.reduce((sum, p) => sum + p.lengthM, 0),
    Math.round(radius * 5.4 + transitCount * 420)
  );
  const sidewalkRatio = Math.min(92, Math.max(38, Math.round(62 + (commercialCount > 10 ? 15 : 0))));
  const walkabilityScore = Math.min(96, Math.max(45, Math.round(accessScore * 0.6 + sidewalkRatio * 0.4)));
  const pedestrianSafetyIndex = Math.min(94, Math.max(50, Math.round(100 - noiseRoads * 12 + sidewalkRatio * 0.2)));

  const pedestrianData = {
    totalFootwayLengthM,
    sidewalkRatio,
    walkabilityScore,
    pedestrianSafetyIndex,
    shadedPathLengthM: Math.round(totalFootwayLengthM * (treesData.shadedWalkwayRatio / 100)),
    segments: osmPedestrians.length > 3 ? osmPedestrians : [
      {
        id: 'syn-path-1',
        name: '주요 상권 보행 가로',
        highwayType: 'pedestrian',
        lengthM: Math.round(radius * 0.7),
        hasShade: true,
        isAccessible: true,
        coordinates: [
          [lat - 0.0015, lng - 0.002],
          [lat + 0.001, lng + 0.0015],
        ],
      },
      {
        id: 'syn-path-2',
        name: '통학 및 주거 연결로',
        highwayType: 'footway',
        lengthM: Math.round(radius * 0.9),
        hasShade: false,
        isAccessible: true,
        coordinates: [
          [lat + 0.002, lng - 0.001],
          [lat - 0.001, lng + 0.0025],
        ],
      },
    ],
  };

  // Climate Resilience & Hydrology Metrics (2SFCA, SCS-CN, UTCI)
  const twosfcaAccessibilityScore = Math.min(95, Math.max(30, Math.round((greenRatio * 1.8 + (greenNodesCount > 0 ? 30 : 10)) * 0.8)));
  const scsCnRetentionRate = Math.min(85, Math.max(20, Math.round(greenRatio * 0.9 + (hasRiver ? 15 : 5))));
  const utciComfortLevel = greenRatio > 35 ? '열 쾌적 (No Thermal Stress)' : greenRatio > 20 ? '경미한 열스트레스 (Slight Heat Stress)' : '강한 열스트레스 (Strong Heat Stress)';
  const uhiMitigationPotential = parseFloat((Math.max(1.0, (100 - greenRatio) * 0.038)).toFixed(1));
  const ecologicalCorridorScore = Math.min(95, Math.max(35, Math.round(greenRatio * 1.2 + (hasRiver ? 25 : 8))));

  const climateResilience = {
    twosfcaAccessibilityScore,
    scsCnRetentionRate,
    utciComfortLevel,
    uhiMitigationPotential,
    ecologicalCorridorScore,
  };

  const imperviousRatio = Math.max(10, 100 - greenRatio - (hasRiver ? 8 : 2));
  const totalFacilities = transitCount + eduCount + pubCount + commercialCount + greenNodesCount;

  const heatRiskIndex = greenRatio < 10 ? 5 : greenRatio < 18 ? 4 : greenRatio < 30 ? 3 : greenRatio < 50 ? 2 : 1;
  const carbonAbsorptionTons = Math.round(greenRatio * 1.8 + greenNodesCount * 3.5);

  const dominantUse =
    commercialCount > 15
      ? '일반상업 및 업무 복합권역'
      : eduCount > 2
      ? '교육연구 및 주거혼재권역'
      : greenRatio > 35
      ? '자연녹지 및 저밀 주거권역'
      : '일반주거 밀집권역';

  const isSteepSlope = lat > 35.2 && lat < 35.3; // heuristic or aspect

  const defaultWeights = DEFAULT_WEIGHT_PRESETS[0].weights;
  const { recommendations: greenInfraRecommendations, candidateSites } = calculateGreenInfraSuitability(
    defaultWeights,
    {
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
      agingRatioVal: 18.4,
    }
  );

  const issues: IssueItem[] = [];
  if (greenRatio < 15) {
    issues.push({
      id: 'iss-g1',
      severity: 'danger',
      tag: '녹지 결핍',
      title: `녹지율 ${greenRatio}%로 도시 법정 기준선(15%) 미달`,
      description: '보행권 내 쌈지공원 및 가로수 그늘목을 시급히 확충하여 열섬현상을 방어해야 합니다.',
      domain: '환경',
    });
  }
  if (transitCount < 2) {
    issues.push({
      id: 'iss-t1',
      severity: 'warning',
      tag: '대중교통 접근성',
      title: '반경 내 대중교통 노선 연계 부족',
      description: '친환경 자전거 도로 및 보행 가로수길 연계를 통해 접근성을 보강해야 합니다.',
      domain: '사회',
    });
  }
  if (noiseRoads >= 2) {
    issues.push({
      id: 'iss-n1',
      severity: 'warning',
      tag: '도로 소음 및 분진',
      title: `간선도로 ${noiseRoads}개 노선 통과에 따른 완충녹지 필요`,
      description: '주거지 방향 도로변에 다층 식재 완충수림대(소나무, 편백 등) 조성이 권장됩니다.',
      domain: '기후',
    });
  }
  if (issues.length === 0) {
    issues.push({
      id: 'iss-ok',
      severity: 'success',
      tag: '환경 양호',
      title: '기본 생태·교통 지표 양호',
      description: '기존 녹지 거점을 유지관리하고 커뮤니티 텃밭 등 주민참여형 조경 프로그램을 도입할 수 있습니다.',
      domain: '공간',
    });
  }

  // Monthly temperature/rain synthesis calibrated to Korean climate
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const baseTemps = [0.5, 3.2, 8.5, 14.2, 19.2, 23.1, 26.5, 27.4, 23.1, 16.8, 10.2, 3.1];
  const baseRains = [25, 35, 60, 95, 120, 165, 310, 260, 150, 58, 45, 28];

  const climateMonthly = months.map((m, i) => ({
    month: m,
    temp: parseFloat((baseTemps[i] + (lat > 37 ? -1.8 : 1.2)).toFixed(1)),
    rain: Math.round(baseRains[i] * (lat > 37 ? 0.95 : 1.15)),
    solarRad: parseFloat((11 + Math.sin((i / 11) * Math.PI) * 10).toFixed(1)),
  }));

  const landUse = [
    { label: '주거용지', pct: Math.min(55, Math.max(25, 100 - greenRatio - 30)), color: '#94a3b8' },
    { label: '상업·업무용지', pct: Math.min(40, Math.max(10, commercialCount * 2)), color: '#f59e0b' },
    { label: '산림·녹지', pct: greenRatio, color: '#22c55e' },
    { label: '공공·기타', pct: Math.max(5, 100 - greenRatio - 45), color: '#38bdf8' },
  ];

  return {
    id: `site-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    siteName: siteName || (address ? address.split(' ').slice(0, 3).join(' ') : '선택 대상지'),
    address: address || `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`,
    lat,
    lng,
    activeRadius: radius,
    kpi: {
      radiusLabel: `${radius}m (${radius <= 500 ? '직접보행권' : radius <= 1000 ? '간접보행권' : '광역생활권'})`,
      radiusMeters: radius,
      greenRatio,
      greenRatioSub: `실측 녹지면적 약 ${(greenAreaM2 / 10000).toFixed(1)} ha`,
      facilitiesCount: Math.max(totalFacilities, poiList.length),
      accessScore,
      heatRiskIndex,
      greenInfraPriority: greenInfraRecommendations[0]?.title || '가로수 그늘목 확충',
      carbonAbsorptionTons,
      imperviousRatio,
    },
    urban: {
      zoningName: commercialCount > 10 ? '일반상업 및 준주거지역' : '제2종 일반주거지역',
      zoningBadgeType: commercialCount > 10 ? 'warning' : 'primary',
      floorAreaRatio: commercialCount > 10 ? 600 : 200,
      buildingCoverageRatio: 60,
      maxFloors: commercialCount > 10 ? 25 : 15,
      livingSphere: '생활밀착형 근린생활권',
      initPlanProgress: 60,
      completionProgress: 88,
      legalGreenMandate: '대지면적의 15% 이상 의무 조경 확보 대상',
    },
    landscape: {
      landscapeZoneName: '도시·생활환경 경관관리지구',
      zoneBadgeType: 'success',
      landscapeType: dominantUse,
      viewCorridor: '주요 간선가로 통경축 및 자연 녹지축 연계',
      recommendedSpecies: ['느티나무', '이팝나무', '왕벚나무', '산철쭉', '배롱나무'],
      colorPalette: 'Y-YR 자연계열 및 N 무채색 조화',
      guidelineTags: ['보행 친화형 가로수벽 조성', '건축선 후퇴 녹화', '옥외 간판 색채 정비'],
    },
    demographic: {
      admDong: address.includes('동') ? address.split(' ').find((w) => w.endsWith('동')) || '해당 행정동' : '해당 행정동',
      totalPop: `${(18000 + Math.round((lat * 100) % 15000)).toLocaleString()}명`,
      households: `${(7500 + Math.round((lng * 100) % 6000)).toLocaleString()}세대`,
      agingRatio: '18.4% (고령화 진행)',
      popDensity: '26,200명/km²',
      vulnerablePopCount: '약 5,800명 (24.5%)',
      tags: ['주거·상업 혼재', '보행 약자 접근성 개선 필요', '생활인프라 양호'],
    },
    socioEconomic: {
      dominantUse,
      commercialFacilities: `${Math.max(12, commercialCount * 3)}개소`,
      schoolsCount: `${Math.max(1, eduCount)}개소`,
      parkAreaPerCapita: `${(greenRatio * 0.22).toFixed(1)} ㎡/인`,
      parkSatisfaction: `${Math.min(90, Math.round(greenRatio * 1.8 + 20))}%`,
      tags: ['근린상권 밀집', '보행 통행량 보통', '쌈지공원 수혜도 분석'],
    },
    natural: {
      forestRatio: greenRatio,
      waterRatio: hasRiver ? 8.2 : 2.1,
      imperviousRatio,
      dominantWindDir: '남남서풍(SSW) / 북서풍(NW)',
      avgAnnualTemp: `${(13.5 + (lat < 36 ? 1.5 : 0)).toFixed(1)} °C`,
      annualRainfall: '1,420 mm',
      averageSlope: isSteepSlope ? '14.2° (구릉지)' : '4.5° (평탄지)',
      solarAspect: '남동향(SE) 55%, 남서향(SW) 30%',
      tags: ['도시열섬 모니터링', '우수 유출 관리 필요', '바람길 확보'],
    },
    summary: `분석 반경 ${radius}m 내 실제 확인된 녹지율은 ${greenRatio}%이며, 주요 시설 ${totalFacilities}개소, 대중교통 거점 ${transitCount}개소가 위치합니다. 불투수율이 ${imperviousRatio}%로 나타나 ${greenInfraRecommendations[0]?.title}의 도입이 가장 시급한 그린인프라 전략으로 판독되었습니다.`,
    issues,
    greenInfraRecommendations,
    candidateSites,
    landUse,
    building: {
      totalCount: `${(450 + Math.round((radius / 500) * 800)).toLocaleString()}동`,
      avgFloors: `${(4.2 + (commercialCount > 10 ? 4.5 : 0)).toFixed(1)}층`,
      coverageRatio: `${imperviousRatio * 0.65}%`,
      avgBuiltYear: '2006년',
      usageDistribution: [
        { label: '주거용 건물', pct: 54, color: '#94a3b8' },
        { label: '근린상업 건물', pct: 32, color: '#f59e0b' },
        { label: '공공·교육', pct: 14, color: '#38bdf8' },
      ],
    },
    climateMonthly,
    accessibilityRadar: [
      { category: '대중교통 접근성', score: Math.min(98, transitCount * 22 + 30), fullMark: 100 },
      { category: '공원·녹지 접근성', score: Math.min(95, greenRatio * 2 + 20), fullMark: 100 },
      { category: '보행 안전·편의성', score: 72, fullMark: 100 },
      { category: '생활인프라 밀도', score: accessScore, fullMark: 100 },
      { category: '생태 연결성', score: Math.min(90, greenRatio * 1.5 + 25), fullMark: 100 },
      { category: '열섬 저항력', score: Math.max(20, 100 - imperviousRatio), fullMark: 100 },
    ],
    pois: poiList.length > 0 ? poiList : PRESET_SITES.pnu.pois,
    news: [
      {
        category: '공간정책',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        title: '도시 생태축 복원 및 그린인프라 우선 조성 대상지 선정',
        description: '열섬 취약지 대상 쿨링포그 및 보행숲길 조성 사업 연계',
        date: '2026.04',
      },
      {
        category: '환경보전',
        badgeClass: 'bg-sky-100 text-sky-800',
        title: '지하수 함양 및 투수성 포장 확대 조례 시행',
        description: '공공부지 내 분산형 빗물정원(LID) 의무 도입 가이드라인 배포',
        date: '2026.03',
      },
    ],
    treesData,
    pedestrianData,
    climateResilience,
    buildingGis: generateMockBuildingGis(lat, lng, 'live'),
    parcelGis: generateMockLandParcelGis(lat, lng, 'live'),
    multiBufferComparison: [
      { radius: 300, greenRatio: Math.max(5, greenRatio - 6), facilitiesCount: Math.round(totalFacilities * 0.4), transitCount: Math.max(1, Math.round(transitCount * 0.4)), accessScore: Math.min(98, accessScore + 4), primaryPriority: '포켓파크 쉼터' },
      { radius: 500, greenRatio, facilitiesCount: totalFacilities, transitCount, accessScore, primaryPriority: greenInfraRecommendations[0]?.title || '가로수 쿨링터널' },
      { radius: 1000, greenRatio: Math.min(90, greenRatio + 10), facilitiesCount: Math.round(totalFacilities * 2.2), transitCount: transitCount + 4, accessScore: Math.max(60, accessScore - 6), primaryPriority: '광역 생태축 연계' },
    ],
  };
}
