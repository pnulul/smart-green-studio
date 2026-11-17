import {
  OptimalCandidateSite,
  GeoJsonLayerItem,
  GeoJsonLayerKey,
  CustomGeoJsonItem,
  SiteAnalysisData,
} from '../types';

/**
 * GeoJSON FeatureCollection generator for Land Use
 */
export function generateLandUseGeoJson(lat: number, lng: number, radius: number): any {
  const d = (radius / 111000) * 0.9;
  return {
    type: 'FeatureCollection',
    name: 'LandUseZonation',
    features: [
      {
        type: 'Feature',
        properties: {
          zoneName: '일반상업지역 (Commercial Zone)',
          category: '상업',
          code: 'COM-01',
          coverageRatio: '60%',
          floorAreaRatio: '600%',
          legalGreenPct: '10% 이상',
          color: '#f59e0b',
          description: '고밀도 상업 및 업무 시설 밀집 구역으로 불투수율이 85% 이상에 달함.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng - d * 0.4, lat - d * 0.3],
              [lng + d * 0.5, lat - d * 0.35],
              [lng + d * 0.45, lat + d * 0.4],
              [lng - d * 0.35, lat + d * 0.35],
              [lng - d * 0.4, lat - d * 0.3],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          zoneName: '제2종 일반주거지역 (Residential Zone)',
          category: '주거',
          code: 'RES-02',
          coverageRatio: '60%',
          floorAreaRatio: '200%',
          legalGreenPct: '15% 이상',
          color: '#94a3b8',
          description: '중밀도 아파트 및 단독·다세대 주거지역으로 보행로 녹화 수요 높음.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng - d * 0.95, lat - d * 0.9],
              [lng - d * 0.4, lat - d * 0.3],
              [lng - d * 0.35, lat + d * 0.35],
              [lng - d * 0.85, lat + d * 0.8],
              [lng - d * 0.95, lat - d * 0.9],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          zoneName: '자연녹지 및 공원용지 (Green Park Zone)',
          category: '녹지',
          code: 'GRN-01',
          coverageRatio: '20%',
          floorAreaRatio: '80%',
          legalGreenPct: '70% 이상',
          color: '#22c55e',
          description: '근린공원 및 완충녹지로 도시 생태축 연결의 핵심 거점.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng + d * 0.45, lat + d * 0.4],
              [lng + d * 0.9, lat + d * 0.3],
              [lng + d * 0.85, lat + d * 0.9],
              [lng + d * 0.35, lat + d * 0.85],
              [lng + d * 0.45, lat + d * 0.4],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          zoneName: '공공시설 및 교육연구용지 (Public/Edu Zone)',
          category: '공공',
          code: 'PUB-01',
          coverageRatio: '50%',
          floorAreaRatio: '250%',
          legalGreenPct: '20% 이상',
          color: '#38bdf8',
          description: '학교, 도서관, 주민센터 등이 위치하여 옥상녹화 및 쌈지공원 조성 최적지.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng + d * 0.5, lat - d * 0.35],
              [lng + d * 0.95, lat - d * 0.4],
              [lng + d * 0.9, lat + d * 0.3],
              [lng + d * 0.45, lat + d * 0.4],
              [lng + d * 0.5, lat - d * 0.35],
            ],
          ],
        },
      },
    ],
  };
}

/**
 * GeoJSON FeatureCollection generator for Demographic Density Grids
 */
export function generateDemographicGridGeoJson(lat: number, lng: number, radius: number): any {
  const step = (radius / 111000) * 0.35;
  const features: any[] = [];
  let id = 1;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const cLat = lat + dy * step;
      const cLng = lng + dx * step;
      const distRatio = Math.sqrt(dx * dx + dy * dy) / 2.8;
      const popDensity = Math.max(8000, Math.round((35000 - distRatio * 18000) + ((dx * 13 + dy * 7) % 5000)));
      const agingPct = Math.min(32, Math.max(12, Math.round(16 + distRatio * 10 + (dx % 4))));
      const vulnerableCount = Math.round(popDensity * (agingPct / 100) * 0.08);

      let gridColor = '#fde047'; // low
      let level = '보통';
      if (popDensity > 28000) {
        gridColor = '#dc2626'; // very high
        level = '초고밀';
      } else if (popDensity > 20000) {
        gridColor = '#ea580c'; // high
        level = '고밀';
      } else if (popDensity > 14000) {
        gridColor = '#eab308'; // moderate
        level = '중밀';
      }

      const half = step * 0.45;
      features.push({
        type: 'Feature',
        properties: {
          gridId: `GRID-POP-${id++}`,
          densityLevel: level,
          popDensity: `${popDensity.toLocaleString()} 명/km²`,
          agingRatio: `${agingPct}%`,
          vulnerableCount: `${vulnerableCount.toLocaleString()} 명`,
          recommendation: popDensity > 22000 ? '보행 쉼터 및 그늘목 확충 우선' : '기존 시설 관리',
          color: gridColor,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [cLng - half, cLat - half],
              [cLng + half, cLat - half],
              [cLng + half, cLat + half],
              [cLng - half, cLat + half],
              [cLng - half, cLat - half],
            ],
          ],
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    name: 'DemographicDensityGrid',
    features,
  };
}

