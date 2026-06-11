import { NextRequest, NextResponse } from 'next/server';
import { getAiReportData } from '@/lib/api/ai-report-helper';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, focusType, apiKey, model, customInstructions, language } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const resolvedApiKey = apiKey || process.env.MISTRAL_API_KEY;
    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: 'Mistral API key is required. Please set it in Settings or the input field.', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const data = await getAiReportData(sessionId);
    const prompt = buildPrompt(data, focusType, customInstructions, language);

    const mistralModel = model || 'mistral-large-latest';
    const systemPrompt = language === 'fr'
      ? 'Vous êtes un analyste d\'élite en cyber-renseignement sur les menaces (Cyber Threat Intelligence) et en OSINT. Rédigez des rapports de renseignement professionnels en utilisant Markdown. Soyez analytique, précis et objectif. Évitez les formules d\'introduction inutiles et allez directement aux conclusions. Le rapport DOIT être entièrement rédigé en français.'
      : 'You are an elite cyber threat intelligence and OSINT analyst. Write professional intelligence reports using Markdown. Be analytical, precise, and objective. Avoid introductory fluff and dive straight into the findings. The report MUST be written in English.';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${resolvedApiKey}`,
      },
      body: JSON.stringify({
        model: mistralModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Mistral API error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to generate report from Mistral API', code: ErrorCodes.INTERNAL_ERROR },
        { status: response.status }
      );
    }

    const result = await response.json();
    const reportText = result.choices?.[0]?.message?.content || 'No content generated.';

    return NextResponse.json({ report: reportText });
  } catch (err: any) {
    console.error('AI Report API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

function buildPrompt(data: any, focusType: string, customInstructions?: string, language: string = 'en'): string {
  const isFrench = language === 'fr';

  const generalText = `
- Files Analyzed: ${data.general.totalFiles}
- Total Size: ${(data.general.totalSize / 1024).toFixed(2)} KB
- Total Unique Entities: ${data.general.totalEntities}
- Total Entity Occurrences: ${data.general.totalOccurrences}
`;

  const fileTypesText = data.fileTypes.map((ft: any) => `- ${ft.mimeType}: ${ft.count}`).join('\n');
  const entityTypesText = data.entityTypes.map((et: any) => `- ${et.type}: ${et.count}`).join('\n');
  
  const topEntitiesText = data.topEntities
    .slice(0, 30)
    .map((te: any) => `- ${te.label} (${te.type}): count ${te.count}`)
    .join('\n');

  const topTfidfText = data.topTfidfEntities
    .slice(0, 30)
    .map((te: any) => `- ${te.label} (${te.type}): TF-IDF ${te.tfidf.toFixed(2)}`)
    .join('\n');

  const bridgesText = data.bridges.length > 0
    ? data.bridges.map((b: any) => `- ${b.label} (${b.type}): Centrality Score ${b.score.toFixed(4)}`).join('\n')
    : 'No significant bridge entities detected.';

  const cooccurText = data.cooccurrences.map((co: any) => `- ${co.typeA} <=> ${co.typeB}: count ${co.count}`).join('\n');

  let focusDesc = '';
  if (isFrench) {
    if (focusType === 'threats') {
      focusDesc = 'Focus sur les Acteurs de Menace & Identifiants Critiques (Mettre en évidence les entités PERSON, ORG, EMAIL, IP_ADDRESS et les nœuds de communication/infrastructure de haute importance).';
    } else if (focusType === 'networks') {
      focusDesc = 'Focus sur les Liaisons & Groupes de Réseau (Mettre en évidence les ponts structurels, les co-occurrences et les clusters topologiques).';
    } else if (focusType === 'timeline') {
      focusDesc = 'Focus sur la Chronologie Temporelle & Opérationnelle (Synthétiser les dates, les pics d\'activité et les séquences opérationnelles).';
    } else {
      focusDesc = 'Synthèse de Renseignement Exécutive (Analyse complète de l\'ensemble des données).';
    }
  } else {
    if (focusType === 'threats') {
      focusDesc = 'Threat Actor & Critical Identifiers Focus (Highlight PERSON, ORG, EMAIL, IP_ADDRESS, and high-importance communication/infrastructure nodes).';
    } else if (focusType === 'networks') {
      focusDesc = 'Linkage & Network Cluster Focus (Focus on structural bridges, co-occurrences, and topological clusters).';
    } else if (focusType === 'timeline') {
      focusDesc = 'Temporal & Operational Timeline Focus (Synthesize dates, activity peaks, and operational sequences).';
    } else {
      focusDesc = 'Executive Intelligence Briefing (Comprehensive analysis of the entire dataset).';
    }
  }

  const outline = isFrench
    ? `Veuillez inclure les sections suivantes rédigées en français :
1. Synthèse Executive & Objectif Principal
2. Acteurs Clés, Cibles & Infrastructures (en mettant l'accent sur les nœuds à fort TF-IDF et les nœuds ponts)
3. Clusters de Réseau Opérationnels (analyse des co-occurrences et de la manière dont les nœuds de pont connectent les différents groupes)
4. Hypothèses Stratégiques (brève évaluation analytique basée sur ces connexions)
5. Recommandations de Renseignement Actionnables (pistes d'investigation prioritaires, nœuds clés à surveiller)`
    : `Please include:
1. Executive Summary & Core Objective
2. Key Actors, Targets, & Infrastructure (focused on high TF-IDF and bridge nodes)
3. Operational Network Clusters (discussing co-occurrences and how bridge nodes connect different groups)
4. Strategic Hypotheses (brief analytical assessment based on these connections)
5. Actionable Intelligence Recommendations (what to investigate next, which nodes are high priority)`;

  return `
Write a detailed Intelligence Report based on this preprocessed entity relationship graph:

Focus Area: ${focusDesc}
${customInstructions ? `Custom Analyst Instructions: ${customInstructions}` : ''}
Output Language: ${isFrench ? 'French (Français)' : 'English'}

=== DATASET METRICS ===
${generalText}

=== INGESTED FILE TYPES ===
${fileTypesText}

=== ENTITY TYPES DISTRIBUTION ===
${entityTypesText}

=== TOP ENTITIES BY FREQUENCY ===
${topEntitiesText}

=== TOP ENTITIES BY TF-IDF IMPORTANCE (SALIENT ENTITIES) ===
${topTfidfText}

=== CRITICAL BRIDGING NODES (BETWEENNESS CENTRALITY) ===
${bridgesText}

=== FREQUENT CO-OCCURRING CATEGORIES ===
${cooccurText}

=== REPORT OUTLINE ===
${outline}

Make it sound highly professional. Use strict markdown headers and lists. The entire report output MUST be in ${isFrench ? 'French (Français)' : 'English'}.
`;
}
