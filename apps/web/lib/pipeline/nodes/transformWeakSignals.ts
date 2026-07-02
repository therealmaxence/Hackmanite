import { NodeHandler } from '../executor';
import { computeWeakSignals } from '../weakSignals';

export const handlers: NodeHandler[] = [
  {
    type: 'transform.rare_bridges',
    async run(inputs, config, context) {
      const input = inputs.input;
      if (!input || input.type !== 'graph') {
        throw new Error('Input is missing or is not of type "graph"');
      }

      await context.log('Calculating Rare Bridges signals...');
      const { bridgeSignals } = computeWeakSignals(input);
      const bridgeIds = new Set(bridgeSignals.map((b) => b.id));

      const filteredNodes = input.nodes
        .filter((n) => bridgeIds.has(n.id))
        .map((n) => {
          const score = bridgeSignals.find((b) => b.id === n.id)?.score || 0;
          return { ...n, score };
        });

      const filteredEdges = input.edges.filter(
        (e) => bridgeIds.has(e.source) && bridgeIds.has(e.target)
      );

      await context.log(`Extracted ${filteredNodes.length} Rare Bridges nodes from the graph.`);

      return {
        type: 'graph',
        nodes: filteredNodes,
        edges: filteredEdges,
        emails: input.emails || [],
      };
    },
  },
  {
    type: 'transform.niche_topics',
    async run(inputs, config, context) {
      const input = inputs.input;
      if (!input || input.type !== 'graph') {
        throw new Error('Input is missing or is not of type "graph"');
      }

      await context.log('Calculating Niche Topics signals...');
      const { nicheSignals } = computeWeakSignals(input);
      const nicheIds = new Set(nicheSignals.map((n) => n.id));

      const filteredNodes = input.nodes
        .filter((n) => nicheIds.has(n.id))
        .map((n) => {
          const score = nicheSignals.find((ns) => ns.id === n.id)?.score || 0;
          return { ...n, score };
        });

      const filteredEdges = input.edges.filter(
        (e) => nicheIds.has(e.source) && nicheIds.has(e.target)
      );

      await context.log(`Extracted ${filteredNodes.length} Niche Topics nodes from the graph.`);

      return {
        type: 'graph',
        nodes: filteredNodes,
        edges: filteredEdges,
        emails: input.emails || [],
      };
    },
  },
  {
    type: 'transform.spiking_signals',
    async run(inputs, config, context) {
      const input = inputs.input;
      if (!input || input.type !== 'graph') {
        throw new Error('Input is missing or is not of type "graph"');
      }

      await context.log('Calculating Spiking Signals (sliding window concentration)...');
      const { emergingSignals } = computeWeakSignals(input);
      const emergingIds = new Set(emergingSignals.map((e) => e.id));

      const filteredNodes = input.nodes
        .filter((n) => emergingIds.has(n.id))
        .map((n) => {
          const score = emergingSignals.find((es) => es.id === n.id)?.score || 0;
          return { ...n, score };
        });

      const filteredEdges = input.edges.filter(
        (e) => emergingIds.has(e.source) && emergingIds.has(e.target)
      );

      await context.log(`Extracted ${filteredNodes.length} Spiking Signals nodes from the graph.`);

      return {
        type: 'graph',
        nodes: filteredNodes,
        edges: filteredEdges,
        emails: input.emails || [],
      };
    },
  },
];
