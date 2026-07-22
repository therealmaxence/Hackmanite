import React from 'react';
import { Network, Github, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-950 border-t border-gray-900 py-12 text-xs text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">
                Hackmanite — DataLake Entity Graph Explorer
              </div>
              <p className="text-[11px] text-gray-500">
                Created in collaboration with <a href="https://geode.science/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">GEODE Research Institute</a>.
              </p>
            </div>
          </div>

          {/* Links & License */}
          <div className="flex items-center gap-6">
            <span className="text-[11px] text-gray-500">
              Version 1.0.0 • Open Source
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
};
