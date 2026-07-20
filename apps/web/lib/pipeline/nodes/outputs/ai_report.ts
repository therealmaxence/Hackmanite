import { NodeHandler } from '../../executor';
import { buildAiReportDataFromGraph } from '@/lib/api/ai-report-helper';
import { buildPrompt, buildReportSystemPrompt } from '@/lib/api/ai-prompt-builder';
import { executeLlmRequest } from '@/lib/api/llm-client';
import { computeWeakSignals } from '@/lib/pipeline/weakSignals';
import { requireGraphInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { writeFile } from 'fs/promises';

function pickWeakSignals(input: any, config: any) {
  if (Array.isArray(config?.selectedWeakSignals)) return config.selectedWeakSignals;
  const signals = computeWeakSignals(input, config || {});
  const maxPerCategory = Math.max(0, Number(config?.weakSignalsLimit ?? 10) || 0);
  const selected = [];
  if (config?.includeBridgeSignals !== false) selected.push(...signals.bridgeSignals.slice(0, maxPerCategory).map((signal) => ({ ...signal, methodology: 'Bridge' })));
  if (config?.includeNicheSignals !== false) selected.push(...signals.nicheSignals.slice(0, maxPerCategory).map((signal) => ({ ...signal, methodology: 'Niche' })));
  if (config?.includeEmergingSignals !== false) selected.push(...signals.emergingSignals.slice(0, maxPerCategory).map((signal) => ({ ...signal, methodology: 'Emerging' })));
  return selected;
}

export const aiReportOutputHandler: NodeHandler = {
  type: 'output.ai_report',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    await context.log('Transforming graph to AI Analyst data context...');

    const reportData = buildAiReportDataFromGraph(input);
    const language = config?.language || 'en';
    const focusType = config?.focusType || 'general';
    const provider = config?.apiProvider || config?.provider || 'mistral';
    const endpoint = config?.apiEndpoint || config?.endpoint || (provider === 'mistral' ? 'https://api.mistral.ai/v1' : 'http://localhost:11434/v1');
    const model = config?.model || (provider === 'mistral' ? 'mistral-large-latest' : 'llama3');
    const customInstructions = config?.customInstructions ?? config?.directives ?? '';
    const topEntitiesLimit = Math.max(1, Number(config?.topEntitiesLimit ?? 30) || 30);
    const topTfidfLimit = Math.max(1, Number(config?.topTfidfLimit ?? 30) || 30);
    const bridgesLimit = Math.max(1, Number(config?.bridgesLimit ?? 10) || 10);
    const selectedWeakSignals = pickWeakSignals(input, config);

    await context.log(`Generating analyst prompt with focus: ${focusType}`);
    const prompt = buildPrompt(reportData, focusType, customInstructions, language, topEntitiesLimit, topTfidfLimit, bridgesLimit, selectedWeakSignals);

    await context.log(`Sending request to LLM provider "${provider}" using model "${model}"...`);
    const reportText = await executeLlmRequest({
      provider,
      endpoint,
      apiKey: config?.apiKey || config?.api_key || (provider === 'mistral' ? process.env.MISTRAL_API_KEY : undefined),
      model,
      systemPrompt: buildReportSystemPrompt(language),
      userPrompt: prompt,
    });

    await context.log(`AI Intelligence Report generated successfully (${reportText.length} characters).`);
    const fileName = ensureExtension(config?.fileName || `ai_report_${Date.now()}`, '.md');
    const { absolutePath, relativePath } = await resolveExportPath(fileName, config, context);
    await writeFile(absolutePath, reportText);
    await context.log(`Successfully wrote AI report to: ${relativePath}`);
    return buildDownloadResult(fileName, reportText, 'text/markdown; charset=utf-8', relativePath);
  },
};