/**
 * GeoJSON FeatureCollection generator for Transit & Walkability Networks
 */
export function generateTransitNetworkGeoJson(lat: number, lng: number, radius: number): any {
  const d = radius / 111000;
  return {
    type: 'FeatureCollection',
    name: 'TransitAndWalkabilityNetwork',
    features: [
      // Major Pedestrian Spine Road
      {
        type: 'Feature',
        properties: {
          name: '중앙 보행 메인 스트리트',
          type: '주요 보행축 (Pedestrian Spine)',
          roadWidth: '18m',
          walkTraffic: '일 18,500명',
          greenStatus: '가로수 결핍 구간 (식재율 22%)',
          color: '#38bdf8',
          weight: 4,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.8, lat - d * 0.6],
            [lng - d * 0.2, lat - d * 0.1],
            [lng + d * 0.3, lat + d * 0.3],
            [lng + d * 0.8, lat + d * 0.7],
          ],
        },
      },
      // Secondary Transit Corridor
      {
        type: 'Feature',
        properties: {
          name: '역세권 통학·통근 연결로',
          type: '보조 보행통로 (Transit Corridor)',
          roadWidth: '12m',
          walkTraffic: '일 9,200명',
          greenStatus: '다층 쿨링 가로수길 제안 구간',
          color: '#818cf8',
          weight: 3,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.6, lat + d * 0.7],
            [lng - d * 0.2, lat - d * 0.1],
            [lng + d * 0.6, lat - d * 0.7],
          ],
        },
      },
    ],
  };
}

/**
 * GeoJSON FeatureCollection generator for Urban Heat Island (UHI) Thermal Grid
 */
export function generateHeatIslandGridGeoJson(lat: number, lng: number, radius: number): any {
  const step = (radius / 111000) * 0.4;
  const features: any[] = [];
  let id = 1;

  for (let dy = -1.5; dy <= 1.5; dy += 1) {
    for (let dx = -1.5; dx <= 1.5; dx += 1) {
      const cLat = lat + dy * step;
      const cLng = lng + dx * step;
      const temp = parseFloat((35.5 + ((dx * 7 + dy * 11) % 5.5)).toFixed(1));
      let risk = '보통';
      let color = '#f97316';

      if (temp >= 39.0) {
        risk = '심각 (Extreme UHI)';
        color = '#b91c1c';
      } else if (temp >= 37.5) {
        risk = '경계 (High Risk)';
        color = '#ef4444';
      } else if (temp >= 36.0) {
        risk = '주의 (Moderate)';
        color = '#f97316';
      } else {
        risk = '안전 (Cool Pocket)';
        color = '#22c55e';
      }

      const half = step * 0.48;
      features.push({
        type: 'Feature',
        properties: {
          heatId: `UHI-${id++}`,
          surfaceTemp: `${temp} °C`,
          riskLevel: risk,
          color,
          coolingRecommendation: temp >= 37.5 ? '쿨링포그 + 대교목 캐노피 + 옥상녹화 집중' : '식생 유지',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [cLng - half, cLat - half],
              [cLng + half, cLat - half],
              [cLng + half, cLat + half],
              [cLng - half, cLat + half],
              [cLng - half, cLat - half],
            ],
          ],
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    name: 'UrbanHeatIslandGrid',
    features,
  };
}

/**
 * GeoJSON FeatureCollection generator for LID Stormwater Suitability
 */
export function generateLidSuitabilityGeoJson(lat: number, lng: number, radius: number): any {
  const d = radius / 111000;
  return {
    type: 'FeatureCollection',
    name: 'LidStormwaterSuitability',
    features: [
      {
        type: 'Feature',
        properties: {
          zoneName: '저지대 우수 집중 집수구역',
          type: 'LID 빗물정원 최적지 (Bioswale Node)',
          imperviousPct: '88%',
          expectedRunoffM3: '연간 약 4,800 m³',
          lidTech: '식생 체류지 + 쇄석 침투 트렌치',
          color: '#06b6d4',
          description: '노면 강우 유출수가 집중 유입되는 저지대로 초기오염물질 정화 및 침투 시설 설치 필수.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng + d * 0.1, lat + d * 0.15],
              [lng + d * 0.35, lat + d * 0.2],
              [lng + d * 0.3, lat + d * 0.38],
              [lng + d * 0.08, lat + d * 0.32],
              [lng + d * 0.1, lat + d * 0.15],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          zoneName: '도로변 침투형 식생수로 구간',
          type: '식생수로 (Vegetated Swale)',
          imperviousPct: '92%',
          expectedRunoffM3: '연간 약 2,200 m³',
          lidTech: '식생수로 + 투수성 보차도 블록',
          color: '#0284c7',
          description: '도로변 가로수 하부 띠녹지를 식생수로로 전환하여 빗물 흡수율 증대.',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.3, lat + d * 0.1],
            [lng - d * 0.1, lat + d * 0.4],
            [lng + d * 0.2, lat + d * 0.6],
          ],
        },
      },
    ],
  };
}

