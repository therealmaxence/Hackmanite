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
  return `hsla(${230 + value * 150}, ${75 + value * 15}%, ${45 + value * 10}%, ${0.15 + value * 0.65})`;
};

export const formatBytes = (bytes: number, decimals = 1) => {
  if (!bytes) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(decimals < 0 ? 0 : decimals))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

export const ALL_ENTITY_TYPES: EntityType[] = ['PERSON', 'ORGANIZATION', 'LOCATION', 'EMAIL', 'PHONE', 'IP_ADDRESS', 'URL', 'DATE', 'ADDRESS'];
