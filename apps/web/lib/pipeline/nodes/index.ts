import { registerNodeHandler } from '../executor';
import { handler as sourceSqlite } from './sourceSqlite';
import { handler as sourceSession } from './sourceSession';
import { handler as sourceFileDocument } from './sourceFileDocument';
import { handler as sourceFileEmail } from './sourceFileEmail';
import { handler as filterEntityCategory } from './filterEntityCategory';
import { handlers as transformWeakSignals } from './transformWeakSignals';
import { handler as transformCommunity } from './transformCommunity';
import { handler as transformCentrality } from './transformCentrality';
import { handler as outputJson } from './outputJson';
import { handler as outputGraphml } from './outputGraphml';
import { handler as outputObsidian } from './outputObsidian';
import { handler as outputAiReport } from './outputAiReport';
import { handler as outputKuzudbWrite } from './outputKuzudbWrite';

export function registerAllNodes() {
  registerNodeHandler(sourceSqlite);
  registerNodeHandler(sourceSession);
  registerNodeHandler(sourceFileDocument);
  registerNodeHandler(sourceFileEmail);
  registerNodeHandler(filterEntityCategory);
  transformWeakSignals.forEach(registerNodeHandler);
  registerNodeHandler(transformCommunity);
  registerNodeHandler(transformCentrality);
  registerNodeHandler(outputJson);
  registerNodeHandler(outputGraphml);
  registerNodeHandler(outputObsidian);
  registerNodeHandler(outputAiReport);
  registerNodeHandler(outputKuzudbWrite);
}
