const { execSync } = require('child_process');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let state = { next: null, python: null };

const log = (msg, err) => console.log(`[Electron Main][ProcessManager] ${msg}`, err ? { error: err.message } : {});

const safeUnlink = (p) => {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
};

function killSubprocesses() {
  log("Cleaning up child processes...");
  ['next', 'python'].forEach(key => {
    const proc = state[key];
    if (!proc) return;
    log(`Killing ${key === 'next' ? 'Next.js server' : 'Python NLP service'}...`);
    if (process.platform === 'win32') {
      try { execSync(`taskkill /F /T /PID ${proc.pid}`); } catch (e) { log(`Failed to taskkill ${key}`, e); }
    } else {
      proc.kill();
      try {
        if (key === 'next') execSync('fuser -k 3000/tcp || true');
        else execSync('pkill -f hackmanite-nlp || fuser -k 8000/tcp || true');
      } catch (e) {}
    }
    state[key] = null;
  });

  const userData = app.getPath('userData');
  ['next-server.log', 'python-server.log'].forEach(f => safeUnlink(path.join(userData, f)));

  const webLogs = path.join(process.resourcesPath, 'web/logs');
  const devWebLogs = path.resolve(__dirname, '../../web/logs');
  const webDir = app.isPackaged ? webLogs : devWebLogs;
  ['combined.log', 'error.log'].forEach(f => safeUnlink(path.join(webDir, f)));
}

module.exports = {
  killSubprocesses,
  setNextProcess: (proc) => state.next = proc,
  setPythonProcess: (proc) => state.python = proc
};
