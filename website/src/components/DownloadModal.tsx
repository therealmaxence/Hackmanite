import React, { useState } from 'react';
import { X, Download, Monitor, Terminal, ExternalLink, Package, FolderArchive, Sparkles } from 'lucide-react';
import { useReleaseData, formatFileSize } from '../utils/useReleaseData';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const { release, userOS } = useReleaseData();
  const [selectedOS, setSelectedOS] = useState<'windows' | 'linux'>(
    userOS === 'linux' ? 'linux' : 'windows'
  );

  if (!isOpen) return null;

  const winExeAsset = release.assets.find((a) => a.name.endsWith('.exe'));
  const winZipAsset = release.assets.find((a) => a.name.includes('win') && a.name.endsWith('.zip'));
  const linuxDebAsset = release.assets.find((a) => a.name.endsWith('.deb'));
  const linuxAppImageAsset = release.assets.find((a) => a.name.endsWith('.AppImage'));

  return (
    <div className="fixed inset-0 z-[999] bg-[#0a090c]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#111014] border border-[#222129] rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 text-[#f0f0f4] my-auto">
        
        <div className="flex items-center justify-between border-b border-[#222129] pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-[#a78bfa]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Download Hackmanite</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#7c3aed]/20 text-[#a78bfa]">
                  {release.tag}
                </span>
              </div>
              <p className="text-xs text-[#80808c]">
                Offline Standalone Entity Graph Explorer for Desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#80808c] hover:text-white hover:bg-[#18171c] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 p-1 bg-[#0a090c] rounded-xl border border-[#18171c]">
          <button
            onClick={() => setSelectedOS('windows')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              selectedOS === 'windows'
                ? 'bg-[#18171c] text-white shadow-sm border border-[#222129]'
                : 'text-[#80808c] hover:text-[#f0f0f4]'
            }`}
          >
            <Monitor className="w-4 h-4 text-[#a78bfa]" />
            <span>Windows (x64)</span>
            {userOS === 'windows' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-[#a78bfa]">
                Detected
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedOS('linux')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              selectedOS === 'linux'
                ? 'bg-[#18171c] text-white shadow-sm border border-[#222129]'
                : 'text-[#80808c] hover:text-[#f0f0f4]'
            }`}
          >
            <Terminal className="w-4 h-4 text-[#a78bfa]" />
            <span>Linux (x64)</span>
            {userOS === 'linux' && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-[#a78bfa]">
                Detected
              </span>
            )}
          </button>
        </div>

        {selectedOS === 'windows' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#18171c] border border-[#222129] flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <Package className="w-4 h-4 text-[#a78bfa]" />
                    <span>Installer Setup</span>
                  </div>
                  <span className="text-[10px] text-[#80808c] font-mono">
                    {winExeAsset ? formatFileSize(winExeAsset.size) : '.exe'}
                  </span>
                </div>
                <p className="text-xs text-[#80808c] leading-relaxed">
                  Recommended for most Windows users. Guided setup with desktop shortcut and automated updates.
                </p>
              </div>
              <a
                href={release.downloads.winExe}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .exe</span>
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#18171c] border border-[#222129] flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <FolderArchive className="w-4 h-4 text-[#a78bfa]" />
                    <span>Portable ZIP</span>
                  </div>
                  <span className="text-[10px] text-[#80808c] font-mono">
                    {winZipAsset ? formatFileSize(winZipAsset.size) : '.zip'}
                  </span>
                </div>
                <p className="text-xs text-[#80808c] leading-relaxed">
                  Extract with 7-Zip and run directly without installing. Includes all Python and Next.js runtimes.
                </p>
              </div>
              <a
                href={release.downloads.winZip}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#222129] hover:bg-[#2a2933] text-[#f0f0f4] font-semibold text-xs border border-[#2e2d38] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .zip</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#18171c] border border-[#222129] flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <Package className="w-4 h-4 text-[#a78bfa]" />
                    <span>Debian / Ubuntu (.deb)</span>
                  </div>
                  <span className="text-[10px] text-[#80808c] font-mono">
                    {linuxDebAsset ? formatFileSize(linuxDebAsset.size) : '.deb'}
                  </span>
                </div>
                <p className="text-xs text-[#80808c] leading-relaxed">
                  Native Debian package. Install via <code className="text-[#a78bfa] font-mono text-[11px]">sudo apt install ./hackmanite-desktop_*.deb</code>.
                </p>
              </div>
              <a
                href={release.downloads.linuxDeb}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .deb</span>
              </a>
            </div>

            <div className="p-4 rounded-xl bg-[#18171c] border border-[#222129] flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                    <Terminal className="w-4 h-4 text-[#a78bfa]" />
                    <span>Standalone AppImage</span>
                  </div>
                  <span className="text-[10px] text-[#80808c] font-mono">
                    {linuxAppImageAsset ? formatFileSize(linuxAppImageAsset.size) : '.AppImage'}
                  </span>
                </div>
                <p className="text-xs text-[#80808c] leading-relaxed">
                  Universal package for all Linux distributions. Run <code className="text-[#a78bfa] font-mono text-[11px]">chmod +x</code> and double-click to launch.
                </p>
              </div>
              <a
                href={release.downloads.linuxAppImage}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#222129] hover:bg-[#2a2933] text-[#f0f0f4] font-semibold text-xs border border-[#2e2d38] transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .AppImage</span>
              </a>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[#222129] flex items-center justify-between text-xs text-[#80808c]">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Built automatically on push via GitHub Actions</span>
          </div>
          <a
            href={release.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-[#a78bfa] hover:underline"
          >
            <span>View Release on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
};
