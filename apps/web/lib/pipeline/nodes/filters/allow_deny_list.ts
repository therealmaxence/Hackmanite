import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { pruneGraphByNodes } from './shared';

export const allowDenyListHandler: NodeHandler = {
  type: 'filter.allow_deny_list',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const deniedNamesRaw = config?.deniedNames;
    if (!deniedNamesRaw || typeof deniedNamesRaw !== 'string') {
      await context.log('No denied names/patterns configured. Skipping filter.');
      return input;
    }

    const patterns = deniedNamesRaw.split(',').map((pattern) => pattern.trim()).filter(Boolean);
    await context.log(`Filtering entities with allow/deny list patterns: ${patterns.join(', ')}`);

    const regexes = patterns.map((pattern) => {
      try {
        if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
          const lastSlash = pattern.lastIndexOf('/');
          return new RegExp(pattern.substring(1, lastSlash), pattern.substring(lastSlash + 1));
        }
        return new RegExp(pattern, 'i');
      } catch {
        return new RegExp(pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      }
    });

    return pruneGraphByNodes(input, input.nodes.filter((node: any) => !regexes.some((rx) => rx.test(node.label || node.canonical || ''))), context);
  },
};
