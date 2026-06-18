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
      ? 'Vous êtes un analyste expert en exploration de données documentaires et en graphes d\'entités. Votre rôle est de produire des rapports d\'analyse professionnels, neutres et factuels à partir de graphes de co-occurrences d\'entités extraites de documents. Rédigez en Markdown structuré. Soyez analytique, précis et rigoureusement objectif. Ne présupposez jamais que les données sont sensibles, dangereuses ou malveillantes — les documents analysés peuvent être de tout type (académique, professionnel, journalistique, etc.). Distinguez clairement les faits établis (co-occurrences vérifiées dans les textes) des hypothèses ou interprétations. Énoncez explicitement toute incertitude et évitez les conclusions non étayées. Le rapport DOIT être entièrement rédigé en français.'
      : 'You are an expert analyst in document data exploration and entity relationship graphs. Your role is to produce professional, neutral, and factual analysis reports from entity co-occurrence graphs extracted from documents. Write in structured Markdown. Be analytical, precise, and rigorously objective. Never assume the data is sensitive, dangerous, or malicious — the analyzed documents may be of any type (academic, professional, journalistic, corporate, etc.). Clearly distinguish established facts (verified co-occurrences in the texts) from hypotheses or interpretations. Explicitly state any uncertainty and avoid unsupported conclusions. The report MUST be written in English.';

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

