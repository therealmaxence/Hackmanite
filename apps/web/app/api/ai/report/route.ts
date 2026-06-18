import { NextRequest, NextResponse } from 'next/server';
import { getAiReportData } from '@/lib/api/ai-report-helper';
import { buildPrompt } from '@/lib/api/ai-prompt-builder';
import { executeLlmRequest } from '@/lib/api/llm-client';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      focusType,
      apiProvider = 'mistral',
      apiEndpoint = 'https://api.mistral.ai/v1',
      apiKey,
      model,
      customInstructions,
      language,
      topEntitiesLimit = 30,
      topTfidfLimit = 30,
      bridgesLimit = 10,
      previewOnly = false,
      selectedWeakSignals = [],
    } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const data = await getAiReportData(sessionId);
    const prompt = buildPrompt(
      data,
      focusType,
      customInstructions,
      language,
      topEntitiesLimit,
      topTfidfLimit,
      bridgesLimit,
      selectedWeakSignals
    );

    if (previewOnly) {
      return NextResponse.json({
        prompt,
        charCount: prompt.length,
        estimatedTokens: Math.ceil(prompt.length / 4),
      });
    }

    const resolvedModel = model || (apiProvider === 'mistral' ? 'mistral-large-latest' : 'llama3');
    const systemPrompt = language === 'fr'
      ? 'Vous êtes un analyste d\'élite en cyber-renseignement sur les menaces (Cyber Threat Intelligence) et en OSINT. Rédigez des rapports de renseignement professionnels en utilisant Markdown. Soyez analytique, précis et objectif. Gardez-vous activement du biais de confirmation : n\'inventez pas de connexions, distinguez clairement les faits établis (co-occurrences vérifiées) des hypothèses spéculatives, énoncez explicitement toute incertitude et évitez d\'être trop affirmatif sans preuve textuelle solide. Le rapport DOIT être entièrement rédigé en français.'
      : 'You are an elite cyber threat intelligence and OSINT analyst. Write professional intelligence reports using Markdown. Be analytical, precise, and objective. Actively guard against confirmation bias: do not invent connections, clearly distinguish established facts (verified co-occurrences in the text) from speculative hypotheses, explicitly state any uncertainty, and avoid overconfidence without solid textual evidence. The report MUST be written in English.';

    const reportText = await executeLlmRequest({
      provider: apiProvider,
      endpoint: apiEndpoint,
      apiKey,
      model: resolvedModel,
      systemPrompt,
      userPrompt: prompt,
    });

    return NextResponse.json({ report: reportText });
  } catch (err: any) {
    console.error('AI Report API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