/**
 * GeoJSON FeatureCollection generator for Algorithm Candidate Sites
 */
export function generateCandidateSitesGeoJson(candidates: OptimalCandidateSite[]): any {
  const features: any[] = [];

  candidates.forEach((c) => {
    let geom: any;
    if (c.geometryType === 'Polygon' && c.coordinates) {
      geom = {
        type: 'Polygon',
        coordinates: [c.coordinates.map((pt: [number, number]) => [pt[1], pt[0]])],
      };
    } else if (c.geometryType === 'LineString' && c.coordinates) {
      geom = {
        type: 'LineString',
        coordinates: c.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]),
      };
    } else {
      geom = {
        type: 'Point',
        coordinates: [c.lng, c.lat],
      };
    }

    features.push({
      type: 'Feature',
      properties: {
        id: c.id,
        rank: c.rank,
        name: c.name,
        type: c.type,
        typeLabel: c.typeLabel,
        score: c.overallScore,
        approxAddress: c.approxAddress,
        targetAreaM2: c.targetAreaM2,
        currentLandUse: c.currentLandUse,
        suitabilityRationale: c.suitabilityRationale,
        coolingDelta: c.expectedEffects.coolingDelta,
        waterRetention: c.expectedEffects.stormwaterRetention,
        carbonAbsorption: c.expectedEffects.carbonAbsorption,
        beneficiaryPop: c.expectedEffects.beneficiaryPop,
        flora: c.recommendedFlora.join(', '),
        budget: c.estimatedBudgetKrw,
        color: '#059669',
      },
      geometry: geom,
    });
  });

  return {
    type: 'FeatureCollection',
    name: 'OptimalGreenInfraCandidates',
    features,
  };
}

/**
 * Validate and parse uploaded GeoJSON
 */
