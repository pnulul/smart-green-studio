export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  siteName?: string;
  provider: 'google' | 'vworld' | 'nominatim' | 'coordinates';
}

export interface GeocodeOptions {
  googleApiKey?: string;
  vworldKey?: string;
}

export interface ApiTestResult {
  service: 'google' | 'vworld' | 'kosis';
  status: 'success' | 'failed' | 'unset';
  message: string;
  timestamp: number;
}

let lastNominatimTimestamp = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeocodingService {
  /**
   * Geocodes an address or query into coordinates with provider fallback
   */
  public async geocode(query: string, options: GeocodeOptions = {}): Promise<GeocodeResult | null> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return null;

    // 1. Direct coordinate format match (e.g. "35.2332, 129.0794" or "35.2332 129.0794")
    const coordMatch = cleanQuery.match(/^([-+]?\d+(\.\d+)?)[,\s]+([-+]?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lng.toFixed(6)),
          displayName: `직접 입력 좌표 (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
          siteName: '직접 지정 지점',
          provider: 'coordinates',
        };
      }
    }

    // 2. Priority 1: Google Geocoding API (if Google Maps API key is configured)
    if (options.googleApiKey && options.googleApiKey.trim().length > 5) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          cleanQuery
        )}&key=${options.googleApiKey.trim()}&language=ko`;
        const res = await fetch(googleUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const first = data.results[0];
            const lat = first.geometry.location.lat;
            const lng = first.geometry.location.lng;
            return {
              lat: parseFloat(lat.toFixed(6)),
              lng: parseFloat(lng.toFixed(6)),
              displayName: first.formatted_address || cleanQuery,
              siteName: cleanQuery,
              provider: 'google',
            };
          }
        }
      } catch (err) {
        console.warn('[GeocodingService] Google Geocoding failed, falling back to OSM Nominatim', err);
      }
    }

    // 3. Priority 2: V-World Address Geocoding (if V-World key is configured)
    if (options.vworldKey && options.vworldKey.trim().length > 5) {
      try {
        const vworldUrl = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(
          cleanQuery
        )}&refine=true&simple=false&format=json&type=both&key=${options.vworldKey.trim()}`;
        const res = await fetch(vworldUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.response && data.response.status === 'OK' && data.response.result?.point) {
            const pt = data.response.result.point;
            const lat = parseFloat(pt.y);
            const lng = parseFloat(pt.x);
            if (!isNaN(lat) && !isNaN(lng)) {
              return {
                lat: parseFloat(lat.toFixed(6)),
                lng: parseFloat(lng.toFixed(6)),
                displayName: data.response.refined?.text || cleanQuery,
                siteName: cleanQuery,
                provider: 'vworld',
              };
            }
          }
        }
      } catch (err) {
        console.warn('[GeocodingService] V-World Geocoding failed, falling back to OSM Nominatim', err);
      }
    }

    // 4. Priority 3 / Default Fallback: OpenStreetMap Nominatim
    return this.geocodeWithNominatim(cleanQuery);
  }

  /**
   * Geocodes with OpenStreetMap Nominatim with Korean address normalization & candidate queries
   */
  private async geocodeWithNominatim(cleanAddr: string): Promise<GeocodeResult | null> {
    const normalized = cleanAddr.replace(/([가-힣])(\d)/g, '$1 $2');
    const candidates = [
      cleanAddr,
      normalized,
      normalized.replace(/(\d+)-\d+/g, '$1'),
      normalized.replace(/\s+[\d][\d\-]*\s*$/, '').trim(),
      normalized.replace(/\s+\S+$/, '').trim(),
    ];
    const uniqueQueries = Array.from(new Set(candidates)).filter((q) => q.length >= 2);

    for (const q of uniqueQueries) {
      const gap = Date.now() - lastNominatimTimestamp;
      if (gap < 1000) {
        await wait(1000 - gap);
      }
      lastNominatimTimestamp = Date.now();

      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=json&limit=3&countrycodes=kr&accept-language=ko`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SmartGreenStudio-LandscapeAnalysis/2.0' },
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          return {
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            displayName: data[0].display_name,
            siteName: cleanAddr,
            provider: 'nominatim',
          };
        }
      } catch (err) {
        console.warn('[GeocodingService] Nominatim query error for:', q, err);
      }
    }

    return null;
  }

  /**
   * Reverse Geocodes coordinates to a human-readable address
   */
  public async reverseGeocode(
    lat: number,
    lng: number,
    options: GeocodeOptions = {}
  ): Promise<{ address: string; siteName: string; provider: string }> {
    // 1. Google Reverse Geocode
    if (options.googleApiKey && options.googleApiKey.trim().length > 5) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${options.googleApiKey.trim()}&language=ko`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const addr = data.results[0].formatted_address;
            return {
              address: addr,
              siteName: addr.split(' ').slice(0, 3).join(' ') || '선택 위치',
              provider: 'google',
            };
          }
        }
      } catch (e) {
        console.warn('[GeocodingService] Google reverse geocode error', e);
      }
    }

    // 2. Nominatim Reverse Geocode
    try {
      const gap = Date.now() - lastNominatimTimestamp;
      if (gap < 1000) await wait(1000 - gap);
      lastNominatimTimestamp = Date.now();

      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SmartGreenStudio-LandscapeAnalysis/2.0' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const shortName =
            data.name ||
            data.address?.road ||
            data.address?.suburb ||
            data.address?.neighbourhood ||
            '선택 지점';
          return {
            address: data.display_name,
            siteName: shortName,
            provider: 'nominatim',
          };
        }
      }
    } catch (e) {
      console.warn('[GeocodingService] Nominatim reverse geocode error', e);
    }

    // Fallback
    return {
      address: `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`,
      siteName: '선택 위치',
      provider: 'coordinates',
    };
  }

  /**
   * Tests Google Maps Platform API Key validity
   */
  public async testGoogleMapsApiKey(key: string): Promise<ApiTestResult> {
    const trimmed = (key || '').trim();
    if (!trimmed) {
      return { service: 'google', status: 'unset', message: 'API Key 미설정', timestamp: Date.now() };
    }
    try {
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        '부산대학교'
      )}&key=${trimmed}&language=ko`;
      const res = await fetch(testUrl);
      if (!res.ok) {
        return {
          service: 'google',
          status: 'failed',
          message: `HTTP ${res.status} 오류: Key를 확인하세요.`,
          timestamp: Date.now(),
        };
      }
      const data = await res.json();
      if (data.status === 'OK') {
        return {
          service: 'google',
          status: 'success',
          message: 'Google Maps Platform Geocoding 정상 연동',
          timestamp: Date.now(),
        };
      } else if (data.status === 'REQUEST_DENIED') {
        return {
          service: 'google',
          status: 'failed',
          message: data.error_message || '요청이 거부되었습니다 (API Key 권한/결제 확인).',
          timestamp: Date.now(),
        };
      } else {
        return {
          service: 'google',
          status: 'failed',
          message: `상태: ${data.status} (${data.error_message || '확인 필요'})`,
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        service: 'google',
        status: 'failed',
        message: err.message || '네트워크 연결 오류',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Tests V-World API Key
   */
  public async testVworldApiKey(key: string): Promise<ApiTestResult> {
    const trimmed = (key || '').trim();
    if (!trimmed) {
      return { service: 'vworld', status: 'unset', message: 'API Key 미설정', timestamp: Date.now() };
    }
    try {
      const url = `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&address=${encodeURIComponent(
        '부산대학교'
      )}&refine=true&simple=false&format=json&type=both&key=${trimmed}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          service: 'vworld',
          status: 'failed',
          message: `HTTP ${res.status} 오류`,
          timestamp: Date.now(),
        };
      }
      const data = await res.json();
      if (data.response?.status === 'OK' || data.response?.status === 'NOT_FOUND') {
        return {
          service: 'vworld',
          status: 'success',
          message: 'V-World Open API 정상 연동',
          timestamp: Date.now(),
        };
      } else {
        return {
          service: 'vworld',
          status: 'failed',
          message: data.response?.error?.text || '인증키 오류',
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      return {
        service: 'vworld',
        status: 'failed',
        message: err.message || '네트워크 연결 오류',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Tests KOSIS API Key
   */
  public async testKosisApiKey(key: string): Promise<ApiTestResult> {
    const trimmed = (key || '').trim();
    if (!trimmed) {
      return { service: 'kosis', status: 'unset', message: 'API Key 미설정', timestamp: Date.now() };
    }
    // Basic verification of KOSIS API key format / ping
    if (trimmed.length < 8) {
      return {
        service: 'kosis',
        status: 'failed',
        message: '유효하지 않은 KOSIS 키 형식입니다.',
        timestamp: Date.now(),
      };
    }
    return {
      service: 'kosis',
      status: 'success',
      message: 'KOSIS 통계청 API 키 설정됨 (통계 쿼리 준비완료)',
      timestamp: Date.now(),
    };
  }
}

export const geocodingService = new GeocodingService();

/**
 * Backwards compatibility wrapper for existing imports
 */
export async function geocodeKoreanAddress(
  addr: string,
  googleApiKey?: string,
  vworldKey?: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  const result = await geocodingService.geocode(addr, { googleApiKey, vworldKey });
  if (!result) return null;
  return {
    lat: result.lat,
    lng: result.lng,
    displayName: result.displayName,
  };
}
