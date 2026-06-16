const { exec, execSync } = require('child_process');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let nextProcess = null;
let pythonProcess = null;

const log = (msg, meta = {}) => {
  console.log(`[Electron Main][ProcessManager] ${msg}`, meta);
};

function getNextProcess() {
  return nextProcess;
}

function setNextProcess(proc) {
  nextProcess = proc;
}

function getPythonProcess() {
  return pythonProcess;
}

function setPythonProcess(proc) {
  pythonProcess = proc;
}

function killSubprocesses() {
  log("Cleaning up child processes...");
  if (nextProcess) {
    log("Killing Next.js server...");
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${nextProcess.pid}`);
      } catch (err) {
        log("Failed to run taskkill for Next.js", { error: err.message });
      }
    } else {
      nextProcess.kill();
      try {
        execSync('fuser -k 3000/tcp || true');
      } catch (e) {}
    }
    nextProcess = null;
  }
  if (pythonProcess) {
    log("Killing Python NLP service...");
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${pythonProcess.pid}`);
      } catch (err) {
        log("Failed to run taskkill for Python", { error: err.message });
      }
    } else {
      pythonProcess.kill();
      try {
        execSync('pkill -f hackmanite-nlp || fuser -k 8000/tcp || true');
      } catch (e) {}
    }
    pythonProcess = null;
  }

  // Clear out log files in appData (next-server.log and python-server.log)
  try {
    const logDir = app.getPath('userData');
    const nextLogPath = path.join(logDir, 'next-server.log');
    const pythonLogPath = path.join(logDir, 'python-server.log');

    if (fs.existsSync(nextLogPath)) {
      fs.unlinkSync(nextLogPath);
      log("Deleted next-server.log");
    }
    if (fs.existsSync(pythonLogPath)) {
      fs.unlinkSync(pythonLogPath);
      log("Deleted python-server.log");
    }
  } catch (err) {
    log("Failed to delete server logs", { error: err.message });
  }

  // Clear out Winston log files in apps/web/logs/
  try {
    const isPackaged = app.isPackaged;
    const WEB_DIR = isPackaged 
      ? path.join(process.resourcesPath, 'web') 
      : path.resolve(__dirname, '../../web');

    const webLogDir = path.join(WEB_DIR, 'logs');
    const combinedLogPath = path.join(webLogDir, 'combined.log');
    const errorLogPath = path.join(webLogDir, 'error.log');

    if (fs.existsSync(combinedLogPath)) {
      fs.unlinkSync(combinedLogPath);
      log("Deleted combined.log");
    }
    if (fs.existsSync(errorLogPath)) {
      fs.unlinkSync(errorLogPath);
      log("Deleted error.log");
    }
  } catch (err) {
    log("Failed to delete web logs", { error: err.message });
  }
}

module.exports = {
  killSubprocesses,
  getNextProcess,
  setNextProcess,
  getPythonProcess,
  setPythonProcess
};
