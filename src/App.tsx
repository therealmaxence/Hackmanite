import React, { useState } from 'react';
import { DocsHeader } from './components/DocsHeader';
import { DocsSidebar } from './components/DocsSidebar';
import { DocsViewer } from './components/DocsViewer';
import { TableOfContents } from './components/TableOfContents';
import { DOCS_ITEMS } from './data/docsContent';

export const App: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>('readme');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentDoc = DOCS_ITEMS.find((d) => d.id === selectedDocId) || DOCS_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Docs Header */}
      <DocsHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDocId={selectedDocId}
        setSelectedDocId={setSelectedDocId}
      />

      {/* Main Interactive Docs Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Tree */}
        <DocsSidebar
          selectedDocId={selectedDocId}
          setSelectedDocId={setSelectedDocId}
          searchQuery={searchQuery}
        />

        {/* Center Markdown Reader */}
        <DocsViewer
          doc={currentDoc}
          onNavigateDoc={setSelectedDocId}
        />

        {/* Right On-Page Table of Contents */}
        <TableOfContents
          content={currentDoc.content}
        />
      </div>
    </div>
  );
};

export default App;
