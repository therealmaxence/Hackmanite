import React, { useState } from 'react';
import { DOCS_ITEMS } from '../data/docsContent';
import { DocsViewer } from './DocsViewer';

type TabKey = 'guide' | 'algorithms' | 'filters' | 'weak_signals' | 'pipelines' | 'ai_report' | 'wiki';

interface HackmaniteHelpCenterProps {
  selectedDocId: string;
  setSelectedDocId: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const HackmaniteHelpCenter: React.FC<HackmaniteHelpCenterProps> = ({
  selectedDocId,
  setSelectedDocId,
  activeTab,
  setActiveTab,
}) => {
  const currentDoc = DOCS_ITEMS.find((d) => d.id === selectedDocId) || DOCS_ITEMS[0];

  const helpSections: Record<TabKey, { title: string; desc: string; items: Array<{ title: string; formula?: string; content: string }> }> = {
    guide: {
      title: 'Core Features Guide',
      desc: 'Explore the main modules of Hackmanite designed to help you analyze text documents and extract entities.',
      items: [
        {
          title: 'File Ingestion & Dropzone',
          content: 'Upload plain text, PDFs, Word documents (DOCX), Excel spreadsheets (XLSX), images, emails (EML/PST), and more. Files are queued and processed asynchronously in the background. If an error occurs, you can click "Retry Failed" to re-trigger failed extractions.',
        },
        {
          title: 'Interactive Graph Explorer',
          content: 'Visualize the connections between entities across your documents. Click on a node to see more details, right-click to view options, or hold Control/Command and click multiple nodes to open the Co-occurrence panel.',
        },
        {
          title: 'Co-occurrence Analysis',
          content: 'Select two or more entities using Ctrl+Click to find documents or specific text snippets where they appear together. Switch between "File Co-occurrence" (to view overlapping files) and "Text Co-occurrence" (to view shared text snippets).',
        },
        {
          title: 'Emails Dashboard',
          content: 'Dedicated interface to browse, visualize and filter extracted email data, metadata (From, To, Subject, Date), and find source documents.',
        },
        {
          title: 'Pipeline Builder',
          content: 'Build repeatable analysis workflows from the Custom Analysis menu. Pipelines can load documents, scrape web pages, reuse the active session graph, filter entities, run weak-signal transforms, call an LLM annotation prompt, preview intermediate results, and export or commit the final graph.',
        },
        {
          title: 'Session Export and Graph Import',
          content: 'Save, exchange, or restore graph data from the Graph page:\n\n- **JSON Snapshot**: A complete Hackmanite session backup with entities, files, occurrences, and co-occurrences.\n- **GraphML**: Export or import an interoperable graph file for tools that support GraphML.\n- **Obsidian Vault (ZIP)**: Generates a Markdown knowledge base where every entity and document gets its own linked page.',
        },
      ],
    },
    algorithms: {
      title: 'NLP Extraction & Graph Building',
      desc: 'How text is transformed into semantic nodes and connections.',
      items: [
        {
          title: 'Named Entity Recognition (NER)',
          content: 'Powered by spaCy language models (large models for English, French, and Russian). Text is analyzed using spaCy to locate names of people, locations, organizations, dates, phone numbers, and URLs.',
        },
        {
          title: 'Optical Character Recognition (OCR)',
          content: 'For scanned PDFs or images, Hackmanite routes documents through Tesseract OCR to extract machine-readable text before running spaCy NER.',
        },
        {
          title: 'Network Construction',
          content: 'A node represents an entity. An edge represents a co-occurrence link. If two entities appear within the same sentence or paragraph, an edge is created between them. The weight of the edge corresponds to the distance between the entities in the snippet.',
        },
      ],
    },
    filters: {
      title: 'Filters & Network Metrics',
      desc: 'Control what is visible on the graph using filters.',
      items: [
        {
          title: 'TF-IDF (Term Frequency-Inverse Document Frequency)',
          content: 'Measures how important an entity is to a specific document relative to the entire corpus. Use the TF-IDF slider to filter out less significant nodes.',
        },
        {
          title: 'Degree Centrality',
          content: 'Measures how connected a node is. It is simply the count of unique links (edges) connected to that node. Higher degree centrality highlights key "hubs" in your document set.',
        },
        {
          title: 'Betweenness Centrality',
          content: 'Measures how often a node sits on the shortest path between all other pairs of nodes in the network. Nodes with high betweenness act as bridges between clusters.',
        },
      ],
    },
    weak_signals: {
      title: 'Weak Signals Detection Engine',
      desc: 'Weak signals are early indicators of emerging entities. Hackmanite computes three distinct metrics:',
      items: [
        {
          title: 'Rare Bridges',
          formula: 'Score = Betweenness Centrality / (Total Occurrences + 1)',
          content: 'Identifies entities that have very few occurrences globally but serve as critical topological bridges between different communities in the network. Highlights brokers rather than obvious hubs.',
        },
        {
          title: 'Niche Topics',
          formula: 'Score = Maximum TF-IDF in local occurrences',
          content: 'Detects highly specific topics that appear in at most 2 files. Isolates concentrated local signals that are highly significant inside their specific documents.',
        },
        {
          title: 'Spiking Signals',
          formula: 'Score = Peak Window TF-IDF * Concentration Ratio',
          content: 'Identifies isolated bursts of occurrences in the timeline using a sliding window of 20% (moving in steps of 10%). If at least 60% of occurrences fall inside a window, it is highlighted as an emerging signal.',
        },
      ],
    },
    pipelines: {
      title: 'Pipeline Builder Workflows',
      desc: 'Pipelines let you assemble reusable analysis flows from sources, filters, transformations, previews, and output nodes.',
      items: [
        {
          title: 'Palette & Configuration',
          content: 'The palette groups nodes into Sources, Filters, Transforms, Visualizers, and Outputs. Select any node to edit parameters in the right panel.',
        },
        {
          title: 'Connecting & Moving Nodes',
          content: 'Drag from the right port of one node to another to create a curved edge. Right-click to deactivate or delete nodes.',
        },
        {
          title: 'LLM Annotations & Exports',
          content: 'Use LLM Annotate nodes to run custom AI prompts on entity metadata, and export final graphs to JSON, GraphML, Obsidian, or AI Markdown reports.',
        },
      ],
    },
    ai_report: {
      title: 'LLM Intelligence Report Engine',
      desc: 'How LLMs summarize and generate briefings on your dataset.',
      items: [
        {
          title: 'Context Assembly',
          content: 'Queries session statistics: total files, entity frequencies, high-relevance co-occurrences, and top weak signals.',
        },
        {
          title: 'Factual Prompt Injection',
          content: 'Structured into a clean prompt schema configured to prevent hallucinations and report strictly on factual session data.',
        },
        {
          title: 'LLM Briefing Synthesis',
          content: 'Dispatched to Mistral AI models or local Ollama endpoints to synthesize professional executive intelligence reports.',
        },
      ],
    },
    wiki: {
      title: 'Full Documentation & Wiki Articles',
      desc: 'Browse complete Markdown guides, diagrams, and technical specifications.',
      items: [],
    },
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'guide', label: 'Features Guide' },
    { key: 'algorithms', label: 'Extraction & Graphs' },
    { key: 'filters', label: 'Filters & Centrality' },
    { key: 'weak_signals', label: 'Weak Signals' },
    { key: 'pipelines', label: 'Pipelines' },
    { key: 'ai_report', label: 'LLM Reports' },
    { key: 'wiki', label: 'Full Wiki Articles & Diagrams' },
  ];

