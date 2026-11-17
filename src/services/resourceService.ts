const base = import.meta.env.BASE_URL || '/';

export function publicAssetUrl(relativePath: string): string {
  return `${base.replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`;
}

export function datasetAssetUrl(folder: string, filename: string): string {
  const dataRoot = import.meta.env.VITE_DATA_BASE_URL?.replace(/\/$/, '');
  const name = filename.endsWith('.geojson') ? `${filename}.gz` : filename;
  const relative = `${encodeURIComponent(folder)}/${name}`;
  return dataRoot ? `${dataRoot}/${relative}` : publicAssetUrl(`data/${relative}`);
}

export function apiUrl(relativePath: string): string | null {
  const remote = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
  if (remote) return `${remote}/api/${relativePath.replace(/^\//, '')}`;
  return import.meta.env.MODE === 'pages' ? null : `/api/${relativePath.replace(/^\//, '')}`;
}

/** A .gz asset is intentionally served without Content-Encoding on static hosts. */
export async function fetchSpatialAsset(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok || !/\.geojson\.gz(?:[?#]|$)/.test(url)) return response;
  // Fetch already decodes HTTP Content-Encoding when the host supplies it.
  if (/gzip/i.test(response.headers.get('content-encoding') || '')) return response;
  if (!response.body || typeof DecompressionStream === 'undefined') {
    throw new Error('압축 공간자료를 읽을 수 없습니다. 최신 Chrome 또는 Edge로 열어주세요.');
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'application/geo+json; charset=utf-8');
  return new Response(response.body.pipeThrough(new DecompressionStream('gzip')), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