export function parseAndValidateGeoJson(rawText: string, fileName: string): CustomGeoJsonItem {
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error('유효한 JSON 파일 형식이 아닙니다. 문법을 확인해주세요.');
  }

  if (parsed.type !== 'FeatureCollection' && parsed.type !== 'Feature' && !parsed.coordinates) {
    throw new Error('표준 GeoJSON (FeatureCollection 또는 Feature) 구조가 아닙니다.');
  }

  // Normalize single Feature to FeatureCollection
  if (parsed.type === 'Feature') {
    parsed = {
      type: 'FeatureCollection',
      features: [parsed],
    };
  } else if (!parsed.features && parsed.coordinates) {
    parsed = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: fileName.replace(/\.[^/.]+$/, '') },
          geometry: parsed,
        },
      ],
    };
  }

  const featureCount = parsed.features ? parsed.features.length : 0;
  if (featureCount === 0) {
    throw new Error('GeoJSON 내에 피처(Feature)가 존재하지 않습니다.');
  }

  const colors = ['#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#10b981'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return {
    id: `custom-geo-${Date.now()}`,
    name: fileName.replace(/\.[^/.]+$/, ''),
    fileName,
    featureCount,
    visible: true,
    opacity: 0.75,
    color: randomColor,
    data: parsed,
    uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * GeoJSON FeatureCollection generator for OSM Trees and Tree Canopy
 */
export function generateTreesCanopyGeoJson(lat: number, lng: number, radius: number, treesList?: any[]): any {
  const d = (radius / 111000) * 0.85;
  const list = treesList && treesList.length > 0 ? treesList : [
    { lat: lat + d * 0.25, lng: lng + d * 0.2, species: '느티나무 (Zelkova)', canopyRadiusM: 4.5, heightM: 9 },
    { lat: lat - d * 0.3, lng: lng - d * 0.25, species: '이팝나무 (Chionanthus)', canopyRadiusM: 3.8, heightM: 8 },
    { lat: lat + d * 0.4, lng: lng - d * 0.35, species: '왕벚나무 (Prunus)', canopyRadiusM: 4.2, heightM: 7 },
    { lat: lat - d * 0.15, lng: lng + d * 0.45, species: '은행나무 (Ginkgo)', canopyRadiusM: 3.5, heightM: 10 },
    { lat: lat + d * 0.1, lng: lng - d * 0.15, species: '메타세쿼이아 (Metasequoia)', canopyRadiusM: 5.0, heightM: 14 },
    { lat: lat - d * 0.45, lng: lng + d * 0.15, species: '소나무 (Pinus)', canopyRadiusM: 3.2, heightM: 8 },
    { lat: lat + d * 0.55, lng: lng + d * 0.3, species: '단풍나무 (Acer)', canopyRadiusM: 3.0, heightM: 6 },
    { lat: lat - d * 0.2, lng: lng - d * 0.45, species: '느티나무 (Zelkova)', canopyRadiusM: 4.8, heightM: 10 },
  ];

  return {
    type: 'FeatureCollection',
    name: 'OsmTreesCanopy',
    features: list.map((t: any, idx: number) => ({
      type: 'Feature',
      properties: {
        id: `osm-tree-${idx}`,
        species: t.species || '느티나무 (Zelkova)',
        height: `${t.heightM || 8}m`,
        canopyRadius: `${t.canopyRadiusM || 4}m`,
        carbonAbsorption: '연간 약 24.5 kg CO2',
        coolingZone: `수관 폭 ${(t.canopyRadiusM || 4) * 2}m 그늘막 형성`,
        color: '#15803d',
      },
      geometry: {
        type: 'Point',
        coordinates: [t.lng, t.lat],
      },
    })),
  };
}

/**
 * GeoJSON FeatureCollection generator for OSM Pedestrian Walkways & Shaded Routes
 */
export function generatePedestrianWalkwaysGeoJson(lat: number, lng: number, radius: number): any {
  const d = (radius / 111000) * 0.85;
  return {
    type: 'FeatureCollection',
    name: 'PedestrianWalkways',
    features: [
      {
        type: 'Feature',
        properties: {
          name: '중심 상권 쿨링 보행 가로수길 (Shaded Boulevard)',
          type: '그늘 보행로 (Shaded)',
          width: '6.0m 보차분리 인도',
          shadeRatio: '78% 수목 그늘막',
          walkability: '매우 우수 (92점)',
          color: '#10b981',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.6, lat - d * 0.4],
            [lng - d * 0.2, lat - d * 0.1],
            [lng + d * 0.3, lat + d * 0.25],
            [lng + d * 0.7, lat + d * 0.55],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: '통학 및 주거지 연계 보행로 (School Route)',
          type: '생활 보행로 (Neighborhood Footway)',
          width: '3.5m 보행전용로',
          shadeRatio: '45% 부분 그늘',
          walkability: '보통 (74점 - 가로수 확충 권장)',
          color: '#f59e0b',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.5, lat + d * 0.6],
            [lng - d * 0.1, lat + d * 0.2],
            [lng + d * 0.2, lat - d * 0.2],
            [lng + d * 0.5, lat - d * 0.6],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: '수변 및 공원 접근 친수 산책로 (Waterfront Promenade)',
          type: '친수 생태 보행로 (Eco-Walkway)',
          width: '4.0m 황토/마사토 투수 포장',
          shadeRatio: '85% 자연림 녹음',
          walkability: '최우수 (96점)',
          color: '#06b6d4',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng + d * 0.4, lat + d * 0.8],
            [lng + d * 0.6, lat + d * 0.4],
            [lng + d * 0.75, lat - d * 0.1],
            [lng + d * 0.85, lat - d * 0.5],
          ],
        },
      },
    ],
  };
}

