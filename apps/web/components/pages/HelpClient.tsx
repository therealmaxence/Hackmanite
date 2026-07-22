'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

type TabKey = 'guide' | 'algorithms' | 'filters' | 'weak_signals' | 'pipelines' | 'ai_report';

const HELP_TRANSLATIONS = {
  en: {
    title: 'Help Center',
    subtitle: 'Learn how Hackmanite analyzes documents, manages sessions, and computes metrics.',
    tabs: {
      guide: 'Features Guide',
      algorithms: 'Extraction & Graphs',
      filters: 'Filters & Centrality',
      weak_signals: 'Weak Signals',
      pipelines: 'Pipelines',
      ai_report: 'LLM Reports',
    },
    sections: {
      guide: {
        title: 'Core Features Guide',
        desc: 'Explore the main modules of Hackmanite designed to help you analyze text documents and extract entities.',
        items: [
          {
            title: 'File Ingestion & Dropzone',
            content: 'Upload plain text, PDFs, Word documents (DOCX), Excel spreadsheets (XLSX), images, emails (EML/PST), and more. Files are queued and processed asynchronously in the background. If an error occurs, you can click "Retry Failed" to re-trigger failed extractions.',
          },
          {
            title: 'Interactive Graph Explorer',
            content: 'Visualize the connections between entities across your documents. Click on a node to see more details, right-click to view options, or hold Control/Command and click multiple nodes to open the Co-occurrence panel.',
          },
          {
            title: 'Co-occurrence Analysis',
            content: 'Select two or more entities using Ctrl+Click to find documents or specific text snippets where they appear together. Switch between "File Co-occurrence" (to view overlapping files) and "Text Co-occurrence" (to view shared text snippets).',
          },
          {
            title: 'Emails Dashboard',
            content: 'Dedicated interface to browse, visualize and filter extracted email data, metadata (From, To, Subject, Date), and find source documents.',
          },
          {
            title: 'Pipeline Builder',
            content: 'Build repeatable analysis workflows from the Custom Analysis menu. Pipelines can load documents, scrape web pages, reuse the active session graph, filter entities, run weak-signal transforms, call an LLM annotation prompt, preview intermediate results, and export or commit the final graph.',
          },
          {
            title: 'Session Export and Graph Import',
            content: 'Save, exchange, or restore graph data from the Graph page:\n\n- **JSON Snapshot**: A complete Hackmanite session backup with entities, files, occurrences, and co-occurrences. Re-import it when you need the richest session restore.\n- **GraphML**: Export or import an interoperable graph file for tools that support GraphML. Imported GraphML creates a graph session with synthetic file occurrences when the source file has no Hackmanite-specific metadata.\n- **Obsidian Vault (ZIP)**: Generates a Markdown knowledge base where every entity and document gets its own linked page.',
          },
        ]
      },
      algorithms: {
        title: 'NLP Extraction & Graph Building',
        desc: 'How text is transformed into semantic nodes and connections.',
        items: [
          {
            title: 'Named Entity Recognition (NER)',
            content: 'Powered by spaCy language models (large models for English, French, and Russian). Text is analyzed using spaCy to locate names of people, locations, organizations, dates, phone numbers, and URLs.',
          },
          {
            title: 'Optical Character Recognition (OCR)',
            content: 'For scanned PDFs or images, Hackmanite routes documents through Tesseract OCR to extract machine-readable text before running spaCy NER.\n\n**To enable OCR, you must install Tesseract OCR on your machine:**\n- **Windows:** Download the installer from the official repository (https://github.com/UB-Mannheim/tesseract/wiki) or install it via winget: \n  `winget install UB-Mannheim.TesseractOCR`\n- **Mac:** Run `brew install tesseract` in your terminal.\n- **Linux:** Run `sudo apt install tesseract-ocr` in your terminal.',
          },
          {
            title: 'Network Construction',
            content: 'A node represents an entity. An edge represents a co-occurrence link. If two entities appear within the same sentence or paragraph, an edge is created between them. The weight of the edge corresponds to the distance between the entities in the snippet.',
          },
        ]
      },
      filters: {
        title: 'Filters & Network Metrics',
        desc: 'Control what is visible on the graph using filters.',
        items: [
          {
            title: 'TF-IDF (Term Frequency-Inverse Document Frequency)',
            content: 'Measures how important an entity is to a specific document relative to the entire corpus. If an entity appears frequently in one file but rarely in others, its TF-IDF score is high. Common/generic words get low scores. Use the TF-IDF slider to filter out less significant nodes.',
          },
          {
            title: 'Degree Centrality',
            content: 'Measures how connected a node is. It is simply the count of unique links (edges) connected to that node. Higher degree centrality highlights key "hubs" in your document set.',
          },
          {
            title: 'Betweenness Centrality',
            content: 'Measures how often a node sits on the shortest path between all other pairs of nodes in the network. Nodes with high betweenness act as bridges between clusters.',
          },
        ]
      },
      weak_signals: {
        title: 'Weak Signals Detection',
        desc: 'Weak signals are early indicators of emerging entities. Hackmanite computes three distinct metrics:',
        items: [
          {
            title: 'Rare Bridges',
            formula: 'Score = Betweenness Centrality / (Total Occurrences + 1)',
            content: 'Identifies entities that have very few occurrences globally but serve as critical topological bridges between different communities in the network. This highlights brokers and intermediaries rather than obvious, highly visible hubs.',
          },
          {
            title: 'Niche Topics',
            formula: 'Score = Maximum TF-IDF in local occurrences',
            content: 'Detects highly specific topics that appear in at most 2 files. By ordering by maximum local TF-IDF, we isolate concentrated local signals that are highly significant inside their specific documents but have not yet spread across the rest of the corpus.',
          },
          {
            title: 'Spiking Signals',
            formula: 'Score = Peak Window TF-IDF * Concentration Ratio',
            content: 'Identifies isolated bursts of occurrences in the timeline. The session timespan is analyzed using a sliding window of 20% (moving in steps of 10%). If an entity exhibits a concentrated spike inside a window (at least 60% of its total occurrences fall within that window), it is highlighted as an emerging signal.',
          },
        ]
      },
      pipelines: {
        title: 'Pipeline Builder',
        desc: 'Pipelines let you assemble reusable analysis flows from sources, filters, transformations, previews, and output nodes.',
        items: [
          {
            title: 'Palette, Node Help, and Configuration',
            content: 'The left palette groups nodes into Sources, Filters, Transforms, Visualizers, and Outputs. Hover a node and use its small **i** button to read what it does. Click a palette node to add it to the canvas, then select it to edit its parameters in the right configuration panel.',
          },
          {
            title: 'Connecting, Moving, and Editing Nodes',
            content: 'Drag from the right-side port of one node to another node to create a curved connection. Left-click a node to select it. Right-click a node to deactivate/reactivate it or delete it. Right-click an edge to delete the connection. Deactivated nodes remain visible but are bypassed during execution when possible.',
          },
          {
            title: 'Document Sources and Extraction',
            content: 'Document and email source nodes can use uploaded session files, including multiple files in the same document source. GraphML source nodes load an existing graph directly from a GraphML file. Document/email sources run through the same Python/spaCy extraction backend as the regular upload page, but they do not write entities to the main graph unless you explicitly add and confirm a Commit to KuzuDB output node.',
          },
          {
            title: 'Filters and AI Transforms',
            content: 'Pipeline filters include category filtering, Top N, minimum TF-IDF, minimum occurrences, minimum connections, edge weight, weak-signal flags, deny lists, and date ranges. Transform nodes can compute rare bridges, niche topics, spiking signals, communities, centrality, entity resolution, or use **LLM Annotate** to apply a custom AI prompt to graph metadata.',
          },
          {
            title: 'Outputs, Downloads, and Graph Commit',
            content: 'Output nodes can export JSON, CSV, GraphML, Obsidian vaults, HTML dashboards, and Markdown AI reports. JSON, CSV, GraphML, Obsidian, and AI Report outputs are downloadable from the run logs. Commit to KuzuDB requires explicit confirmation and makes the pipeline result visible on the main Graph page, including occurrence excerpts and co-occurrence snippets.',
          },
          {
            title: 'Running a Pipeline',
            content: 'Save a pipeline before running it. If it has not been saved, Hackmanite will ask you to save first. Running a pipeline keeps you on the current tab; open Logs when you want to inspect progress, download exports, or troubleshoot failures. Running nodes glow on the canvas while work is in progress.',
          },
        ]
      },
      ai_report: {
        title: 'LLM Intelligence Report Engine',
        desc: 'How LLMs summarize and generate briefings on your data.',
        items: [
          {
            title: 'Context Assembly',
            content: 'When you request an LLM Report, Hackmanite queries the SQLite database to gather session statistics: total files, entity frequencies, high-relevance co-occurrences, and top weak signals.',
          },
          {
            title: 'Prompt Injection',
            content: 'This raw metadata is structured into a clean JSON/text schema and injected into a system prompt configured to prevent hallucinations and report on factual session data. Note that the LLM report does not replace human analysis!',
          },
          {
            title: 'LLM Synthesis',
            content: 'The combined prompt is dispatched to Mistral AI models (or other compatible models) to synthesize a professional intelligence report, complete with key findings, entity profiles, and strategic summaries.',
          },
        ]
      },
    },
  },
  fr: {
    title: "Centre d'Aide",
    subtitle: "Découvrez comment Hackmanite analyse vos documents, gère vos sessions et calcule les métriques statistiques d'intelligence.",
    tabs: {
      guide: 'Guide des Fonctionnalités',
      algorithms: 'Extraction & Graphes',
      filters: 'Filtres & Centralité',
      weak_signals: 'Signaux Faibles',
      pipelines: 'Pipelines',
      ai_report: 'Rapports LLM',
    },
    sections: {
      guide: {
        title: 'Guide des Fonctionnalités',
        desc: "Découvrez les principaux modules d'Hackmanite pour analyser vos documents et explorer les relations entre entités.",
        items: [
          {
            title: 'Importation de Fichiers',
            content: 'Glissez-déposez du texte brut, des fichiers PDF, Word (DOCX), Excel (XLSX), des images, des e-mails (EML/PST) et plus encore. Les fichiers sont traités de manière asynchrone en arrière-plan. En cas d\'échec ou d\'interruption, le bouton "Réessayer les fichiers échoués" permet de relancer l\'analyse.',
          },
          {
            title: 'Explorateur de Graphe Interactif',
            content: 'Visualisez les connexions entre entités sous forme de réseau. Cliquez sur un nœud pour afficher ses propriétés, faites un clic droit pour accéder aux actions rapides, ou maintenez Ctrl/Cmd et cliquez sur plusieurs nœuds pour ouvrir le volet d\'analyse de co-occurrence.',
          },
          {
            title: 'Analyse des Co-occurrences',
            content: 'Sélectionnez deux entités ou plus via Ctrl + Clic/Command + Clic pour trouver les documents ou les passages de texte exacts où elles apparaissent ensemble. Basculez entre "Co-occurrence de fichiers" (fichiers communs) et "Co-occurrence de texte" (extraits textuels communs).',
          },
          {
            title: 'Registre des E-mails',
            content: 'Interface dédiée à la consultation, visualisation et au filtrage des e-mails (Expéditeur, Destinataire, Objet, Date) et à la recherche de leurs documents sources.',
          },
          {
            title: 'Constructeur de Pipelines',
            content: 'Créez des workflows d’analyse réutilisables depuis le menu Analyse personnalisée. Les pipelines peuvent charger des documents, scraper des pages web, réutiliser le graphe de session actif, filtrer les entités, exécuter des transformations de signaux faibles, appeler un prompt d’annotation LLM, prévisualiser les résultats intermédiaires et exporter ou écrire le graphe final.',
          },
          {
            title: 'Export de session et import de graphe',
            content: 'Sauvegardez, échangez ou restaurez des données de graphe depuis la page Graphe :\n\n- **JSON** : Une sauvegarde complète Hackmanite avec entités, fichiers, occurrences et cooccurrences. Réimportez-la pour restaurer une session avec le maximum de détails.\n- **GraphML** : Exportez ou importez un fichier de graphe interopérable avec les outils compatibles GraphML. Un import GraphML crée une session avec des occurrences synthétiques si le fichier ne contient pas de métadonnées Hackmanite.\n- **Coffre Obsidian (ZIP)** : Génère une base de connaissances Markdown où chaque entité et document possède sa propre page liée.',
          },
        ]
      },
      algorithms: {
        title: 'Extraction NLP & Construction du Graphe',
        desc: 'Comment le texte est converti en nœuds et en connexions sémantiques.',
        items: [
          {
            title: 'Reconnaissance d\'Entités Nommées (NER)',
            content: 'Sur la base des modèles de traitement du langage spaCy (modèles larges pour l\'anglais, le français et le russe). Le texte est découpé et analysé par spaCy pour identifier les personnes, organisations, lieux, dates, téléphones et adresses URL.',
          },
          {
            title: 'Reconnaissance Optique de Caractères (OCR)',
            content: 'Pour les images et les PDF scannés, Hackmanite extrait le texte brut via Tesseract OCR avant de l\'envoyer au moteur spaCy NER.\n\n**Pour activer l\'OCR, vous devez installer Tesseract OCR sur votre machine :**\n- **Windows :** Téléchargez l\'installateur depuis le dépôt officiel (https://github.com/UB-Mannheim/tesseract/wiki) ou installez-le via winget : \n  `winget install UB-Mannheim.TesseractOCR`\n- **Mac :** Exécutez `brew install tesseract` dans votre terminal.\n- **Linux :** Exécutez `sudo apt install tesseract-ocr` dans votre terminal.',
          },
          {
            title: 'Construction du Réseau',
            content: 'Chaque entité devient un nœud. Si deux entités apparaissent dans le même extrait textuel, un lien (arête) est établi. Le poids de ce lien est inversement proportionnel à la distance entre les entités.',
          },
        ]
      },
      filters: {
        title: 'Filtres & Métriques de Réseau',
        desc: 'Contrôlez les éléments affichés sur le graphe à l\'aide des paramètres.',
        items: [
          {
            title: 'TF-IDF (Term Frequency-Inverse Document Frequency)',
            content: 'Évalue l\'importance d\'une entité par rapport à un document spécifique au sein de tout le corpus. Si une entité apparaît beaucoup dans un fichier mais rarement ailleurs, son TF-IDF est élevé. Les termes génériques reçoivent un score bas. Utilisez le curseur TF-IDF pour masquer les entités peu pertinentes.',
          },
          {
            title: 'Centralité de Degré',
            content: 'Représente le nombre de connexions uniques d\'un nœud. Une centralité de degré élevée met en évidence les "hubs" dans vos documents.',
          },
          {
            title: 'Centralité d\'Intermédiarité',
            content: 'Mesure la fréquence à laquelle un nœud se trouve sur le chemin le plus court reliant les autres nœuds du graphe. Un score élevé désigne les intermédiaires ou passerelles critiques reliant deux communautés distinctes.',
          },
        ]
      },
      weak_signals: {
        title: 'Détection des Signaux Faibles',
        desc: 'Les signaux faibles sont des indicateurs précoces de sujets émergents ou des passerelles discrètes. Hackmanite calcule trois métriques distinctes :',
        items: [
          {
            title: 'Ponts Rares',
            formula: 'Score = Centralité d\'intermédiarité / (Occurrences totales + 1)',
            content: 'Identifie les entités peu fréquentes mais stratégiques qui agissent comme ponts entre différentes communautés. Permet de cibler les intermédiaires discrets plutôt que les hubs évidents.',
          },
          {
            title: 'Sujets de Niche',
            formula: 'Score = TF-IDF maximum dans les occurrences locales',
            content: 'Détecte les sujets très spécifiques présents dans au plus 2 fichiers. En classant par le TF-IDF local maximal, on isole les signaux locaux très concentrés qui n\'ont pas encore diffusé dans le reste du corpus.',
          },
          {
            title: 'Pics Temporels',
            formula: 'Score = TF-IDF de la fenêtre de pic * Ratio de concentration',
            content: 'Détecte les sursauts (spikes) temporels isolés. Le temps total de la session est découpé avec une fenêtre glissante de 20 % (pas de 10 %). Si au moins 60 % des occurrences d\'une entité se concentrent dans une seule fenêtre, elle est identifiée comme un signal émergent.',
          },
        ]
      },
      pipelines: {
        title: 'Constructeur de Pipelines',
        desc: 'Les pipelines permettent d’assembler des flux d’analyse réutilisables à partir de sources, filtres, transformations, aperçus et nœuds de sortie.',
        items: [
          {
            title: 'Palette, aide des nœuds et configuration',
            content: 'La palette de gauche regroupe les nœuds en Sources, Filtres, Transformations, Visualisations et Sorties. Survolez un nœud puis utilisez le petit bouton **i** pour comprendre son rôle. Cliquez sur un nœud de la palette pour l’ajouter au canvas, puis sélectionnez-le pour modifier ses paramètres dans le panneau de droite.',
          },
          {
            title: 'Connexion, déplacement et édition',
            content: 'Glissez depuis le port droit d’un nœud vers un autre nœud pour créer une connexion courbe. Cliquez gauche sur un nœud pour le sélectionner. Faites un clic droit sur un nœud pour le désactiver/réactiver ou le supprimer. Faites un clic droit sur une arête pour supprimer la connexion. Les nœuds désactivés restent visibles mais sont contournés pendant l’exécution lorsque c’est possible.',
          },
          {
            title: 'Sources documentaires et extraction',
            content: 'Les nœuds source Document et E-mail peuvent utiliser les fichiers téléversés dans la session, y compris plusieurs fichiers dans une même source document. Les sources GraphML chargent directement un graphe existant depuis un fichier GraphML. Les sources Document/E-mail passent par le même backend Python/spaCy que la page d’import classique, mais n’écrivent pas les entités dans le graphe principal sauf si vous ajoutez et confirmez explicitement un nœud de sortie Écrire KuzuDB.',
          },
          {
            title: 'Filtres et transformations IA',
            content: 'Les filtres de pipeline incluent les catégories, Top N, TF-IDF minimum, occurrences minimum, connexions minimum, poids d’arête, signaux faibles, listes d’exclusion et plages de dates. Les transformations peuvent calculer les ponts rares, sujets de niche, pics temporels, communautés, centralités, résolution d’entités, ou utiliser **Annotation LLM** pour appliquer un prompt IA personnalisé aux métadonnées du graphe.',
          },
          {
            title: 'Sorties, téléchargements et écriture graphe',
            content: 'Les nœuds de sortie peuvent exporter en JSON, CSV, GraphML, coffre Obsidian, tableau de bord HTML et rapport IA Markdown. Les sorties JSON, CSV, GraphML, Obsidian et Rapport IA sont téléchargeables depuis les logs d’exécution. Écrire KuzuDB exige une confirmation explicite et rend le résultat visible sur la page Graphe, avec les extraits d’occurrences et les snippets de cooccurrence.',
          },
          {
            title: 'Exécuter un pipeline',
            content: 'Enregistrez un pipeline avant de le lancer. S’il n’a pas encore été sauvegardé, Hackmanite vous demandera de le faire. Le lancement d’un pipeline ne vous bascule pas automatiquement vers les logs ; ouvrez l’onglet Logs lorsque vous voulez suivre la progression, télécharger les exports ou diagnostiquer une erreur. Les nœuds en cours d’exécution brillent sur le canvas.',
          },
        ]
      },
      ai_report: {
        title: 'Moteur de Rapports d\'Intelligence LLM',
        desc: 'Comment le LLM synthétise vos données pour rédiger un rapport.',
        items: [
          {
            title: 'Rassemblement du Contexte',
            content: 'Lorsque vous lancez un Rapport LLM, Hackmanite regroupe les statistiques clés : nombre de fichiers, fréquences d\'entités, co-occurrences fortes et signaux faibles.',
          },
          {
            title: 'Création du Prompt Factuel',
            content: 'Ces données sont structurées sous forme de schéma JSON/texte propre et injectées dans un prompt système configuré pour interdire les hallucinations et se baser uniquement sur les données factuelles de la session.',
          },
          {
            title: 'Synthèse par LLM',
            content: 'La requête est transmise aux modèles Mistral AI (ou autre modèle compatible) afin de rédiger une analyse stratégique claire et documentée des événements clés de la session. Notez que le rapport LLM ne remplace pas l\'analyse humaine !',
          },
        ]
      },
    },
  },
};

