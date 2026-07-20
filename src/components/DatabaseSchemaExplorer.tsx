import React, { useState } from 'react';
import { Database, Table, Key, Link2, Code, FileCode, CheckCircle, Search, Layers, Server } from 'lucide-react';
import { DB_TABLES, TableDef } from '../data/dbSchemas';

export const DatabaseSchemaExplorer: React.FC = () => {
  const [selectedTableId, setSelectedTableId] = useState<string>(DB_TABLES[0].id);
  const [activeDbType, setActiveDbType] = useState<'All' | 'SQLite (Prisma)' | 'KuzuDB (Graph DB)'>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredTables = DB_TABLES.filter((t) => {
    const matchType = activeDbType === 'All' || t.dbType === activeDbType;
    const matchSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const currentTable = DB_TABLES.find((t) => t.id === selectedTableId) || DB_TABLES[0];

  return (
    <section id="db-schema" className="py-20 bg-gray-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Database className="w-3.5 h-3.5" />
            Dual-Database Engine Specification
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Interactive Database Schema Viewer
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Hackmanite uses a hybrid database strategy: <strong className="text-emerald-300">SQLite (via Prisma)</strong> for relational metadata and <strong className="text-purple-300">KuzuDB</strong> for ultra-fast C++ embedded graph traversals.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 bg-gray-900/80 p-1.5 rounded-xl border border-gray-800">
            {(['All', 'SQLite (Prisma)', 'KuzuDB (Graph DB)'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveDbType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeDbType === type
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table or column..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Table List Sidebar (4 Cols) */}
          <div className="lg:col-span-4 glass-panel p-4 rounded-2xl space-y-2 max-h-[580px] overflow-y-auto">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
              Database Tables & Node Classes ({filteredTables.length})
            </span>

            {filteredTables.map((tbl) => {
              const isSelected = tbl.id === selectedTableId;
              const isKuzu = tbl.dbType.includes('KuzuDB');
              return (
                <div
                  key={tbl.id}
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-gray-900/40 border-gray-800/80 text-gray-300 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <Table className={`w-4 h-4 ${isKuzu ? 'text-purple-400' : 'text-emerald-400'}`} />
                      <span>{tbl.name}</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isKuzu
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {tbl.dbType.split(' ')[0]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-1">
                    {tbl.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Table Detail Inspector (8 Cols) */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-2xl space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-extrabold text-white">
                    {currentTable.name}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-800 text-indigo-300 border border-gray-700">
                    {currentTable.category}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {currentTable.description}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-900 text-xs font-semibold text-gray-300 border border-gray-800 self-start sm:self-auto">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                {currentTable.dbType}
              </span>
            </div>

            {/* Field Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Column & Property Definitions ({currentTable.fields.length})
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/90 text-gray-400 font-semibold border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-3">Field Name</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3">Attributes</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                    {currentTable.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/40">
                        <td className="py-2.5 px-3 font-semibold text-indigo-300">
                          {f.name}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">
                          {f.type}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            {f.isPk && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                PK
                              </span>
                            )}
                            {f.isFk && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded flex items-center gap-0.5">
                                <Link2 className="w-2.5 h-2.5" />
                                FK ({f.refTable})
                              </span>
                            )}
                            {!f.isPk && !f.isFk && (
                              <span className="text-[10px] text-gray-500 font-sans">
                                standard
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 font-sans text-[11px]">
                          {f.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample Query Box */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-400" />
                Sample SQL / Cypher Query
              </h4>
              <div className="bg-[#0b0f19] p-4 rounded-xl border border-gray-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                <pre>{currentTable.sampleQuery}</pre>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
