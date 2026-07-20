import React, { useState } from 'react';
import { Database, Table, Search, Server, Layers, FileCode, Link2 } from 'lucide-react';
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
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Dual Database Engine Schema</h1>
              <p className="text-xs text-slate-400">Interactive specification for SQLite (Prisma) metadata and KuzuDB graph node tables</p>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['All', 'SQLite (Prisma)', 'KuzuDB (Graph DB)'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveDbType(type)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  activeDbType === type
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Table List (4 Cols) */}
          <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Tables & Node Models ({filteredTables.length})
              </span>
            </div>

            {filteredTables.map((tbl) => {
              const isSelected = tbl.id === selectedTableId;
              const isKuzu = tbl.dbType.includes('KuzuDB');
              return (
                <div
                  key={tbl.id}
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <Table className={`w-3.5 h-3.5 ${isKuzu ? 'text-purple-400' : 'text-emerald-400'}`} />
                      <span>{tbl.name}</span>
                    </div>
                    <span className="text-[9px] font-sans px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {tbl.dbType.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Details Inspector (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-lg font-bold text-white">{currentTable.name}</span>
                <p className="text-xs text-slate-400 mt-1">{currentTable.description}</p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded bg-slate-950 text-indigo-400 border border-slate-800">
                {currentTable.dbType}
              </span>
            </div>

            {/* Fields Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Fields & Properties</span>
              </span>

              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Field Name</th>
                      <th className="py-2.5 px-3">Data Type</th>
                      <th className="py-2.5 px-3">Attributes</th>
                      <th className="py-2.5 px-3 font-sans">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {currentTable.fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-indigo-300">{f.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{f.type}</td>
                        <td className="py-2.5 px-3">
                          {f.isPk && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">PK</span>}
                          {f.isFk && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded ml-1">FK</span>}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-300 text-[11px]">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample Query */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Sample Query</span>
              </span>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                <pre>{currentTable.sampleQuery}</pre>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
