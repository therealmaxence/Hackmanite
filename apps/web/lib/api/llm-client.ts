export interface LlmRequestOptions {
  provider: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export async function executeLlmRequest(options: LlmRequestOptions): Promise<string> {
  const { provider, endpoint, apiKey, model, systemPrompt, userPrompt, temperature = 0.2 } = options;

  const resolvedApiKey = apiKey || (provider === 'mistral' ? process.env.MISTRAL_API_KEY : undefined);
  const resolvedEndpoint = endpoint ? endpoint.replace(/\/$/, '') : 'https://api.mistral.ai/v1';

  const finalUrl = resolvedEndpoint.endsWith('/chat/completions')
    ? resolvedEndpoint
    : `${resolvedEndpoint}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (resolvedApiKey) {
    headers['Authorization'] = `Bearer ${resolvedApiKey}`;
  }

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.statusText || response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || 'No content generated.';
}
