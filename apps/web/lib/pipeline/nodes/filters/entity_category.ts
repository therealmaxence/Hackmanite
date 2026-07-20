import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { pruneGraphByNodes } from './shared';

export const entityCategoryHandler: NodeHandler = {
  type: 'filter.entity_category',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const categoriesRaw = config?.categories ?? config?.types;
    if (!categoriesRaw) throw new Error('Missing parameter: categories');

    let allowed: Set<string>;
    if (Array.isArray(categoriesRaw)) allowed = new Set(categoriesRaw.map((s) => String(s).trim().toUpperCase()));
    else if (typeof categoriesRaw === 'string') allowed = new Set(categoriesRaw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    else throw new Error('Invalid parameter format: categories');

    await context.log(`Filtering entities keeping only categories: ${Array.from(allowed).join(', ')}`);
    return pruneGraphByNodes(input, input.nodes.filter((node: any) => allowed.has(node.type?.toUpperCase())), context);
  },
};
