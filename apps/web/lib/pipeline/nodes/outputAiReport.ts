import { NodeHandler } from '../executor';
import { buildAiReportDataFromGraph } from '../aiReportHelper';
import { buildPrompt } from '@/lib/api/ai-prompt-builder';
import { executeLlmRequest } from '@/lib/api/llm-client';

export const handler: NodeHandler = {
  type: 'output.ai_report',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    await context.log('Transforming graph to AI Analyst data context...');
    const reportData = buildAiReportDataFromGraph(input);

    const focusType = config?.focusType || 'executive_summary';
    const directives = config?.directives || '';
    const provider = config?.provider || 'mistral';
    const endpoint = provider === 'mistral' ? 'https://api.mistral.ai/v1' : 'http://localhost:11434/v1';
    const model = config?.model || (provider === 'mistral' ? 'mistral-large-latest' : 'llama3');

    await context.log(`Generating analyst prompt with focus: ${focusType}`);
    const prompt = buildPrompt(reportData, focusType, directives, 'en');

    await context.log(`Sending request to LLM provider "${provider}" using model "${model}"...`);
    const systemPrompt = 'You are an expert analyst in document data exploration and entity relationship graphs. Write in structured Markdown.';

    const reportText = await executeLlmRequest({
      provider,
      endpoint,
      apiKey: provider === 'mistral' ? process.env.MISTRAL_API_KEY : undefined,
      model,
      systemPrompt,
      userPrompt: prompt,
    });

    await context.log(`AI Intelligence Report generated successfully (${reportText.length} characters).`);

    return {
      type: 'tabular',
      data: [{ report: reportText }],
    };
  },
};