/**
 * GeoJSON FeatureCollection generator for Ecological Corridors
 */
export function generateEcologicalCorridorsGeoJson(lat: number, lng: number, radius: number): any {
  const d = (radius / 111000) * 0.9;
  return {
    type: 'FeatureCollection',
    name: 'EcologicalCorridors',
    features: [
      {
        type: 'Feature',
        properties: {
          name: '주 생태축 및 야간 찬공기 유입로 (Main Cool Wind Corridor)',
          type: '광역 생태축 (Regional Corridor)',
          function: '산림 냉기류 공급 및 조류/소생물 이동 통로',
          connectivityScore: '88점',
          color: '#059669',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.8, lat + d * 0.85],
            [lng - d * 0.35, lat + d * 0.4],
            [lng, lat],
            [lng + d * 0.4, lat - d * 0.4],
            [lng + d * 0.85, lat - d * 0.8],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          name: '수변 거점 생태 징검다리 축 (Stepping Stone Corridor)',
          type: '지선 생태축 (Local Corridor)',
          function: '도심 포켓공원 및 옥상정원 꿀벌·나비 이동 연결',
          connectivityScore: '76점',
          color: '#34d399',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng - d * 0.7, lat - d * 0.5],
            [lng - d * 0.15, lat - d * 0.1],
            [lng + d * 0.45, lat + d * 0.35],
            [lng + d * 0.8, lat + d * 0.7],
          ],
        },
      },
    ],
  };
}

/**
 * Initialize all built-in GeoJSON Layers based on site analysis data
 */
