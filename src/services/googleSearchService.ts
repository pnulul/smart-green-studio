export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
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
  async searchNews(query: string, apiKey: string, searchEngineId: string): Promise<GoogleSearchItem[]> {
    if (!apiKey || !searchEngineId) {
      throw new Error('API Key or Search Engine ID is missing');
    }

    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      query
    )}&key=${apiKey}&cx=${searchEngineId}&num=6`;

    try {
      const response = await fetch(url);
      const data: GoogleSearchResponse = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.items || [];
    } catch (err: any) {
      console.error('Google Search API error:', err);
      throw new Error(err.message || '검색 요청 중 오류가 발생했습니다.');
    }
  },
};
