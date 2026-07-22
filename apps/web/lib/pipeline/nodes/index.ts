import { registerNodeHandler } from '../executor';
import { handlers as sources } from './sources/index';
import { handlers as filters } from './filters/index';
import { handlers as transforms } from './transforms/index';
import { handlers as visualizers } from './visualizers/index';
import { handlers as outputs } from './outputs/index';

export function registerAllNodes() {
  [...sources, ...filters, ...transforms, ...visualizers, ...outputs].forEach(registerNodeHandler);
}
