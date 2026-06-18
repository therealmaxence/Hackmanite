import { NextRequest, NextResponse } from 'next/server';
import { getAiReportData } from '@/lib/api/ai-report-helper';
import { ErrorCodes } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      focusType,
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
      const estimatedTokens = Math.ceil(prompt.length / 4);
      return NextResponse.json({
        prompt,
        charCount: prompt.length,
        estimatedTokens,
      });
    }

    const resolvedApiKey = apiKey || process.env.MISTRAL_API_KEY;
    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: 'Mistral API key is required. Please set it in Settings or the input field.', code: ErrorCodes.VALIDATION_ERROR },
        { status: 400 }
      );
    }

    const mistralModel = model || 'mistral-large-latest';
    const systemPrompt = language === 'fr'
      ? 'Vous êtes un analyste d\'élite en cyber-renseignement sur les menaces (Cyber Threat Intelligence) et en OSINT. Rédigez des rapports de renseignement professionnels en utilisant Markdown. Soyez analytique, précis et objectif. Gardez-vous activement du biais de confirmation : n\'inventez pas de connexions, distinguez clairement les faits établis (co-occurrences vérifiées) des hypothèses spéculatives, énoncez explicitement toute incertitude et évitez d\'être trop affirmatif sans preuve textuelle solide. Le rapport DOIT être entièrement rédigé en français.'
      : 'You are an elite cyber threat intelligence and OSINT analyst. Write professional intelligence reports using Markdown. Be analytical, precise, and objective. Actively guard against confirmation bias: do not invent connections, clearly distinguish established facts (verified co-occurrences in the text) from speculative hypotheses, explicitly state any uncertainty, and avoid overconfidence without solid textual evidence. The report MUST be written in English.';

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

function buildPrompt(
  data: any,
  focusType: string,
  customInstructions?: string,
  language: string = 'en',
  topEntitiesLimit: number = 30,
  topTfidfLimit: number = 30,
  bridgesLimit: number = 10,
  selectedWeakSignals: any[] = []
): string {
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
    .slice(0, topEntitiesLimit)
    .map((te: any) => `- ${te.label} (${te.type}): count ${te.count}`)
    .join('\n');

  const topTfidfText = data.topTfidfEntities
    .slice(0, topTfidfLimit)
    .map((te: any) => `- ${te.label} (${te.type}): TF-IDF ${te.tfidf.toFixed(2)}`)
    .join('\n');

  const bridgesText = data.bridges.length > 0
    ? data.bridges.slice(0, bridgesLimit).map((b: any) => `- ${b.label} (${b.type}): Centrality Score ${b.score.toFixed(4)}`).join('\n')
    : 'No significant bridge entities detected.';

  const weakSignalsText = selectedWeakSignals.length > 0
    ? selectedWeakSignals.map((ws: any) => `- ${ws.label} (${ws.type}): Score ${ws.score.toFixed(3)} [Method: ${ws.methodology}]`).join('\n')
    : 'No weak signals selected.';

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
2. Acteurs Clés, Cibles & Infrastructures (en mettant l'accent sur les nœuds à fort TF-IDF, les nœuds ponts et les signaux faibles sélectionnés)
3. Clusters de Réseau Opérationnels (analyse des co-occurrences et de la manière dont les nœuds connectent les différents groupes)
4. Hypothèses Stratégiques (brève évaluation analytique basée sur ces connexions ; évitez le biais de confirmation et énoncez clairement les incertitudes)
5. Recommandations de Renseignement Actionnables (pistes d'investigation prioritaires, nœuds clés à surveiller)`
    : `Please include:
1. Executive Summary & Core Objective
2. Key Actors, Targets, & Infrastructure (focused on high TF-IDF, bridge nodes, and selected weak signals)
3. Operational Network Clusters (discussing co-occurrences and how nodes connect different groups)
4. Strategic Hypotheses (brief analytical assessment based on these connections; actively guard against confirmation bias and state uncertainties clearly)
5. Actionable Intelligence Recommendations (what to investigate next, which nodes are high priority)`;

  const objectivityGuidelines = isFrench
    ? `=== DIRECTIVES D'OBJECTIVITÉ RIGUREUSES ===
- Ne tirez pas de conclusions définitives si les données ne les prouvent pas directement.
- Distinguez explicitement ce qui est un FAIT (ex. co-occurrence avérée dans un document) d'une HYPOTHÈSE (ex. relation de travail possible).
- Si les signaux faibles sélectionnés suggèrent un lien inhabituel, formulez cela comme une piste d'investigation ("piste potentielle") plutôt que comme une certitude.`
    : `=== RIGOROUS OBJECTIVITY GUIDELINES ===
- Do not draw definitive conclusions if the data does not directly prove them.
- Explicitly distinguish between a FACT (e.g., verified co-occurrence in a document) and a HYPOTHESIS (e.g., possible collaboration).
- If the selected weak signals suggest an unusual linkage, formulate this as a lead for further investigation ("potential lead") rather than a certainty.`;

  return `
Write a detailed Intelligence Report based on this preprocessed entity relationship graph:

Focus Area: ${focusDesc}
${customInstructions ? `Custom Analyst Instructions: ${customInstructions}` : ''}
Output Language: ${isFrench ? 'French (Français)' : 'English'}

${objectivityGuidelines}

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

=== SELECTED WEAK SIGNALS (EMERGING, BRIDGING, AND NICHE RELATIONSHIPS) ===
${weakSignalsText}

=== FREQUENT CO-OCCURRING CATEGORIES ===
${cooccurText}

=== REPORT OUTLINE ===
${outline}

Make it sound highly professional. Use strict markdown headers and lists. The entire report output MUST be in ${isFrench ? 'French (Français)' : 'English'}.
`;
}
