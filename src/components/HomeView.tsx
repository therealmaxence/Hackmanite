import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Network, ShieldCheck, FileUp, Sparkles, Database, Mail } from 'lucide-react';

interface FileQueueItem {
  id: string;
  name: string;
  size: string;
  format: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  entitiesCount?: number;
  errorMsg?: string;
}

const INITIAL_QUEUE: FileQueueItem[] = [
  { id: '1', name: 'Investigation_Briefing_Alpha.pdf', size: '2.4 MB', format: 'PDF', status: 'SUCCESS', entitiesCount: 48 },
  { id: '2', name: 'geode_project_comm.eml', size: '340 KB', format: 'EML', status: 'SUCCESS', entitiesCount: 22 },
  { id: '3', name: 'Scanned_Contract_Paris_Office.png', size: '5.1 MB', format: 'PNG (OCR)', status: 'SUCCESS', entitiesCount: 17 },
  { id: '4', name: 'financial_ledger_2026.xlsx', size: '1.2 MB', format: 'XLSX', status: 'PROCESSING' },
  { id: '5', name: 'corrupted_archive_log.rtf', size: '88 KB', format: 'RTF', status: 'FAILED', errorMsg: 'Encoding fallback timeout' },
];

interface HomeViewProps {
  onNavigateToGraph: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigateToGraph }) => {
  const [queue, setQueue] = useState<FileQueueItem[]>(INITIAL_QUEUE);
  const [windowSize, setWindowSize] = useState<number>(400);

  const completedCount = queue.filter((f) => f.status === 'SUCCESS').length;
  const totalEntities = queue.reduce((sum, f) => sum + (f.entitiesCount || 0), 0);

  const handleSimulatedDrop = () => {
    const newFile: FileQueueItem = {
      id: String(Date.now()),
      name: `Uploaded_Document_${queue.length + 1}.docx`,
      size: '1.8 MB',
      format: 'DOCX',
      status: 'SUCCESS',
      entitiesCount: 14,
    };
    setQueue([newFile, ...queue]);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Panel: Hero Overview & Formats (5 Cols) */}
        <div className="lg:col-span-5 p-8 border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between space-y-8">
          
          <div className="space-y-6">
            {/* Title & Description */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
                <Database className="w-3.5 h-3.5" />
                DataLake Entity Graph Explorer
              </div>

              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-snug">
                Extract Named Entities & Map Network Graphs
              </h1>

              <p className="text-sm text-slate-400 leading-relaxed">
                Hackmanite runs 100% locally on your machine to ingest multi-format documents, extract persons, organizations, locations, and emails using spaCy NLP & Tesseract OCR, and build co-occurrence networks in KuzuDB & SQLite.
              </p>
            </div>

            {/* OCR Status Badge */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Tesseract OCR System Active</div>
                  <div className="text-[11px] text-slate-400">Automatic text extraction for scanned PDFs & images</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                Ready
              </span>
            </div>

            {/* Supported File Formats */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Supported Document Formats
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'PDF Documents (.pdf)',
                  'Word (.docx)',
                  'PowerPoint (.pptx)',
                  'Excel (.xlsx)',
                  'Emails (.eml, .pst)',
                  'Images (.png, .jpg)',
                  'Plain Text (.txt, .rtf, .md)',
                ].map((fmt, idx) => (
                  <span key={idx} className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-800/80">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Processed Files</div>
              <div className="text-xl font-bold text-indigo-400 font-mono mt-0.5">{completedCount} / {queue.length}</div>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Extracted Entities</div>
              <div className="text-xl font-bold text-purple-400 font-mono mt-0.5">{totalEntities}</div>
            </div>
          </div>

        </div>

        {/* Right Panel: Central Ingestion Dropzone & Queue (7 Cols) */}
        <div className="lg:col-span-7 p-8 flex flex-col justify-between space-y-6">
          
          {/* Dropzone */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-200">
                Document Ingestion Dropzone
              </span>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>Sentence Window:</span>
                <select
                  value={windowSize}
                  onChange={(e) => setWindowSize(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded text-xs font-mono focus:outline-none"
                >
                  <option value={200}>200 chars</option>
                  <option value={400}>400 chars (default)</option>
                  <option value={800}>800 chars</option>
                </select>
              </div>
            </div>

            <div
              onClick={handleSimulatedDrop}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Drop documents or folders here to extract entities
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Click to browse files or simulate document upload into the extraction queue
              </p>
            </div>
          </div>

          {/* Queue Section */}
          <div className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Background Processing Queue ({queue.length})
              </span>
              
              <button
                onClick={onNavigateToGraph}
                disabled={completedCount === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Network className="w-4 h-4" />
                <span>Explore Network Graph ({completedCount} files ready)</span>
              </button>
            </div>

            {/* Queue Item Rows */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-200">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.size} • {item.format}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.status === 'SUCCESS' && (
                      <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{item.entitiesCount} Entities</span>
                      </span>
                    )}

                    {item.status === 'PROCESSING' && (
                      <span className="flex items-center space-x-1.5 text-amber-400 font-semibold text-[11px]">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing NLP...</span>
                      </span>
                    )}

                    {item.status === 'FAILED' && (
                      <span className="flex items-center space-x-1.5 text-rose-400 font-semibold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{item.errorMsg}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
