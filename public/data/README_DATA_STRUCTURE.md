# Smart Green Studio Dataset Structure

이 폴더는 Smart Green Studio에서 사용되는 실제 공간정보 데이터셋을 명확한 폴더 구조로 관리하기 위해 만들어졌습니다. 개발자 및 사용자가 각 폴더가 어떤 데이터를 의미하는지 쉽게 이해하고 교체할 수 있도록 설계되었습니다.

## 데이터셋 폴더 구조

각 폴더 내에는 다음 3개의 파일이 필수적으로 존재해야 합니다.

- `layer.geojson` : 실제 공간 정보를 담고 있는 EPSG:4326 좌표계의 GeoJSON 파일입니다.
- `metadata.json` : 해당 데이터셋의 메타 정보 (이름, 설명, 지오메트리 타입, 분석 방식, 라벨 필드 등)를 정의합니다.
- `style.json` : 지도 렌더링 시 사용할 범례 및 색상 스타일 규정 파일입니다. 기본적으로 미설정 시 중립 회색으로 렌더링됩니다.

## 폴더 목록 및 설명

| 폴더명 | 한글명 | 영문명 | 의미 (데이터 설명) | 권장 Geometry Type | 분석 방식 |
|---|---|---|---|---|---|
| 01_buildings | 건물 | Buildings | 실제 건축물 Polygon 공간정보 | Polygon | Count/Density/Area |
| 02_building_use | 건축물 용도 | Building Use | 주거, 상업, 업무, 교육, 문화 등 건축물의 주용도 | Polygon | Area/Ratio |
| 03_completion_year | 준공연대 | Completion Year | 건축물의 준공년도 또는 준공연대 분석 | Polygon | Area/Ratio |
| 04_highrise | 고층건물 | High-rise Buildings | 설정된 층수 또는 높이 기준 이상의 고층 건축물 | Polygon | Count/Density |
| 05_lowrise | 저층건물 | Low-rise Buildings | 설정된 층수 또는 높이 기준 이하의 저층 건축물 | Polygon | Count/Density |
| 06_zoning | 용도지역 | Zoning | 주거지역, 상업지역, 공업지역, 녹지지역 등 용도지역 | Polygon | Area/Ratio |
| 07_green_park_river | 공원·녹지·하천 | Parks, Green Space and Rivers | 공원, 도시녹지, 산림, 하천 등 녹지 및 수공간 | Polygon | Area/Ratio |
| 08_district_zone | 용도지구·구역 | Districts and Zones | 경관지구, 고도지구, 개발제한구역 등 용도지구 및 구역 | Polygon | Area/Ratio |
| 10_roads | 도로 | Roads | 도로 중심선 또는 도로 공간정보 | LineString/Polygon | Length/Area |
| 11_transit | 지하철·버스 | Public Transit | 지하철역 및 버스정류장 위치정보 | Point | Count/Nearest |
| 12_slope | 경사도 | Slope | 대상지의 경사도 및 경사등급 분석 | Polygon/Grid | Average/Ratio |
| 13_aspect | 향 | Aspect | 북향, 동향, 남향, 서향 등 지형의 방향 분석 | Polygon/Grid | Average/Ratio |
| 15_ecology | 생태자연도 | Ecological Naturalness Map | 생태자연도 1등급, 2등급, 3등급 및 별도관리지역 분석 | Polygon | Area/Ratio |
| 16_environmental_value | 국토환경성평가지도 | Environmental Conservation Value Assessment Map | 국토환경성평가지도의 환경적 가치등급 분석 | Polygon | Area/Ratio |
| 17_lst | 지표온도 LST | Land Surface Temperature | 지표면온도 및 열환경 분석 | Grid/Polygon | Average |
| 18_population_grid | 격자인구 | Grid Population | 일정 크기의 공간 Grid 단위 인구 및 인구밀도 분석 | Polygon | Sum/Average |
| 19_census_population_household | 집계구·행정동 인구가구 | Census and Administrative Population / Household | 집계구 또는 행정동 단위 인구, 가구, 연령, 밀도 등의 사회통계 | Polygon | Sum/Density |

## 건물 데이터 재사용 구조 확장성

`02_building_use`, `03_completion_year`, `04_highrise`, `05_lowrise` 폴더들은 본질적으로 동일한 건축물 형태(Geometry)를 기반으로 속성(Property)만 다르게 사용합니다.
따라서, 이 데이터셋들은 `metadata.json`의 `sourceLayer` 필드에 `"01_buildings"`를 지정하여 01번 폴더의 GeoJSON을 공통 Geometry로 재사용하도록 설계되었습니다. (추후 구현 시 이 속성을 바탕으로 중복 파싱 방지 가능)
그럼에도 불구하고 사용자 편의성을 위해 카테고리 분리 목적으로 독립적인 폴더로 구성되어 있습니다.

## 데이터 교체 방법

- 원하는 폴더를 찾은 뒤, `layer.geojson` 파일을 해당 지역의 실제 EPSG:4326 GeoJSON 파일로 교체하세요.
- `metadata.json`을 수정하여 실제 파일 내에서 사용할 값 필드(`valueField`) 및 라벨 필드(`labelField`) 등을 맞춰주세요.
- `style.json`을 수정하여 렌더링될 클래스 색상 값을 정의하면, 지도·범례·차트·PPT 등에서 해당 스타일이 통합적으로 자동 반영됩니다.
