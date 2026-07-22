import React, { useState } from 'react';
import { HackmaniteHeader } from './components/HackmaniteHeader';
import { HackmaniteHelpCenter } from './components/HackmaniteHelpCenter';

export const App: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>('readme');
  const [activeTab, setActiveTab] = useState<string>('guide');

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Official Hackmanite Header Bar */}
      <HackmaniteHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDocId={selectedDocId}
        setSelectedDocId={(id) => {
          setSelectedDocId(id);
          setActiveTab('wiki');
        }}
      />

      {/* Official Hackmanite Help Center & Wiki Reader */}
      <HackmaniteHelpCenter
        selectedDocId={selectedDocId}
        setSelectedDocId={setSelectedDocId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};

export default App;
