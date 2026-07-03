import { NodeHandler } from '../../executor';
import { buildAiReportDataFromGraph } from '@/lib/api/ai-report-helper';
import { buildPrompt } from '@/lib/api/ai-prompt-builder';
import { executeLlmRequest } from '@/lib/api/llm-client';
import { requireGraphInput } from '../shared';

export const aiReportOutputHandler: NodeHandler = {
  type: 'output.ai_report',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    await context.log('Transforming graph to AI Analyst data context...');
    const reportData = buildAiReportDataFromGraph(input);
    const focusType = config?.focusType || 'executive_summary';
    const directives = config?.directives || '';
    const provider = config?.provider || 'mistral';
    const endpoint = config?.endpoint || (provider === 'mistral' ? 'https://api.mistral.ai/v1' : 'http://localhost:11434/v1');
    const model = config?.model || (provider === 'mistral' ? 'mistral-large-latest' : 'llama3');

    await context.log(`Generating analyst prompt with focus: ${focusType}`);
    const prompt = buildPrompt(reportData, focusType, directives, 'en');

    await context.log(`Sending request to LLM provider "${provider}" using model "${model}"...`);
    const reportText = await executeLlmRequest({
      provider,
      endpoint,
      apiKey: provider === 'mistral' ? process.env.MISTRAL_API_KEY : undefined,
      model,
      systemPrompt: 'You are an expert analyst in document data exploration and entity relationship graphs. Write in structured Markdown.',
      userPrompt: prompt,
    });

    await context.log(`AI Intelligence Report generated successfully (${reportText.length} characters).`);
    return { type: 'tabular' as const, data: [{ report: reportText }] };
  },
};
