import React, { useState } from 'react';
import { Mail, Search, Paperclip, Calendar, User, Info, FileText, ChevronRight } from 'lucide-react';

interface EmailRecord {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  attachmentsCount: number;
  body: string;
  entities: string[];
}

const SAMPLE_EMAILS: EmailRecord[] = [
  {
    id: '1',
    from: 'sarah@geode.science',
    to: 'john.doe@acme.com',
    subject: 'RE: Geological Entity Graph Ingestion Specification',
    date: '2026-06-14 14:32',
    attachmentsCount: 2,
    body: 'Hello John,\n\nWe have tested spaCy NLP 3.7 extraction on our scanned PDF documents using Tesseract OCR. The results for Paris Office look promising.\n\nBest regards,\nSarah',
    entities: ['Sarah', 'John', 'spaCy NLP', 'Tesseract OCR', 'Paris Office']
  },
  {
    id: '2',
    from: 'henri.laurent@geode.science',
    to: 'all-team@geode.science',
    subject: 'Operation CyberPulse Intelligence Briefing Update',
    date: '2026-06-12 09:15',
    attachmentsCount: 1,
    body: 'Team,\n\nPlease review the intelligence report for Operation CyberPulse. KuzuDB performance metrics show high betweenness centrality for rare bridge nodes.\n\nProf. Henri Laurent',
    entities: ['Operation CyberPulse', 'KuzuDB', 'Prof. Henri Laurent']
  },
  {
    id: '3',
    from: 'alex.vance@acme.com',
    to: 'sarah@geode.science',
    subject: 'Obsidian Vault Export Test',
    date: '2026-06-10 16:45',
    attachmentsCount: 0,
    body: 'Hi Sarah,\n\nThe Obsidian Vault exporter produced clean markdown notes for all entities with co-occurrence tags.\n\nAlex Vance',
    entities: ['Sarah', 'Obsidian Vault', 'Alex Vance']
  }
];

export const EmailView: React.FC = () => {
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(SAMPLE_EMAILS[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEmails = SAMPLE_EMAILS.filter((e) =>
    !searchQuery ||
    e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header Filter Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 font-bold text-slate-200">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span>Email Archives Dashboard</span>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search sender, subject, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="text-slate-400 text-xs">
          Showing {filteredEmails.length} of {SAMPLE_EMAILS.length} email records
        </div>
      </div>

      {/* Main Table + Drawer Grid */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Email Table (Left / Center) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">From / Sender</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Attachments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <tr
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-600/20 text-white font-semibold' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-indigo-300">
                        {email.from}
                      </td>
                      <td className="py-3 px-4">
                        {email.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {email.date}
                      </td>
                      <td className="py-3 px-4">
                        {email.attachmentsCount > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                            <Paperclip className="w-3 h-3 text-indigo-400" />
                            <span>{email.attachmentsCount} files</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Detail Inspector Drawer (Right - 360px) */}
        {selectedEmail && (
          <div className="w-[380px] bg-slate-900 border-l border-slate-800 p-6 space-y-5 overflow-y-auto text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Email Inspector</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white leading-snug">
                {selectedEmail.subject}
              </h3>
              <div className="space-y-1 text-slate-400 font-mono text-[11px]">
                <div><strong className="text-slate-300">From:</strong> {selectedEmail.from}</div>
                <div><strong className="text-slate-300">To:</strong> {selectedEmail.to}</div>
                <div><strong className="text-slate-300">Date:</strong> {selectedEmail.date}</div>
              </div>
            </div>

            {/* Extracted Entities List */}
            <div className="space-y-1.5 pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Extracted Inline Entities ({selectedEmail.entities.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedEmail.entities.map((ent, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                    {ent}
                  </span>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Email Message Body
              </span>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {selectedEmail.body}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