  return (
    <div className="min-h-screen bg-[#0a090c] text-[#f0f0f4] flex flex-col font-sans">
      <main className="flex-1 overflow-y-auto">
        <div className="w-full mx-auto flex flex-col gap-8 p-6 md:p-12 max-w-7xl">
          
          {/* Header Title */}
          <header className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Help Center & Documentation
            </h1>
            <p className="text-[#80808c] text-sm md:text-base max-w-3xl">
              Learn how Hackmanite analyzes documents, manages sessions, computes topological metrics, and runs AI intelligence pipelines.
            </p>
          </header>

          {/* Navigation Bar */}
          <div className="flex border-b border-[#18171c] gap-4 overflow-x-auto pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 px-1 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'border-[#7c3aed] text-white font-semibold'
                      : 'border-transparent text-[#80808c] hover:text-[#f0f0f4]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Rendering */}
          {activeTab !== 'wiki' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">{helpSections[activeTab as TabKey].title}</h2>
                <p className="text-xs text-[#80808c] mt-1 max-w-3xl">{helpSections[activeTab as TabKey].desc}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {helpSections[activeTab as TabKey].items.map((item, idx) => (
                  <div
                    key={idx}
                    className="signature-card p-6 rounded-xl bg-[#111014] border-none space-y-3 shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      {item.formula && (
                        <span className="font-mono text-[10px] text-[#a78bfa] bg-[#7c3aed]/10 px-2.5 py-1 rounded w-fit border-none">
                          {item.formula}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#d1d5db] leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Full Wiki Articles & Diagrams Reader */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Article List (4 Cols) */}
              <div className="lg:col-span-4 p-4 rounded-xl bg-[#111014] border-none space-y-2 max-h-[680px] overflow-y-auto shadow-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#80808c] pb-2 border-b border-[#18171c]">
                  Wiki Articles & Diagrams ({DOCS_ITEMS.length})
                </div>

                {DOCS_ITEMS.map((docItem) => {
                  const isSelected = docItem.id === selectedDocId;
                  return (
                    <div
                      key={docItem.id}
                      onClick={() => setSelectedDocId(docItem.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border-none ${
                        isSelected
                          ? 'bg-[#18171c] text-[#a78bfa] font-semibold'
                          : 'bg-[#0a090c] text-[#d1d5db] hover:bg-[#18171c]/60'
                      }`}
                    >
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#18171c] text-[#a78bfa]">
                        {docItem.category}
                      </span>
                      <h4 className="text-xs font-bold text-white mt-1">{docItem.title}</h4>
                      <p className="text-[11px] text-[#80808c] mt-1 line-clamp-2">{docItem.summary}</p>
                    </div>
                  );
                })}
              </div>

              {/* Markdown Viewer (8 Cols) */}
              <div className="lg:col-span-8 p-6 rounded-xl bg-[#111014] border-none shadow-md">
                <DocsViewer doc={currentDoc} onNavigateDoc={setSelectedDocId} />
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};
