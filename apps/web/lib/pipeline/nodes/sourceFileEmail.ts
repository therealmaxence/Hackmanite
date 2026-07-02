import { NodeHandler } from '../executor';
import { handler as docHandler } from './sourceFileDocument';

export const handler: NodeHandler = {
  type: 'source.file.email',
  async run(inputs, config, context) {
    const filePath = config?.filePath;
    if (!filePath) {
      throw new Error('Missing parameter: filePath');
    }
    return docHandler.run(inputs, { filePath, mimeType: 'message/rfc822' }, context);
  },
};
