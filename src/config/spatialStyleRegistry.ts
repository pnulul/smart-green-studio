export const SpatialStyleRegistry = {
  // 토지이용 (Land Use)
  landUse: {
    residential: { color: '#F8D176', label: '주거지역' },
    commercial: { color: '#E9743A', label: '상업지역' },
    industrial: { color: '#C498D4', label: '공업지역' },
    green: { color: '#88C079', label: '녹지지역' },
    mixed: { color: '#D2DAE1', label: '혼합지역' },
    other: { color: '#E8EDF2', label: '기타/미분류' },
  },
  
  // 토지피복 (Land Cover)
  landCover: {
    builtUp: { color: '#D9D9D9', label: '시가지' },
    agricultural: { color: '#E7E082', label: '농경지' },
    forest: { color: '#4B9B53', label: '산림' },
    grassland: { color: '#A9D18E', label: '초지' },
    wetland: { color: '#7CC1C7', label: '습지' },
    barren: { color: '#C8C8C8', label: '나지' },
    water: { color: '#4F91CE', label: '수역' },
  },

  // 용도지역 (Zoning)
  zoning: {
    type1GeneralRes: { color: '#FDF1D5', label: '제1종일반주거' },
    type2GeneralRes: { color: '#FDE4A9', label: '제2종일반주거' },
    type3GeneralRes: { color: '#F8D176', label: '제3종일반주거' },
    semiRes: { color: '#F3B452', label: '준주거' },
    centerCom: { color: '#D45C25', label: '중심상업' },
    generalCom: { color: '#E9743A', label: '일반상업' },
    neighborhoodCom: { color: '#F5B594', label: '근린상업' },
    naturalGreen: { color: '#88C079', label: '자연녹지' },
  },

  // 경사등급 (Slope)
  slope: {
    level0_5: { color: '#97E5F6', label: '0~5° (평탄지)' },
    level5_10: { color: '#A9D18E', label: '5~10° (완경사)' },
    level10_15: { color: '#F8D176', label: '10~15° (구릉지)' },
    level15_20: { color: '#E9743A', label: '15~20° (급경사)' },
    level20_plus: { color: '#E0483C', label: '20° 이상 (험준지)' },
  },

  // 생태자연도 (Ecology)
  ecology: {
    grade1: { color: '#2C6E33', label: '1등급' },
    grade2: { color: '#4B9B53', label: '2등급' },
    grade3: { color: '#88C079', label: '3등급' },
    outOfGrade: { color: '#D2DAE1', label: '등급외' },
  },

  // 녹지 (Green)
  green: {
    park: { color: '#4B9B53', label: '공원' },
    streetTree: { color: '#88C079', label: '가로수' },
    forest: { color: '#2C6E33', label: '산림' },
    urbanGreen: { color: '#A9D18E', label: '도심녹지' },
  },

  // 지표면온도 (LST - Land Surface Temperature)
  lst: {
    cold: { color: '#35C6E8', label: '저온 (<25°C)' },
    cool: { color: '#97E5F6', label: '다소저온 (25~28°C)' },
    moderate: { color: '#F8D176', label: '보통 (28~31°C)' },
    warm: { color: '#E9743A', label: '다소고온 (31~34°C)' },
    hot: { color: '#E0483C', label: '고온 (>34°C)' },
  },

  // 공통 범례 색상 (General UI usage)
  general: {
    primary: '#35C6E8',
    secondary: '#5D6975',
    warning: '#E9743A',
    danger: '#E0483C',
    success: '#4B9B53'
  }
};

export const getRegistryColor = (category: keyof typeof SpatialStyleRegistry, key: string, fallback: string = '#E8EDF2') => {
  const reg = SpatialStyleRegistry[category] as any;
  if (!reg) return fallback;
  return reg[key]?.color || fallback;
};

export const getRegistryLabel = (category: keyof typeof SpatialStyleRegistry, key: string, fallback: string = 'Unknown') => {
  const reg = SpatialStyleRegistry[category] as any;
  if (!reg) return fallback;
  return reg[key]?.label || fallback;
};
