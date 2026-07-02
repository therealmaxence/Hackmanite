import { NodeHandler } from '../executor';
import { UPLOAD_DIR } from '@/lib/api/upload';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const handler: NodeHandler = {
  type: 'output.graphml',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    const fileName = config?.fileName || `export_${Date.now()}.graphml`;
    const finalFileName = fileName.endsWith('.graphml') ? fileName : `${fileName}.graphml`;
    await context.log(`Generating GraphML XML for: ${finalFileName}`);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <key id="d1" for="node" attr.name="type" attr.type="string"/>
  <key id="d2" for="node" attr.name="canonical" attr.type="string"/>
  <key id="d3" for="edge" attr.name="weight" attr.type="double"/>

  <graph id="G" edgedefault="undirected">
`;

    for (const n of input.nodes) {
      xml += `    <node id="${n.id}">
      <data key="d0">${n.label || n.displayName || ''}</data>
      <data key="d1">${n.type || ''}</data>
      <data key="d2">${n.canonical || ''}</data>
    </node>\n`;
    }

    let edgeId = 0;
    for (const e of input.edges) {
      xml += `    <edge id="e${edgeId++}" source="${e.source}" target="${e.target}">
      <data key="d3">${e.weight || 1.0}</data>
    </edge>\n`;
    }

    xml += `  </graph>
</graphml>`;

    const exportPath = join(UPLOAD_DIR, 'exports', finalFileName);
    const absoluteExportPath = join(process.cwd(), exportPath);

    await mkdir(join(process.cwd(), UPLOAD_DIR, 'exports'), { recursive: true });
    await writeFile(absoluteExportPath, xml, 'utf8');

    await context.log(`Successfully wrote GraphML output to: ${exportPath}`);
  },
};