export default function HelpClient() {
  const { language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('guide');
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);

  const content = HELP_TRANSLATIONS[language] || HELP_TRANSLATIONS.en;

  const tabItems: { key: TabKey; label: string }[] = [
    { key: 'guide', label: content.tabs.guide },
    { key: 'algorithms', label: content.tabs.algorithms },
    { key: 'filters', label: content.tabs.filters },
    { key: 'weak_signals', label: content.tabs.weak_signals },
    { key: 'pipelines', label: content.tabs.pipelines },
    { key: 'ai_report', label: content.tabs.ai_report },
  ];

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="w-full mx-auto flex flex-col" style={{ gap: '3rem', padding: '4rem 2rem 6rem 2rem', maxWidth: '1200px' }}>
          
          <header className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight">
                {content.title}
              </h1>
              <p className="text-white/60 text-sm md:text-base max-w-2xl">
                {content.subtitle}
              </p>
            </motion.div>
          </header>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '1.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
            {tabItems.map((tab) => {
              const isActive = activeTab === tab.key;
              const isHovered = hoveredTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive
                      ? '2px solid var(--color-primary)'
                      : isHovered
                      ? '2px solid var(--color-border)'
                      : '2px solid transparent',
                    color: isActive
                      ? 'var(--color-text)'
                      : isHovered
                      ? 'var(--color-text-muted)'
                      : 'var(--color-text-muted)',
                    opacity: isActive ? 1 : isHovered ? 0.9 : 0.6,
                    padding: '0.75rem 0.25rem',
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Display */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-semibold text-white/95">{content.sections[activeTab].title}</h2>
              <p className="text-sm text-white/50 mt-1 max-w-3xl leading-relaxed">{content.sections[activeTab].desc}</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {content.sections[activeTab].items.map((item, index) => (
                <div
                  key={index}
                  className="signature-card"
                  style={{
                    padding: '2rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h3 className="text-lg font-medium text-white/90">{item.title}</h3>
                    {'formula' in item && (
                      <span
                        className="font-mono text-[10px] text-accent bg-accent/5 border border-accent/15 px-2.5 py-1 rounded-sm w-fit"
                      >
                        {item.formula}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-white/70 leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
