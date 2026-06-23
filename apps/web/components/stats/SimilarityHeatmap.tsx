import { getHeatmapColor } from '@/lib/stats-utils';
import { useTranslation } from '@/lib/i18n';

interface SelectedCell {
  fileA: { id: string; name: string };
  fileB: { id: string; name: string };
  similarity: number;
}

interface SimilarityHeatmapProps {
  similarityData: { files: Array<{ id: string; name: string }>; matrix: number[][] };
  selectedCell: SelectedCell | null;
  setSelectedCell: (cell: SelectedCell | null) => void;
}

export default function SimilarityHeatmap({ similarityData, selectedCell, setSelectedCell }: SimilarityHeatmapProps) {
  const { t } = useTranslation();
  return (
    <div className="lg:col-span-2 signature-card flex flex-col justify-between" style={{ padding: '2.5rem', gap: '2.5rem' }}>
      <h3 className="text-sm font-semibold text-white/70">{t('stats.similarity.title')}</h3>
      {similarityData.files.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest">{t('stats.similarity.no_data')}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto custom-scrollbar flex-1 w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="pb-3 pr-4 text-[10px] tracking-wider text-white/35 text-left font-mono min-w-[140px] border-b border-white/10">{t('stats.similarity.document_header')}</th>
                  {similarityData.files.map((file) => (
                    <th key={file.id} className="pb-3 px-3 text-[10px] tracking-wider text-white/35 font-mono text-center max-w-[120px] truncate border-b border-white/10" title={file.name}>
                      {file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {similarityData.files.map((fileA, i) => (
                  <tr key={fileA.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pr-4 text-xs font-semibold text-white/70 truncate max-w-[140px] font-mono" title={fileA.name}>{fileA.name}</td>
                    {similarityData.files.map((fileB, j) => {
                      const similarity = similarityData.matrix[i]?.[j] ?? 0;
                      const isSelected = selectedCell && ((selectedCell.fileA.id === fileA.id && selectedCell.fileB.id === fileB.id) || (selectedCell.fileA.id === fileB.id && selectedCell.fileB.id === fileA.id));
                      return (
                        <td
                          key={fileB.id}
                          onClick={() => setSelectedCell({ fileA, fileB, similarity })}
                          className="p-3 text-center transition-all duration-200 hover:scale-[1.05] hover:brightness-125"
                          style={{
                            backgroundColor: getHeatmapColor(similarity),
                            border: isSelected ? '1px solid #4ca8f0' : '1px solid rgba(255, 255, 255, 0.03)',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 0 8px rgba(76, 168, 240, 0.4)' : 'none',
                          }}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-bold font-mono text-white/95">{(similarity * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedCell ? (
            <div className="p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn" style={{ background: 'rgba(16, 0, 43, 0.4)', border: '1px solid var(--color-border)' }}>
              <div className="space-y-1.5">
                <div className="text-[10px] tracking-widest text-white/35 font-mono">{t('stats.similarity.connection_title')}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-white/90 font-mono bg-white/5 px-2.5 py-1 rounded-sm border border-white/5">{selectedCell.fileA.name}</span>
                  <span className="text-white/35 font-mono text-[10px] tracking-wider px-1">{t('stats.similarity.and')}</span>
                  <span className="font-semibold text-white/90 font-mono bg-white/5 px-2.5 py-1 rounded-sm border border-white/5">{selectedCell.fileB.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
                <div className="text-right">
                  <div className="text-[10px] tracking-widest text-white/35 font-mono">{t('stats.similarity.jaccard')}</div>
                  <div className="text-xl font-bold font-mono text-accent">{(selectedCell.similarity * 100).toFixed(1)}%</div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 hover:border-white/20 rounded-sm text-[10px] text-white/50 hover:text-white/90 transition-all font-mono tracking-wider"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}
                >
                  {t('stats.similarity.btn_clear')}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-sm border border-dashed border-white/10 text-center bg-white/[0.01]">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest leading-relaxed">{t('stats.similarity.inspect_prompt')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

