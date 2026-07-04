import { NodeHandler } from '../../executor';
import { requireInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { writeFile } from 'fs/promises';

export const htmlDashboardHandler: NodeHandler = {
  type: 'output.html_dashboard',
  async run(inputs, config, context) {
    const input = requireInput(inputs);
    const fileName = config?.fileName || `dashboard_${Date.now()}.html`;
    const finalFileName = ensureExtension(fileName, '.html');
    await context.log(`Generating interactive HTML Dashboard: ${finalFileName}`);

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>EntityGraph Interactive Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a090c; color: #e2e0ef; margin: 0; padding: 24px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 1.5rem; color: #f2efff; margin-bottom: 4px; }
    .subtitle { color: #8d8a9e; font-size: 0.8rem; margin-bottom: 24px; }
    .card { background: #121118; border: 1px solid #2d2c35; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    #cy { height: 600px; background: #0c0b10; border-radius: 6px; border: 1px solid #1a1921; width: 100%; position: relative; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; margin-top: 12px; }
    th, td { padding: 12px 16px; border-bottom: 1px solid #2c2b34; }
    th { background: #17161e; color: #a78bfa; font-weight: 600; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.29.2/cytoscape.min.js"></script>
</head>
<body>
  <div class="container">
    <h1>EntityGraph Interactive Dashboard</h1>
    <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
`;

    if (input.type === 'graph') {
      const cyElements = [
        ...input.nodes.map((node: any) => ({
          data: { id: node.id, label: node.label || node.displayName || '', type: node.type },
        })),
        ...input.edges.map((edge: any) => ({
          data: { source: edge.source, target: edge.target, weight: edge.weight || 1.0 },
        })),
      ];

      html += `
    <div class="card">
      <h2>Network Graph View</h2>
      <div id="cy"></div>
    </div>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const cy = cytoscape({
          container: document.getElementById('cy'),
          elements: ${JSON.stringify(cyElements)},
          style: [
            {
              selector: 'node',
              style: {
                'shape': 'roundrectangle',
                'width': '120px',
                'height': '36px',
                'background-color': '#1f1e26',
                'border-width': 1.5,
                'border-color': '#a78bfa',
                'color': '#e2e0ef',
                'text-valign': 'center',
                'text-halign': 'center',
                'content': 'data(label)',
                'font-size': '10px',
                'font-weight': 'bold'
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 1.5,
                'line-color': '#7c3aed',
                'target-arrow-color': '#7c3aed',
                'target-arrow-shape': 'none',
                'curve-style': 'bezier',
                'opacity': 0.7
              }
            }
          ],
          layout: {
            name: 'cose',
            idealEdgeLength: 100,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 30,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 400000,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
          }
        });
      });
    </script>

    <div class="card" style="overflow-x: auto;">
      <h2>Entities List</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Canonical</th>
            <th>Occurrences</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
`;
      for (const node of input.nodes) {
        const occurrencesCount = (node.occurrences || []).reduce((sum: number, o: any) => sum + (o.count || 0), 0);
        html += `
          <tr>
            <td style="font-weight: 500; color: #a78bfa;">${node.label || node.displayName || ''}</td>
            <td>${node.type || ''}</td>
            <td style="font-family: monospace;">${node.canonical || ''}</td>
            <td>${occurrencesCount}</td>
            <td style="font-family: monospace; font-size: 0.75rem;">${typeof node.metadata === 'string' ? node.metadata : JSON.stringify(node.metadata || {})}</td>
          </tr>
`;
      }
      html += `
        </tbody>
      </table>
    </div>
`;
    } else if (input.type === 'tabular') {
      // Tabular data rendering
      const dataRows = input.data || [];
      if (dataRows.length > 0) {
        const headers = Object.keys(dataRows[0]);
        html += `
    <div class="card" style="overflow-x: auto;">
      <h2>Tabular Dataset Preview</h2>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
`;
        for (const row of dataRows) {
          html += `
          <tr>
            ${headers.map((h) => `<td>${typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h])}</td>`).join('')}
          </tr>
`;
        }
        html += `
        </tbody>
      </table>
    </div>
`;
      } else {
        html += `
    <div class="card">
      <p style="font-style: italic; color: #8d8a9e;">No tabular data rows available.</p>
    </div>
`;
      }
    } else {
      html += `
    <div class="card">
      <h2>File Output</h2>
      <p style="color: #8d8a9e;">This output contains generated file contents of type: <strong>${input.type}</strong></p>
    </div>
`;
    }

    html += `
  </div>
</body>
</html>
`;

    const exportConfig = config?.exportLocation === 'downloads' ? { ...config, exportLocation: 'custom' } : config;
    const { absolutePath, relativePath } = await resolveExportPath(finalFileName, exportConfig, context);
    await writeFile(absolutePath, html, 'utf8');
    await context.log(`Successfully wrote HTML Dashboard output to: ${relativePath}`);
    return buildDownloadResult(finalFileName, html, 'text/html', relativePath);
  },
};
