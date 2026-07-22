import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Search, Copy, Check, FileText } from 'lucide-react';
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

  const handleCopy = () => {
    navigator.clipboard.writeText(currentArticle.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Hackmanite User Wiki & Technical Guides</h1>
              <p className="text-xs text-slate-400">Searchable documentation browser covering installation, graph exploration, pipelines, and architecture</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search wiki articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Article Selector (4 Cols) */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 max-h-[620px] overflow-y-auto">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              Articles ({filteredArticles.length})
            </div>

            {filteredArticles.map((art) => {
              const isSelected = art.id === selectedArticleId;
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-400">Chapter {art.num}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">{art.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">{art.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{art.summary}</p>
                </div>
              );
            })}
          </div>

          {/* Article Viewer (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Chapter {currentArticle.num} • {currentArticle.category}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{currentArticle.title}</h2>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy MD'}</span>
              </button>
            </div>

            <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-p:text-xs prose-p:leading-relaxed prose-li:text-slate-300 prose-li:text-xs prose-code:text-indigo-300 prose-code:bg-slate-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-500/10 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentArticle.content}
              </ReactMarkdown>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
