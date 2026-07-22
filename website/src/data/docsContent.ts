import readmeRaw from '../content/README.md?raw';
import wiki1Raw from '../content/wiki/1_Getting_Started.md?raw';
import wiki2Raw from '../content/wiki/2_Session_Management.md?raw';
import wiki3Raw from '../content/wiki/3_Interactive_Graph_Explorer.md?raw';
import wiki4Raw from '../content/wiki/4_Co_occurrence_Analysis.md?raw';
import wiki5Raw from '../content/wiki/5_Email_Dashboard.md?raw';
import wiki6Raw from '../content/wiki/6_Weak_Signals_Discovery.md?raw';
import wiki7Raw from '../content/wiki/7_Pipeline_Builder.md?raw';
import wiki8Raw from '../content/wiki/8_AI_Intelligence_Reports.md?raw';
import wiki9Raw from '../content/wiki/9_Project_Architecture.md?raw';

export interface DocItem {
  id: string;
  title: string;
  category: 'Overview' | 'User Guides' | 'Workflows' | 'Architecture';
  summary: string;
  content: string;
}

export const DOCS_ITEMS: DocItem[] = [
  {
    id: 'readme',
    title: 'Hackmanite Overview & Quickstart',
    category: 'Overview',
    summary: 'Hackmanite DataLake Entity Graph Explorer features, tech stack, installation, and usage overview.',
    content: readmeRaw,
  },
  {
    id: 'getting-started',
    title: '1. Getting Started',
    category: 'User Guides',
    summary: 'Running the application, uploading files into the dropzone, file extraction queue, and OCR Tesseract setup.',
    content: wiki1Raw,
  },
  {
    id: 'session-management',
    title: '2. Session Management & Portability',
    category: 'User Guides',
    summary: 'Creating and switching sessions, dual database storage (SQLite + KuzuDB), and exporting/importing snapshots.',
    content: wiki2Raw,
  },
  {
    id: 'graph-explorer',
    title: '3. Interactive Graph Explorer',
    category: 'User Guides',
    summary: 'Interactive Cytoscape.js network canvas, layout customization, progressive rendering, filter sliders, and node legends.',
    content: wiki3Raw,
  },
  {
    id: 'co-occurrence',
    title: '4. Co-occurrence Analysis',
    category: 'User Guides',
    summary: 'Multi-node selection, overlapping file lists, matching text snippets, and contextual entity highlighting.',
    content: wiki4Raw,
  },
  {
    id: 'emails',
    title: '5. Emails Dashboard',
    category: 'User Guides',
    summary: 'Browsing email archives (.eml, .pst), header filtering (From, To, Date), and locating source attachments.',
    content: wiki5Raw,
  },
  {
    id: 'weak-signals',
    title: '6. Weak Signals Discovery Engine',
    category: 'Workflows',
    summary: 'Mathematical indicators: Rare Bridges (betweenness centrality), Niche Topics (local TF-IDF), and Spiking Signals.',
    content: wiki6Raw,
  },
  {
    id: 'pipeline-builder',
    title: '7. Pipeline Builder',
    category: 'Workflows',
    summary: 'Visual DAG canvas editor for graph workflows: node editor palette, canvas connections, execution logs, and export nodes.',
    content: wiki7Raw,
  },
  {
    id: 'ai-reports',
    title: '8. AI Intelligence Reports',
    category: 'Workflows',
    summary: 'Generating structured briefings, setting up AI models (Mistral Cloud vs. local Ollama), selecting context, and exporting to PDF/Markdown.',
    content: wiki8Raw,
  },
  {
    id: 'architecture',
    title: '9. Project Architecture & System Design',
    category: 'Architecture',
    summary: 'High-level system architecture, monorepo directory schema, dual SQLite/KuzuDB schemas, and data flow pipelines.',
    content: wiki9Raw,
  },
];
