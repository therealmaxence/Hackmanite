import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { writeFile } from 'fs/promises';

export const graphmlOutputHandler: NodeHandler = {
  type: 'output.graphml',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const fileName = config?.fileName || `export_${Date.now()}.graphml`;
    const finalFileName = ensureExtension(fileName, '.graphml');
    await context.log(`Generating GraphML XML for: ${finalFileName}`);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n  <key id="d0" for="node" attr.name="label" attr.type="string"/>\n  <key id="d1" for="node" attr.name="type" attr.type="string"/>\n  <key id="d2" for="node" attr.name="canonical" attr.type="string"/>\n  <key id="d3" for="edge" attr.name="weight" attr.type="double"/>\n\n  <graph id="G" edgedefault="undirected">\n`;

    for (const node of input.nodes) {
      xml += `    <node id="${node.id}">\n      <data key="d0">${node.label || node.displayName || ''}</data>\n      <data key="d1">${node.type || ''}</data>\n      <data key="d2">${node.canonical || ''}</data>\n    </node>\n`;
    }

    let edgeId = 0;
    for (const edge of input.edges) {
      xml += `    <edge id="e${edgeId++}" source="${edge.source}" target="${edge.target}">\n      <data key="d3">${edge.weight || 1.0}</data>\n    </edge>\n`;
    }

    xml += `  </graph>\n</graphml>`;

    const { absolutePath, relativePath } = await resolveExportPath(finalFileName, config, context);
    await writeFile(absolutePath, xml, 'utf8');
    await context.log(`Successfully wrote GraphML output to: ${relativePath}`);
    return buildDownloadResult(finalFileName, xml, 'application/xml', relativePath);
  },
};
