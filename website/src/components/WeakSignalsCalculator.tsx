import React, { useState } from 'react';
import { Cpu, Sparkles, Sliders, Calculator, Zap, Flame, Link, Activity } from 'lucide-react';

export const WeakSignalsCalculator: React.FC = () => {
  // Rare Bridge state
  const [betweenness, setBetweenness] = useState<number>(0.85);
  const [occurrences, setOccurrences] = useState<number>(3);

  // Niche Topic state
  const [localTfidf, setLocalTfidf] = useState<number>(0.91);
  const [fileCount, setFileCount] = useState<number>(2);

  // Spiking Signal state
  const [peakWindowTfidf, setPeakWindowTfidf] = useState<number>(0.88);
  const [concentrationRatio, setConcentrationRatio] = useState<number>(0.75);

  // Math Calculations
  const rareBridgeScore = betweenness / (occurrences + 1);
  const isRareBridgePassed = rareBridgeScore > 0.15;

  const isNicheTopicPassed = fileCount <= 2 && localTfidf >= 0.7;
  const nicheScore = localTfidf;

  const spikingScore = peakWindowTfidf * concentrationRatio;
  const isSpikingPassed = concentrationRatio >= 0.6 && spikingScore >= 0.45;

  return (
    <section id="weak-signals" className="py-20 bg-gray-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            Intelligence Mathematical Indicators
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Weak Signals Discovery Engine
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            In intelligence investigations, high-visibility hubs are not always critical. Hackmanite uses 3 formulas to mathematically locate structural brokers, localized topics, and temporal bursts.
          </p>
        </div>

        {/* 3 Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Rare Bridges */}
          <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Rare Bridges</h3>
                    <p className="text-[11px] text-gray-400">Structural Brokers</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Topology
                </span>
              </div>

              {/* Math Formula Card */}
              <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800 text-center font-mono text-xs text-purple-300">
                Score = Betweenness / (Occurrences + 1)
              </div>

              {/* Interactive Sliders */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Betweenness Centrality:</span>
                    <span className="font-semibold text-purple-400">{betweenness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={betweenness}
                    onChange={(e) => setBetweenness(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Total Occurrences:</span>
                    <span className="font-semibold text-purple-400">{occurrences}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={occurrences}
                    onChange={(e) => setOccurrences(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Output Score */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Computed Score</div>
                <div className="text-xl font-extrabold text-purple-300 font-mono">
                  {rareBridgeScore.toFixed(3)}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isRareBridgePassed
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 weak-signal-pulse'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {isRareBridgePassed ? 'Broker Flagged' : 'Below Cutoff'}
              </span>
            </div>
          </div>

          {/* 2. Niche Topics */}
          <div className="glass-panel p-6 rounded-2xl border border-pink-500/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Niche Topics</h3>
                    <p className="text-[11px] text-gray-400">Localized Salience</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  TF-IDF
                </span>
              </div>

              {/* Math Formula Card */}
              <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800 text-center font-mono text-xs text-pink-300">
                Score = Max(Local TF-IDF) [Max 2 Files]
              </div>

              {/* Interactive Sliders */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Local TF-IDF Score:</span>
                    <span className="font-semibold text-pink-400">{localTfidf.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localTfidf}
                    onChange={(e) => setLocalTfidf(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Discovered in File Count:</span>
                    <span className="font-semibold text-pink-400">{fileCount} files</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={fileCount}
                    onChange={(e) => setFileCount(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Output Score */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Computed Score</div>
                <div className="text-xl font-extrabold text-pink-300 font-mono">
                  {nicheScore.toFixed(3)}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isNicheTopicPassed
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 weak-signal-pulse'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {isNicheTopicPassed ? 'Niche Flagged' : 'Not Localized'}
              </span>
            </div>
          </div>

          {/* 3. Spiking Signals */}
          <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Spiking Signals</h3>
                    <p className="text-[11px] text-gray-400">Temporal Burst Activity</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Temporal
                </span>
              </div>

              {/* Math Formula Card */}
              <div className="bg-[#0b0f19] p-3 rounded-xl border border-gray-800 text-center font-mono text-xs text-rose-300">
                Score = Peak Window TF-IDF × Concentration
              </div>

              {/* Interactive Sliders */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Peak Window TF-IDF:</span>
                    <span className="font-semibold text-rose-400">{peakWindowTfidf.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={peakWindowTfidf}
                    onChange={(e) => setPeakWindowTfidf(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Timeline Window Concentration:</span>
                    <span className="font-semibold text-rose-400">{(concentrationRatio * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={concentrationRatio}
                    onChange={(e) => setConcentrationRatio(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Output Score */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">Computed Score</div>
                <div className="text-xl font-extrabold text-rose-300 font-mono">
                  {spikingScore.toFixed(3)}
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isSpikingPassed
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 weak-signal-pulse'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {isSpikingPassed ? 'Burst Flagged' : 'Steady Activity'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
