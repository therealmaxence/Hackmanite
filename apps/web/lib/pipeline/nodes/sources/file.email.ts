import { NodeHandler } from '../../executor';
import { documentSourceHandler } from './file.document';

export const emailSourceHandler: NodeHandler = {
  type: 'source.file.email',
  async run(inputs, config, context) {
    const filePath = config?.filePath;
    if (!filePath) throw new Error('Missing parameter: filePath');
    return documentSourceHandler.run(inputs, { ...config, filePath, mimeType: 'message/rfc822' }, context);
  },
};
