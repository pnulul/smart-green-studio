export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
  provider?: string;
  pagemap?: {
    cse_thumbnail?: { src: string }[];
  };
}

export interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  error?: {
    message: string;
  };
}

export const googleSearchService = {
  isConfigured(apiKey = '', searchEngineId = '') {
    return !!import.meta.env.VITE_NEWS_SEARCH_URL?.trim() || !!(apiKey && searchEngineId);
  },

  async searchNews(query: string, apiKey = '', searchEngineId = ''): Promise<GoogleSearchItem[]> {
    const normalized = query.trim().replace(/\s+/g, ' ');
    if (!normalized) return [];
    if (normalized.length > 200) throw new Error('검색어는 200자 이하로 입력해 주세요.');
    const endpoint = import.meta.env.VITE_NEWS_SEARCH_URL?.trim();
    if (!endpoint && (!apiKey || !searchEngineId)) throw new Error('뉴스 검색 연결을 확인해 주세요.');
    const cacheKey = `${endpoint || searchEngineId}:${normalized}`;
    const saved = newsCache.get(cacheKey);
    if (saved && saved.expires > Date.now()) return saved.items;

    const url = new URL(endpoint || 'https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('q', normalized);
    if (!endpoint) {
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', searchEngineId);
      url.searchParams.set('num', '6');
    }
    let response: Response;
    try { response = await fetch(url.toString(), { signal: AbortSignal.timeout(15000), credentials: 'omit' }); }
    catch { throw new Error('뉴스 서버에 연결하지 못했습니다. 잠시 후 다시 검색해 주세요.'); }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.error) {
      const message = typeof data?.error === 'string' ? data.error : data?.error?.message;
      throw new Error(message || '뉴스를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요.');
    }
    if (!endpoint && data.items === undefined) data.items = [];
    if (!Array.isArray(data.items)) throw new Error('뉴스 검색 응답을 확인할 수 없습니다.');
    const items = data.items.filter((item: GoogleSearchItem) => {
      if (typeof item?.title !== 'string' || typeof item.link !== 'string') return false;
      try { return ['https:', 'http:'].includes(new URL(item.link).protocol); } catch { return false; }
    }).slice(0, 6).map((item: GoogleSearchItem) => ({ ...item, provider: data.provider })) as GoogleSearchItem[];
    if (newsCache.size >= 50) newsCache.delete(newsCache.keys().next().value!);
    newsCache.set(cacheKey, { items, expires: Date.now() + 300000 });
    return items;
  },
};

const newsCache = new Map<string, { items: GoogleSearchItem[]; expires: number }>();