export function buildGeoJsonLayers(data: SiteAnalysisData): GeoJsonLayerItem[] {
  const radius = data.activeRadius;
  const lat = data.lat;
  const lng = data.lng;

  return [
    {
      key: 'candidateSites',
      label: '추천 그린인프라 최적 설치 입지 (Candidate Sites)',
      category: '그린인프라 전략',
      visible: true,
      opacity: 0.85,
      color: '#059669',
      description: 'MCDA 다기준 의사결정 알고리즘이 도출한 최적의 쌈지공원, 가로숲길, 옥상녹화, 빗물정원 부지',
      legend: [
        { label: '최적 입지 (Hotspot)', color: '#059669', desc: '종합 적합도 85점 이상' },
        { label: '연계 가로망/선형 녹도', color: '#10b981', desc: '보행자 쿨링 가로수길' },
      ],
      geoJsonData: generateCandidateSitesGeoJson(data.candidateSites || []),
    },
    {
      key: 'treesCanopy',
      label: 'OSM 수목 현황 및 가로수 캐노피 (Trees & Canopy)',
      category: '환경·기후',
      visible: true,
      opacity: 0.85,
      color: '#15803d',
      description: 'OSM 실측 개별 수목 위치, 수종(느티나무/이팝나무/벚나무), 수관 폭 및 그늘막 반경',
      legend: [
        { label: '대형 교목 (수관반경 4m+)', color: '#15803d', desc: '탄소흡수 및 쿨링 거점' },
        { label: '가로수목 (수관반경 3~4m)', color: '#22c55e', desc: '보행로 일사 차단' },
      ],
      geoJsonData: generateTreesCanopyGeoJson(lat, lng, radius, data.treesData?.treesList),
    },
    {
      key: 'pedestrianWalkways',
      label: 'OSM 보행로 네트워크 & 그늘보행로 (Walkability)',
      category: '기본 현황',
      visible: true,
      opacity: 0.8,
      color: '#10b981',
      description: '보행전용로, 인도 분리구간, 수목 그늘 형성도 및 휠체어/보행약자 접근성',
      legend: [
        { label: '그늘 보행로 (70%+ 차광)', color: '#10b981', desc: '쾌적한 쿨링 가로' },
        { label: '일반 생활 보행로', color: '#f59e0b', desc: '수목 보식 권장' },
        { label: '친수 산책로', color: '#06b6d4', desc: '하천변 에코로드' },
      ],
      geoJsonData: generatePedestrianWalkwaysGeoJson(lat, lng, radius),
    },
    {
      key: 'ecologicalCorridors',
      label: '생태축 연결성 & 바람길 코리도 (Eco-Corridors)',
      category: '그린인프라 전략',
      visible: false,
      opacity: 0.75,
      color: '#059669',
      description: '산림-도심-하천을 잇는 찬공기 유입로 및 꿀벌·소생물 이동 징검다리 녹지축',
      legend: [
        { label: '주 생태축 / 바람길 유입로', color: '#059669' },
        { label: '지선 생태축 / 징검다리', color: '#34d399' },
      ],
      geoJsonData: generateEcologicalCorridorsGeoJson(lat, lng, radius),
    },
    {
      key: 'landUseZonation',
      label: '용도지역 및 토지이용 계획도 (Land Use Zonation)',
      category: '기본 현황',
      visible: true,
      opacity: 0.45,
      color: '#3b82f6',
      description: '주거·상업·녹지·공공시설 등 용도구역별 건폐율/용적률 및 법정 조경비율 기준',
      legend: [
        { label: '일반상업지역', color: '#f59e0b', desc: '건폐율 60% / 용적률 600%' },
        { label: '제2종주거지역', color: '#94a3b8', desc: '건폐율 60% / 용적률 200%' },
        { label: '자연녹지·공원', color: '#22c55e', desc: '녹지율 70% 이상 보전' },
        { label: '공공·교육시설', color: '#38bdf8', desc: '옥상녹화 및 쌈지공원 적지' },
      ],
      geoJsonData: generateLandUseGeoJson(lat, lng, radius),
    },
    {
      key: 'heatIslandGrid',
      label: '도시 열섬(UHI) 및 지표면 온도 취약 격자',
      category: '환경·기후',
      visible: false,
      opacity: 0.5,
      color: '#ef4444',
      description: '인공위성 열적외선 데이터 기반 100m 격자별 지표면 온도 및 쿨링 필요 구역',
      legend: [
        { label: '심각 (39.0°C+)', color: '#b91c1c', desc: '열섬 집중지' },
        { label: '경계 (37.5°C~)', color: '#ef4444', desc: '쿨링포그/그늘목 필요' },
        { label: '주의 (36.0°C~)', color: '#f97316', desc: '녹지 보강 대상' },
        { label: '안전 (35.0°C 이하)', color: '#22c55e', desc: '기존 쿨스팟' },
      ],
      geoJsonData: generateHeatIslandGridGeoJson(lat, lng, radius),
    },
    {
      key: 'demographicGrid',
      label: '인구 밀도 및 취약계층 분포 격자 (Demographics)',
      category: '기본 현황',
      visible: false,
      opacity: 0.45,
      color: '#ea580c',
      description: '행정동별 인구밀도, 고령자·어린이 취약계층 거주 비율 및 쉼터 수혜 인구',
      legend: [
        { label: '초고밀 (28,000명/km²+)', color: '#dc2626' },
        { label: '고밀 (20,000명/km²+)', color: '#ea580c' },
        { label: '중밀 (14,000명/km²+)', color: '#eab308' },
      ],
      geoJsonData: generateDemographicGridGeoJson(lat, lng, radius),
    },
    {
      key: 'lidSuitability',
      label: '저영향개발(LID) 우수유출 및 침수 취약지',
      category: '환경·기후',
      visible: false,
      opacity: 0.5,
      color: '#06b6d4',
      description: '불투수면 과다 저지대 집수구역 및 식생수로/투수블록 설치 적합지',
      legend: [
        { label: 'LID 빗물정원 적지', color: '#06b6d4', desc: '침투 저류지' },
        { label: '도로변 식생수로', color: '#0284c7', desc: '가로변 유출 저감' },
      ],
      geoJsonData: generateLidSuitabilityGeoJson(lat, lng, radius),
    },
    {
      key: 'transitNetwork',
      label: '대중교통 거점 및 주요 버스/지하철 노선',
      category: '기본 현황',
      visible: false,
      opacity: 0.7,
      color: '#38bdf8',
      description: '지하철·버스 환승 정류장 및 역세권 주요 교통 결절점',
      legend: [
        { label: '지하철 환승축', color: '#38bdf8' },
        { label: '버스 정류장 거점', color: '#818cf8' },
      ],
      geoJsonData: generateTransitNetworkGeoJson(lat, lng, radius),
    },
  ];
}
