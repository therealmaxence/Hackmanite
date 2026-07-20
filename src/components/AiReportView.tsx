import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Sliders, Play, Copy, Download, Check, Sparkles, Server, Key, FileText } from 'lucide-react';

const SAMPLE_REPORT = `# Hackmanite Executive Intelligence Briefing

## Executive Summary
This briefing synthesizes named entities and co-occurrence networks extracted across 5 documents in **Session Alpha**. 

---

## Key Threat Actors & Organizations
- **ACME Corp**: Primary corporate entity involved in data processing contracts in the **Paris Office**.
- **GEODE Research Institute**: Leading geological entity extraction research with **Prof. Henri Laurent** and **sarah@geode.science**.
- **Operation CyberPulse**: Niche topic entity appearing in 2 confidential files with high local TF-IDF salience (0.89).

---

## Topological Network Insights
- **John Doe** acts as a central **Rare Bridge** (Betweenness Score: 0.85, 14 occurrences), connecting ACME Corp directly to the GEODE Research network.
- **sarah@geode.science** exhibited a **Spiking Signal** burst in chronological window 3 (300% surge).
`;

export const AiReportView: React.FC = () => {
  const [provider, setProvider] = useState<'mistral' | 'ollama'>('mistral');
  const [model, setModel] = useState<string>('mistral-large');
  const [perspective, setPerspective] = useState<string>('executive');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SAMPLE_REPORT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">AI Intelligence Reports</h1>
              <p className="text-xs text-slate-400">Generate structured analytical briefings using Mistral AI or Ollama local endpoints</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Connection Setup Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>LLM Connection Setup</span>
              </span>

              <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded border border-slate-800">
                <button
                  onClick={() => setProvider('mistral')}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition-all ${
                    provider === 'mistral' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Mistral AI Cloud
                </button>
                <button
                  onClick={() => setProvider('ollama')}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition-all ${
                    provider === 'ollama' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Ollama (Local)
                </button>
              </div>

              {provider === 'mistral' ? (
                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px]">Mistral API Key (Saved in LocalStorage)</label>
                  <input
                    type="password"
                    placeholder="Enter Mistral API Key..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-slate-400 text-[11px]">Ollama Base URL</label>
                  <input
                    type="text"
                    defaultValue="http://localhost:11434/v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Focus Perspective */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Analytical Perspective Focus
              </span>

              <div className="space-y-1.5">
                {[
                  { id: 'executive', label: 'Executive Summary Briefing' },
                  { id: 'threat', label: 'Threat Actor & Groups Focus' },
                  { id: 'clusters', label: 'Network Clusters & Bridges' },
                  { id: 'temporal', label: 'Temporal Timeline Chronology' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPerspective(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      perspective === p.id
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Markdown Output Viewer (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-800 pb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Generated Markdown Briefing</span>
            </span>

            <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-slate-300 prose-p:text-xs prose-li:text-slate-300 prose-li:text-xs">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {SAMPLE_REPORT}
              </ReactMarkdown>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
