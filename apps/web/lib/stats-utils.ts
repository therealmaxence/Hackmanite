import { EntityType } from '@/types/entities';

export const formatMimeType = (mime: string): string => {
  if (mime === 'message/rfc822') return 'EML';
  if (mime.includes('ms-outlook') || mime.includes('pst')) return 'PST';
  const part = mime.split('/')[1] || mime;
  if (part.includes('officedocument.wordprocessingml')) return 'DOCX';
  if (part.includes('officedocument.spreadsheetml')) return 'XLSX';
  if (part.includes('officedocument.presentationml')) return 'PPTX';
  return part.toUpperCase();
};

export const getHeatmapColor = (value: number): string => {
  if (value === 0) return 'rgba(255, 255, 255, 0.02)';
  const hue = 230 + value * 150;
  const saturation = 75 + value * 15; // 75% to 90%
  const lightness = 45 + value * 10;   // 45% to 55%
  const alpha = 0.15 + value * 0.65;   // 0.15 to 0.8
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
};

export const formatBytes = (bytes: number, decimals = 1) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const ALL_ENTITY_TYPES: EntityType[] = [
  'PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'PHONE',
  'IP_ADDRESS', 'URL', 'DATE', 'ADDRESS',
];
