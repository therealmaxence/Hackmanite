export function buildPrompt(
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

  const tfidfSlice = data.topTfidfEntities.slice(0, topTfidfLimit);
  const tfidfMin = tfidfSlice.length > 0 ? Math.min(...tfidfSlice.map((t: any) => t.tfidf)).toFixed(2) : '—';
  const tfidfMax = tfidfSlice.length > 0 ? Math.max(...tfidfSlice.map((t: any) => t.tfidf)).toFixed(2) : '—';
  const topTfidfText = tfidfSlice
    .map((te: any) => `- ${te.label} (${te.type}): TF-IDF ${te.tfidf.toFixed(2)}`)
    .join('\n');

  const bridgesSlice = data.bridges.slice(0, bridgesLimit);
  const bridgeMin = bridgesSlice.length > 0 ? Math.min(...bridgesSlice.map((b: any) => b.score)).toFixed(4) : '—';
  const bridgeMax = bridgesSlice.length > 0 ? Math.max(...bridgesSlice.map((b: any) => b.score)).toFixed(4) : '—';
  const bridgesText = bridgesSlice.length > 0
    ? bridgesSlice.map((b: any) => `- ${b.label} (${b.type}): Centrality Score ${b.score.toFixed(4)}`).join('\n')
    : 'No significant bridge entities detected.';

  const weakSignalNote = isFrench
    ? `Note : les signaux faibles sont des entités statistiquement rares ou structurellement atypiques dans le corpus. Ils ne sont pas intrinsèquement suspects — ils sont simplement remarquables d'un point de vue topologique ou statistique. Les méthodes sont : "bridging" (pont structurel rare), "niche" (entité très locale à fort TF-IDF), "emerging" (entité apparaissant principalement dans les documents récents).`
    : `Note: weak signals are statistically rare or structurally atypical entities in the corpus. They are not inherently suspicious — they are simply noteworthy from a graph topology or statistical standpoint. Methods: "bridging" (rare structural bridge), "niche" (highly localized entity with high TF-IDF), "emerging" (entity appearing predominantly in recent documents).`;

  const weakSignalsText = selectedWeakSignals.length > 0
    ? `${weakSignalNote}\n${selectedWeakSignals.map((ws: any) => `- ${ws.label} (${ws.type}): Score ${ws.score.toFixed(3)} [Method: ${ws.methodology}]`).join('\n')}`
    : (isFrench ? 'Aucun signal faible sélectionné.' : 'No weak signals selected.');

  const cooccurText = data.cooccurrences.map((co: any) => `- ${co.typeA} <=> ${co.typeB}: count ${co.count}`).join('\n');

  let focusDesc = '';
  if (isFrench) {
    if (focusType === 'actors') {
      focusDesc = 'Focus sur les Acteurs & Identifiants Clés (mettre en évidence les entités PERSON, ORG, EMAIL, IP_ADDRESS et les nœuds de communication/infrastructure les plus saillants).';
    } else if (focusType === 'networks') {
      focusDesc = 'Focus sur les Liaisons & Clusters (mettre en évidence les nœuds structurels centraux, les co-occurrences fréquentes et les groupes topologiques).';
    } else if (focusType === 'timeline') {
      focusDesc = 'Focus sur la Chronologie (synthétiser les dates, les périodes d\'activité et les séquences temporelles).';
    } else {
      focusDesc = 'Analyse Générale (vue d\'ensemble complète des entités, relations et tendances du corpus).';
    }
  } else {
    if (focusType === 'actors') {
      focusDesc = 'Key Actors & Identifiers Focus (highlight PERSON, ORG, EMAIL, IP_ADDRESS, and the most salient communication/infrastructure nodes).';
    } else if (focusType === 'networks') {
      focusDesc = 'Linkage & Cluster Focus (highlight central structural nodes, frequent co-occurrences, and topological groups).';
    } else if (focusType === 'timeline') {
      focusDesc = 'Timeline Focus (synthesize dates, activity periods, and temporal sequences).';
    } else {
      focusDesc = 'General Analysis (comprehensive overview of entities, relationships, and trends across the corpus).';
    }
  }

  const outline = isFrench
    ? `Veuillez inclure les sections suivantes rédigées en français :
1. Synthèse Générale (vue d'ensemble du corpus et des entités principales)
2. Entités & Acteurs Principaux (focus sur les entités à fort TF-IDF, les nœuds centraux et les signaux faibles sélectionnés)
3. Relations & Clusters (analyse des co-occurrences et des groupes d'entités liées)
4. Observations & Tendances (interprétations analytiques basées sur les connexions ; distinguez clairement faits et suppositions)
5. Pistes d'Approfondissement (thèmes ou entités qui méritent une investigation complémentaire)`
    : `Please include:
1. General Summary (overview of the corpus and main entities)
2. Key Entities & Actors (focused on high TF-IDF, central bridge nodes, and selected weak signals)
3. Relationships & Clusters (discussing co-occurrences and groups of related entities)
4. Observations & Trends (analytical interpretations based on the connections; clearly separate facts from assumptions)
5. Areas for Further Investigation (themes or entities that warrant deeper exploration)`;

  const objectivityGuidelines = isFrench
    ? `=== DIRECTIVES D'OBJECTIVITÉ ===
- Ne présupposez pas que les données sont sensibles, secrètes ou malveillantes.
- Distinguez explicitement ce qui est un FAIT (co-occurrence avérée dans un document) d'une INTERPRÉTATION (relation supposée).
- Si les signaux faibles sélectionnés suggèrent un lien inhabituel, formulez cela comme une piste d'investigation plutôt que comme une certitude.
- Adaptez le ton à ce que les données montrent réellement — le corpus peut être de nature académique, professionnelle, journalistique ou autre.`
    : `=== OBJECTIVITY GUIDELINES ===
- Do not presuppose the data is sensitive, secret, or malicious.
- Explicitly distinguish between a FACT (verified co-occurrence in a document) and an INTERPRETATION (inferred relationship).
- If selected weak signals suggest an unusual linkage, frame it as a lead for further investigation rather than a certainty.
- Adapt the tone to what the data actually shows — the corpus may be academic, professional, journalistic, or any other nature.`;

  const audience = isFrench
    ? 'Public cible : professionnels généralistes (managers, chercheurs, analystes). Évitez le jargon technique excessif ; utilisez un langage clair et précis.'
    : 'Intended audience: general professionals (managers, researchers, analysts). Avoid excessive technical jargon; use clear and precise language.';

  return `
Write a detailed Analysis Report based on this preprocessed entity relationship graph extracted from a document corpus:

Focus Area: ${focusDesc}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}
Output Language: ${isFrench ? 'French (Français)' : 'English'}
${audience}

=== DATASET METRICS ===
${generalText}

=== INGESTED FILE TYPES ===
${fileTypesText}

=== ENTITY TYPES DISTRIBUTION ===
${entityTypesText}

=== TOP ENTITIES BY FREQUENCY ===
${topEntitiesText}

=== TOP ENTITIES BY TF-IDF IMPORTANCE (SALIENT ENTITIES) ===
(TF-IDF range in this corpus: ${tfidfMin} – ${tfidfMax}. Higher values indicate entities that are locally prominent but rare globally.)
${topTfidfText}

=== CENTRAL BRIDGING NODES (BETWEENNESS CENTRALITY) ===
(Centrality score range: ${bridgeMin} – ${bridgeMax}. Higher scores indicate entities connecting otherwise separate groups.)
${bridgesText}

=== SELECTED WEAK SIGNALS (EMERGING, BRIDGING, AND NICHE ENTITIES) ===
${weakSignalsText}

=== FREQUENT CO-OCCURRING CATEGORIES ===
${cooccurText}

${objectivityGuidelines}

=== REPORT OUTLINE ===
${outline}

Write in clear, precise, professional language. Avoid jargon when plain language suffices. Use strict markdown headers and lists. The entire report output MUST be in ${isFrench ? 'French (Français)' : 'English'}.
`;
}
