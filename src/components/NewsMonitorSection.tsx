import React, { useState } from 'react';
import { Newspaper, Search, ChevronRight, Hash, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { SiteAnalysisData } from '../types';
import { googleSearchService, GoogleSearchItem } from '../services/googleSearchService';
import { loggerService } from '../services/loggerService';
import { StudentAuthSession } from '../types';

interface NewsMonitorSectionProps {
  session?: StudentAuthSession | null;
  currentSite: SiteAnalysisData;
  googleSearchApiKey?: string;
  googleSearchEngineId?: string;
  onResultsChange?: (results: GoogleSearchItem[]) => void;
}

export const NewsMonitorSection: React.FC<NewsMonitorSectionProps> = ({
  session, 
  currentSite, 
  googleSearchApiKey, 
  googleSearchEngineId,
  onResultsChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const RECOMMENDED_KEYWORDS = [
    '도시개발',
    '공원·녹지',
    '보행환경',
    '기후·환경',
    '도시열섬',
    '침수',
    '주민이슈'
  ];

  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    if (!googleSearchApiKey || !googleSearchEngineId) {
      setSearchError('Google Custom Search API Key와 Search Engine ID가 필요합니다.');
      return;
    }

    setIsSearching(true);
    const startTime = Date.now();
    loggerService.log(session?.studentId || 'unknown', 'NEWS_SEARCH', `검색어: ${query}`, {
      site_name: currentSite?.siteName,
      status: 'start'
    });
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await googleSearchService.searchNews(query, googleSearchApiKey, googleSearchEngineId);
      setSearchResults(results);
      if (onResultsChange) onResultsChange(results);
      loggerService.log(session?.studentId || 'unknown', 'NEWS_SEARCH', `검색 완료: ${query}`, {
        site_name: currentSite?.siteName,
        status: 'success',
        duration_ms: Date.now() - startTime
      });
    } catch (err: any) {
      setSearchError(err.message || '검색 중 오류가 발생했습니다.');
      loggerService.log(session?.studentId || 'unknown', 'NEWS_SEARCH', `검색 오류: ${err.message}`, {
        site_name: currentSite?.siteName,
        status: 'error',
        duration_ms: Date.now() - startTime
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    const q = `${currentSite.address || currentSite.siteName} ${keyword}`;
    setSearchQuery(q);
    handleSearch(q);
  };

  return (
    <div className="w-full bg-[var(--bg-panel)] border-t border-[var(--border-hair)] flex-shrink-0 flex flex-col z-10 relative">
      <div className="max-w-screen-2xl mx-auto w-full p-6">
        
        {/* Header */}
        <div className="flex flex-col mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--accent)] text-[10px] font-bold border border-[var(--border-hair)] flex items-center gap-1">
              News Monitor
            </span>
            <span className="text-xs text-[var(--text-3)]">지역 뉴스</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-1)] mb-1">
            대상지 실시간 언론·지역 뉴스 모니터링
          </h2>
          <p className="text-xs text-[var(--text-2)]">
            현재 선택한 대상지와 관련된 도시개발, 공원·녹지, 기후환경, 보행환경 및 지역사회 이슈를 확인합니다.
          </p>
          <div className="mt-3 p-3 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 w-full">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">현재 대상지</span>
              <span className="text-sm font-bold text-[var(--accent)]">{currentSite.address || currentSite.siteName}</span>
            </div>
          </div>
        </div>

        {/* Search Input & Keywords */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[var(--text-3)]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="검색어 입력..."
              className="block w-full pl-10 pr-16 py-3 border border-[var(--border-hair)] rounded-xl bg-[var(--surface-1)] text-[var(--text-1)] text-sm placeholder-[var(--text-3)] focus:outline-none focus:border-[var(--accent-dim)] transition-colors"
            />
            <button
              data-usage-action="news-search"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="absolute inset-y-1.5 right-1.5 px-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] text-xs font-bold rounded-lg border border-[var(--border-hair)] transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-3)]" /> : '검색'}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {RECOMMENDED_KEYWORDS.map(keyword => (
              <button
                data-usage-action="news-keyword"
                key={keyword}
                onClick={() => handleKeywordClick(keyword)}
                className="px-3 py-1.5 rounded-full bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] text-[11px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              >
                <Hash className="w-3 h-3" />
                {keyword}
              </button>
            ))}
          </div>
        </div>

        {/* Search Error */}
        {searchError && (
          <div className="mb-8 p-4 rounded-xl border border-[var(--warn)] bg-[var(--warn)]/5 text-[var(--warn)] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{searchError}</p>
          </div>
        )}

        {/* News Grid (Empty / Loading / Results) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {!isSearching && searchResults.length === 0 && !searchError && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 flex flex-col items-center justify-center border border-dashed border-[var(--border-hair)] rounded-2xl bg-[var(--surface-1)]/50">
              <p className="text-sm text-[var(--text-2)] text-center">
                대상지 관련 뉴스를 검색하면<br/>이곳에 실제 결과가 표시됩니다.
              </p>
            </div>
          )}

          {isSearching && (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] animate-pulse flex flex-col gap-3">
                <div className="h-4 bg-[var(--surface-2)] rounded w-3/4"></div>
                <div className="h-3 bg-[var(--surface-2)] rounded w-full"></div>
                <div className="h-3 bg-[var(--surface-2)] rounded w-5/6"></div>
              </div>
            ))
          )}

          {!isSearching && searchResults.map((item, idx) => {
            const thumbnail = item.pagemap?.cse_thumbnail?.[0]?.src;
            return (
              <a
                data-usage-action="news-open"
                key={idx} 
                href={item.link} 
                target="_blank" 
                rel="noreferrer"
                className="group p-4 rounded-xl border border-[var(--border-hair)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hover:border-[var(--accent-dim)] transition-all flex flex-col gap-3"
              >
                {thumbnail && (
                  <div className="w-full h-32 rounded-lg bg-[var(--surface-2)] overflow-hidden">
                    <img src={thumbnail} alt="News thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-1)] mb-1.5 line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--text-3)] line-clamp-3 leading-relaxed">
                    {item.snippet}
                  </p>
                </div>
                <div className="mt-auto pt-2 flex items-center text-[10px] text-[var(--accent)] font-medium gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  기사 원문 보기 <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            );
          })}
        </div>

        {/* AI Analysis Placeholder */}
        <div className="p-5 rounded-2xl border border-[var(--border-hair)] bg-[var(--surface-1)]/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <h3 className="text-sm font-bold text-[var(--text-1)] mb-2">AI 뉴스 종합 분석</h3>
            <p className="text-xs text-[var(--text-3)] max-w-md">
              뉴스 검색 결과를 기반으로 주요 지역 이슈와 조경·도시계획 관련 시사점을 분석할 예정입니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
