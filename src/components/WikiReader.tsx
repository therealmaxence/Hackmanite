import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Search, Filter, ChevronRight, Copy, Check, FileText, Sparkles, Layers } from 'lucide-react';
import { WIKI_ARTICLES, WikiArticle } from '../data/wikiArticles';

export const WikiReader: React.FC = () => {
  const [selectedArticleId, setSelectedArticleId] = useState<string>(WIKI_ARTICLES[0].id);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const categories = ['All', 'Guide', 'Analysis', 'Workflows', 'Architecture'];

  const filteredArticles = WIKI_ARTICLES.filter((article) => {
    const matchCategory = activeCategory === 'All' || article.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const currentArticle = WIKI_ARTICLES.find((a) => a.id === selectedArticleId) || WIKI_ARTICLES[0];

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(currentArticle.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="wiki" className="py-20 bg-gray-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation Hub
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Hackmanite User Wiki & Technical Guides
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Comprehensive documentation covering installation, graph exploration, co-occurrence analysis, weak signals, pipeline composition, and system architecture.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-900/80 p-1.5 rounded-xl border border-gray-800 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search all wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Wiki Reader Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Sidebar Article List (4 Cols) */}
          <div className="lg:col-span-4 glass-panel p-4 rounded-2xl space-y-2 max-h-[700px] overflow-y-auto">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
              Articles ({filteredArticles.length})
            </span>

            {filteredArticles.map((art) => {
              const isSelected = art.id === selectedArticleId;
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-gray-900/40 border-gray-800/80 text-gray-300 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      Chapter {art.num}
                    </span>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {art.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">
                    {art.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Article Markdown Viewer (8 Cols) */}
          <div className="lg:col-span-8 glass-panel p-8 rounded-2xl space-y-6">
            
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Chapter {currentArticle.num} • {currentArticle.category}
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">
                  {currentArticle.title}
                </h3>
              </div>

              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                <span>{copied ? 'Copied MD' : 'Copy MD'}</span>
              </button>
            </div>

            {/* Markdown Content */}
            <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-300 prose-p:text-sm prose-p:leading-relaxed prose-li:text-gray-300 prose-li:text-sm prose-code:text-indigo-300 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0b0f19] prose-pre:border prose-pre:border-gray-800 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentArticle.content}
              </ReactMarkdown>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
