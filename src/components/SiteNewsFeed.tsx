import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Search,
  ExternalLink,
  RefreshCw,
  Tag,
  Calendar,
  Building2,
  TreePine,
  ShieldAlert,
  Footprints,
  Users,
} from 'lucide-react';
import { GoogleNewsArticle, SiteAnalysisData } from '../types';
import { fetchLiveGoogleNews, getRecommendedNewsKeywords } from '../services/newsService';

interface SiteNewsFeedProps {
  data?: SiteAnalysisData;
  siteName?: string;
  address?: string;
}

export const SiteNewsFeed: React.FC<SiteNewsFeedProps> = ({ data, siteName: propSiteName, address: propAddress }) => {
  const currentSiteName = data?.siteName || propSiteName || '대상지';
  const currentAddress = data?.address || propAddress || '';

  const [articles, setArticles] = useState<GoogleNewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeKeyword, setActiveKeyword] = useState<string>('');

  const recommendedKeywords = getRecommendedNewsKeywords(currentSiteName, currentAddress);

  const loadNews = useCallback(
    async (queryText: string) => {
      setIsLoading(true);
      try {
        const results = await fetchLiveGoogleNews(queryText, currentSiteName, currentAddress);
        setArticles(results);
      } catch (err) {
        console.error('Failed to load news:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSiteName, currentAddress]
  );

  // Initial load or when site changes
  useEffect(() => {
    const initialQuery = `${currentSiteName}`;
    setSearchQuery(initialQuery);
    setActiveKeyword(initialQuery);
    loadNews(initialQuery);
  }, [currentSiteName, currentAddress, loadNews]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveKeyword(searchQuery.trim());
      loadNews(searchQuery.trim());
    }
  };

  const handleKeywordClick = (kw: string) => {
    setSearchQuery(kw);
    setActiveKeyword(kw);
    loadNews(kw);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '공원·녹지':
        return <TreePine className="w-3.5 h-3.5 text-[var(--accent)]" />;
      case '기후·환경':
        return <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent)]" />;
      case '교통·보행':
        return <Footprints className="w-3.5 h-3.5 text-[var(--text-2)]" />;
      case '지역현안':
        return <Users className="w-3.5 h-3.5 text-[var(--text-2)]" />;
      default:
        return <Building2 className="w-3.5 h-3.5 text-[var(--text-2)]" />;
    }
  };

  return (
    <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-hair)] p-5 space-y-4 font-sans text-[var(--text-1)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hair)]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-1)] border border-[var(--border-hair)] flex items-center justify-center">
              <Newspaper className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <h3 className="font-bold text-base text-[var(--text-1)] tracking-tight flex items-center gap-2">
              <span>대상지 실시간 언론·지역 뉴스 모니터링</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border-hair)]">
                Google News Feed
              </span>
            </h3>
          </div>
          <p className="text-xs text-[var(--text-3)] mt-1">
            대상지 지명 및 행정구역 기반 최신 도시개발, 공원녹지, 기후방재, 주민 이슈 기사를 실시간 연동합니다.
          </p>
        </div>

        {/* Live Search on Google News Link */}
        <div className="flex items-center gap-2">
          <a
            href={`https://news.google.com/search?q=${encodeURIComponent(searchQuery || currentSiteName)}&hl=ko&gl=KR&ceid=KR:ko`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-1)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] text-xs font-medium transition-colors"
          >
            <span>Google 뉴스에서 직접 검색</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-3)]" />
          </a>

          <button
            type="button"
            onClick={() => loadNews(searchQuery)}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-1)] text-[var(--text-2)] border border-[var(--border-hair)] hover:text-[var(--text-1)] transition-colors disabled:opacity-50"
            title="뉴스 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="대상지 관련 검색어 입력 (예: 금정구 도시재생, 온천천 생태, 녹지공원)"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-hair)] text-[var(--text-1)] text-xs placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[#080B0F] hover:opacity-90 text-xs font-bold transition-opacity flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <span>검색</span>
        </button>
      </form>

      {/* Recommended Filter Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-[var(--text-3)] font-medium flex items-center gap-1 mr-1">
          <Tag className="w-3 h-3 text-[var(--accent)]" />
          <span>추천 키워드:</span>
        </span>
        {recommendedKeywords.map((kw) => {
          const isSelected = activeKeyword === kw;
          return (
            <button
              key={kw}
              type="button"
              onClick={() => handleKeywordClick(kw)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors border ${
                isSelected
                  ? 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--accent-dim)]'
                  : 'bg-[var(--surface-1)] text-[var(--text-3)] border-[var(--border-hair)] hover:text-[var(--text-1)]'
              }`}
            >
              #{kw}
            </button>
          );
        })}
      </div>

      {/* News Articles Grid */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-3)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-medium">Google 뉴스에서 최신 보도 자료를 검색하고 있습니다...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-10 text-center text-[var(--text-3)] bg-[var(--surface-1)] rounded-xl border border-[var(--border-hair)] text-xs">
          검색된 최신 기사가 없습니다. 다른 키워드로 검색해 보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-4 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-hair)] hover:border-[var(--accent-dim)] transition-colors flex flex-col justify-between space-y-2.5 relative overflow-hidden"
            >
              <div className="space-y-2">
                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--border-hair)] text-[var(--text-2)] font-medium text-[10px]">
                      {getCategoryIcon(article.category)}
                      <span>{article.category}</span>
                    </span>
                    <span className="text-[var(--text-3)] font-medium truncate max-w-[120px]">
                      {article.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)] font-mono">
                    <Calendar className="w-3 h-3 text-[var(--text-3)]" />
                    <span>{article.publishedAt}</span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="font-bold text-xs sm:text-sm text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2">
                  {article.title}
                </h4>

                {/* Snippet */}
                <p className="text-[11px] text-[var(--text-2)] line-clamp-2 leading-relaxed">
                  {article.snippet}
                </p>
              </div>

              {/* Bottom tags & link */}
              <div className="pt-2 border-t border-[var(--divider)] flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  {article.tags.map((t, idx) => (
                    <span key={idx} className="text-[var(--text-3)] font-medium">
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="text-[var(--accent)] group-hover:underline font-medium flex items-center gap-0.5">
                  <span>원문 기사 보기</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
