'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StatsPanelLoaderProps {
  title: string;
  duration?: number; // Simulated duration in ms
}

export default function StatsPanelLoader({ title, duration = 3000 }: StatsPanelLoaderProps) {
  const [progress, setProgress] = useState(0);

  // Smooth progress increment
  useEffect(() => {
    const stepTime = duration / 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, [duration]);

  // Nodes for the pulsing neural graph animation
  const nodes = [
    { id: 1, x: 50, y: 55, color: '#A84CF0' },
    { id: 2, x: 110, y: 35, color: '#4ca8f0' },
    { id: 3, x: 170, y: 75, color: '#4CF0A8' },
    { id: 4, x: 230, y: 45, color: '#F0A84C' },
    { id: 5, x: 90, y: 115, color: '#4ca8f0' },
    { id: 6, x: 150, y: 125, color: '#A84CF0' },
    { id: 7, x: 250, y: 105, color: '#4CF0A8' },
  ];

  const connections = [
    { from: 1, to: 2 },
    { from: 1, to: 5 },
    { from: 2, to: 3 },
    { from: 2, to: 6 },
    { from: 3, to: 4 },
    { from: 3, to: 7 },
    { from: 5, to: 6 },
    { from: 6, to: 7 },
    { from: 6, to: 3 },
    { from: 1, to: 6 }
  ];

  return (
    <div
      className="signature-card relative overflow-hidden flex flex-col justify-between"
      style={{
        minHeight: '380px',
        padding: '2.5rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'radial-gradient(circle at 50% 30%, rgba(16, 0, 43, 0.15) 0%, rgba(10, 12, 16, 0.4) 100%)',
        boxShadow: 'inset 0 0 40px rgba(168, 76, 240, 0.02)',
      }}
    >
      {/* Glow overlays */}
      <div 
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #A84CF0 0%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[-150px] right-[-50px] w-[250px] h-[250px] rounded-full blur-[100px] pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #4CF0A8 0%, transparent 70%)' }}
      />

      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 relative">
            <span className="w-2 h-2 rounded-full bg-accent/40 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-accent relative" />
          </div>
          <span className="text-[10px] font-bold font-mono text-white/80 uppercase tracking-[0.15em] pl-2">
            {title}
          </span>
        </div>
        <div className="text-[9px] font-mono text-white/30 tracking-wider uppercase">
          STATE: <span className="text-accent/90">PROCESSING</span>
        </div>
      </div>

      {/* Animation Section (Neural Graph) */}
      <div className="flex-1 flex items-center justify-center my-6 relative z-10">
        <svg width="300" height="150" className="overflow-visible">
          {/* Render Connections */}
          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.from)!;
            const toNode = nodes.find(n => n.id === conn.to)!;
            return (
              <g key={`conn-${idx}`}>
                <motion.line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1.5"
                />
                {/* Moving signal pulse along connection lines */}
                <motion.circle
                  r="2"
                  fill="#4ca8f0"
                  style={{ filter: 'drop-shadow(0 0 3px #4ca8f0)' }}
                  animate={{
                    cx: [fromNode.x, toNode.x],
                    cy: [fromNode.y, toNode.y],
                  }}
                  transition={{
                    cx: { duration: 1.5 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 1.5 },
                    cy: { duration: 1.5 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 1.5 },
                  }}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => (
            <g key={`node-${node.id}`}>
              {/* Outer pulsing ring */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="10"
                fill="none"
                stroke={node.color}
                strokeWidth="1"
                animate={{
                  r: [8, 14, 8],
                  opacity: [0.1, 0.4, 0.1]
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
              {/* Glow center */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill={node.color}
                style={{ filter: `drop-shadow(0 0 4px ${node.color})` }}
                animate={{
                  scale: [0.9, 1.2, 0.9],
                }}
                transition={{
                  duration: 1.5 + Math.random() * 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </g>
          ))}
        </svg>

        {/* Floating progress text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center bg-base/80 border border-white/[0.04] backdrop-blur-md px-4 py-2.5 rounded-sm shadow-2xl"
          >
            <div className="text-xl font-bold font-mono text-white/95 leading-none tracking-tight">
              {progress}%
            </div>
            <div className="text-[7px] font-mono text-white/40 uppercase tracking-widest mt-1">
              PARSING PIPELINE
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer (Progress Bar only) */}
      <div className="space-y-1.5 w-full z-10">
        <div className="w-full h-[3px] bg-white/[0.04] rounded-full overflow-hidden relative border border-white/[0.02]">
          <motion.div
            className="h-full bg-gradient-to-r from-accent to-[#4CF0A8] rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
