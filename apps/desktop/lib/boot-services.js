const { app } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const { getOrCreateSessionSecret } = require('./session-secret');
const { setPythonProcess, setNextProcess } = require('./process-manager');

const isPackaged = app.isPackaged;
const WEB_DIR = isPackaged ? path.join(process.resourcesPath, 'web') : path.resolve(__dirname, '../../web');
const NLP_DIR = isPackaged ? path.join(process.resourcesPath, 'nlp-service') : path.resolve(__dirname, '../../nlp-service');

const log = (msg, meta = {}) => console.log(`[Electron Main][BootServices] ${msg}`, meta);

const runCommand = (cmd, cwd) => new Promise((res, rej) => exec(cmd, { cwd }, (err) => err ? rej(err) : res()));

const waitForServer = (url, retries) => new Promise((res, rej) => {
  let count = 0;
  const poll = () => {
    http.get(url, (response) => response.statusCode === 200 ? res() : fail())
        .on('error', fail);
  };
  const fail = () => {
    if (++count >= retries) return rej(new Error("Local Web server did not respond in time."));
    log(`Server not ready, retrying (${count}/${retries})...`);
    setTimeout(poll, 2000);
  };
  poll();
});

async function bootServices(updateStatus, onReady) {
  try {
    updateStatus(" Verifying system environment...", 10);
    await new Promise(r => setTimeout(r, 1000));

    updateStatus(" Clearing port conflicts...", 20);
    if (process.platform === 'win32') {
      try {
        await runCommand(`powershell -Command "$c8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; if ($c8000) { Stop-Process -Id $c8000.OwningProcess -Force }; $c3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c3000) { Stop-Process -Id $c3000.OwningProcess -Force }"`, WEB_DIR);
        log("Successfully cleared port conflicts.");
      } catch (err) {
        log("No port conflicts or failed to clear", { error: err.message });
      }
    }

    updateStatus(" Initializing database schema...", 30);
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'dev.db');
    const kuzuDbPath = path.join(userData, 'kuzu_data', 'kuzu.db');

    try {
      if (isPackaged) {
        log("Running packaged database schema sync...");
        await new Promise((res, rej) => {
          const prisma = spawn(process.execPath, [path.join(WEB_DIR, 'node_modules/prisma/build/index.js'), 'db', 'push'], {
            cwd: WEB_DIR, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DATABASE_URL: `file:${dbPath}` }, shell: true
          });
          let err = "";
          prisma.stderr.on('data', (d) => err += d);
          prisma.on('close', (code) => code === 0 ? res() : rej(new Error(err)));
        });
      } else {
        await runCommand("npx prisma db push", WEB_DIR);
      }
      log("DB synchronized successfully.");
    } catch (e) {
      log("Failed to sync DB, proceeding anyway...", { error: e.message });
    }

    updateStatus(" Launching NLP service...", 55);
    const logStream = (name) => fs.createWriteStream(path.join(userData, name), { flags: 'w' });
    const pyLog = logStream('python-server.log');
    
    const pyProc = spawn(
      isPackaged ? path.join(NLP_DIR, process.platform === 'win32' ? 'hackmanite-nlp.exe' : 'hackmanite-nlp') : "python",
      isPackaged ? ["--port", "8000", "--host", "127.0.0.1"] : ["-m", "uvicorn", "main:app", "--port", "8000", "--host", "127.0.0.1"],
      { cwd: NLP_DIR, env: { ...process.env, KUZU_DB_PATH: kuzuDbPath }, shell: true }
    );
    setPythonProcess(pyProc);
    pyProc.stdout.pipe(pyLog);
    pyProc.stderr.pipe(pyLog);
    pyProc.stdout.on('data', (d) => log(`[Python STDOUT] ${d}`));
    pyProc.stderr.on('data', (d) => log(`[Python STDERR] ${d}`));

    await new Promise(r => setTimeout(r, 1500));

    updateStatus(" Initializing EntityGraph Web Server...", 75);
    const nextLog = logStream('next-server.log');
    const secret = getOrCreateSessionSecret();
    const env = {
      ...process.env, SESSION_SECRET: secret, DATABASE_URL: `file:${dbPath}`,
      UPLOAD_DIR: path.join(userData, 'uploads'), KUZU_DB_PATH: kuzuDbPath, NLP_SERVICE_URL: 'http://127.0.0.1:8000'
    };

    const nextProc = !isPackaged
      ? spawn("npm run dev", { cwd: WEB_DIR, env, shell: true })
      : spawn(process.execPath, [path.join(WEB_DIR, 'node_modules/next/dist/bin/next'), 'start'], {
          cwd: WEB_DIR, env: { ...env, ELECTRON_RUN_AS_NODE: '1', BUILD_DIR: 'next-production' }, shell: true
        });
    setNextProcess(nextProc);
    nextProc.stdout.pipe(nextLog);
    nextProc.stderr.pipe(nextLog);
    nextProc.stdout.on('data', (d) => log(`[Next.js STDOUT] ${d}`));
    nextProc.stderr.on('data', (d) => log(`[Next.js STDERR] ${d}`));

    updateStatus(" Finalizing connection...", 90);
    await waitForServer("http://localhost:3000", 60);

    updateStatus("Ready!", 100);
    await new Promise(r => setTimeout(r, 500));
    onReady();
  } catch (err) {
    log("Initialization crashed!", { error: err.message });
    updateStatus(` Boot Error: ${err.message}. Please restart.`, 100);
  }
}

module.exports = { bootServices, waitForServer, WEB_DIR, NLP_DIR };
