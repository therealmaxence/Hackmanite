import { useState, useEffect } from 'react';
import fallbackManifest from '../data/releases.json';

export interface ReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
}

export interface ReleaseData {
  version: string;
  tag: string;
  publishedAt: string;
  htmlUrl: string;
  downloads: {
    winExe: string;
    winZip: string;
    linuxDeb: string;
    linuxAppImage: string;
  };
  assets: ReleaseAsset[];
}

export type DetectedOS = 'windows' | 'linux' | 'mac' | 'unknown';

export function detectUserOS(): DetectedOS {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';
  if (ua.includes('mac')) return 'mac';
  return 'unknown';
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function useReleaseData() {
  const [release, setRelease] = useState<ReleaseData>({
    version: fallbackManifest.version,
    tag: fallbackManifest.tag,
    publishedAt: fallbackManifest.publishedAt,
    htmlUrl: 'https://github.com/therealmaxence/Hackmanite/releases/latest',
    downloads: fallbackManifest.downloads,
    assets: [],
  });
  const [userOS, setUserOS] = useState<DetectedOS>('unknown');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserOS(detectUserOS());

    let isMounted = true;
    async function fetchLatestRelease() {
      try {
        const res = await fetch('https://api.github.com/repos/therealmaxence/Hackmanite/releases/latest');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (isMounted && data && Array.isArray(data.assets)) {
          const assets: ReleaseAsset[] = data.assets.map((a: any) => ({
            name: a.name,
            size: a.size,
            downloadUrl: a.browser_download_url,
          }));

          const winExe = assets.find((a) => a.name.endsWith('.exe'))?.downloadUrl || fallbackManifest.downloads.winExe;
          const winZip = assets.find((a) => a.name.includes('win') && a.name.endsWith('.zip'))?.downloadUrl || fallbackManifest.downloads.winZip;
          const linuxDeb = assets.find((a) => a.name.endsWith('.deb'))?.downloadUrl || fallbackManifest.downloads.linuxDeb;
          const linuxAppImage = assets.find((a) => a.name.endsWith('.AppImage'))?.downloadUrl || fallbackManifest.downloads.linuxAppImage;

          const version = data.tag_name ? data.tag_name.replace(/^v/, '') : fallbackManifest.version;

          setRelease({
            version,
            tag: data.tag_name || fallbackManifest.tag,
            publishedAt: data.published_at || fallbackManifest.publishedAt,
            htmlUrl: data.html_url || 'https://github.com/therealmaxence/Hackmanite/releases/latest',
            downloads: {
              winExe,
              winZip,
              linuxDeb,
              linuxAppImage,
            },
            assets,
          });
        }
      } catch {
        // Fallback already set as initial state
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLatestRelease();
    return () => {
      isMounted = false;
    };
  }, []);

  return { release, userOS, loading };
}
