const { app } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const { getOrCreateSessionSecret } = require('./session-secret');
const { setPythonProcess, setNextProcess, killSubprocesses } = require('./process-manager');

const isPackaged = app.isPackaged;
const WEB_DIR = isPackaged 
  ? path.join(process.resourcesPath, 'web') 
  : path.resolve(__dirname, '../../web');

const NLP_DIR = isPackaged 
  ? path.join(process.resourcesPath, 'nlp-service') 
  : path.resolve(__dirname, '../../nlp-service');

const log = (msg, meta = {}) => {
  console.log(`[Electron Main][BootServices] ${msg}`, meta);
};

async function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const process = exec(command, { cwd });
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command "${command}" failed with code ${code}`));
    });
  });
}

async function waitForServer(url, retries) {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
        req.end();
      });
      return;
    } catch (e) {
      log(`Server not ready, retrying (${i + 1}/${retries})...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("Local Web server did not respond in time.");
}

async function bootServices(updateStatus, onReady) {
  try {
    // 1. Env & runtime check
    updateStatus(" Verifying system environment...", 10);
    await new Promise(r => setTimeout(r, 1000));

    // 1b. Self-heal port conflicts before boot
    updateStatus(" Clearing port conflicts...", 20);
    if (process.platform === 'win32') {
      try {
        await runCommand(`powershell -Command "$c8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; if ($c8000) { Stop-Process -Id $c8000.OwningProcess -Force }; $c3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c3000) { Stop-Process -Id $c3000.OwningProcess -Force }"`, WEB_DIR);
        log("Successfully cleared port conflicts.");
      } catch (err) {
        log("No port conflicts or failed to clear", { error: err.message });
      }
    }

    // 2. Initialize database
    updateStatus(" Initializing database schema...", 30);

    const userDataDir = app.getPath('userData');
    const dbPath = path.join(userDataDir, 'dev.db');
    const uploadDir = path.join(userDataDir, 'uploads');
    const kuzuDbPath = path.join(userDataDir, 'kuzu_data', 'kuzu.db');

    try {
      if (isPackaged) {
        log("Running packaged database schema sync...");
        await new Promise((resolve, reject) => {
          const prismaProc = spawn(process.execPath, [
            path.join(WEB_DIR, 'node_modules', 'prisma', 'build', 'index.js'),
            'db',
            'push'
          ], {
            cwd: WEB_DIR,
            env: {
              ...process.env,
              ELECTRON_RUN_AS_NODE: '1',
              DATABASE_URL: `file:${dbPath}`,
            },
            shell: true
          });
          
          let stderrData = "";
          prismaProc.stderr.on('data', (data) => stderrData += data.toString());
          
          prismaProc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Prisma sync failed with code ${code}. Stderr: ${stderrData}`));
          });
        });
      } else {
        await runCommand("npx prisma db push", WEB_DIR);
      }
      log("DB synchronized successfully.");
    } catch (dbErr) {
      log("Failed to sync DB, proceeding anyway...", { error: dbErr.message });
    }

    // 3. Start Python NLP FastAPI service
    updateStatus(" Launching NLP service...", 55);
    
    const logDir = app.getPath('userData');
    const nextLogStream = fs.createWriteStream(path.join(logDir, 'next-server.log'), { flags: 'w' });
    const pythonLogStream = fs.createWriteStream(path.join(logDir, 'python-server.log'), { flags: 'w' });

    const pythonExec = isPackaged ? path.join(NLP_DIR, 'hackmanite-nlp.exe') : "python";
    const pythonArgs = isPackaged
      ? ["--port", "8000", "--host", "127.0.0.1"]
      : ["-m", "uvicorn", "main:app", "--port", "8000", "--host", "127.0.0.1"];

    const pythonProc = spawn(pythonExec, pythonArgs, {
      cwd: NLP_DIR,
      env: {
        ...process.env,
        KUZU_DB_PATH: kuzuDbPath,
      },
      shell: true
    });
    setPythonProcess(pythonProc);

    pythonProc.stdout.pipe(pythonLogStream);
    pythonProc.stderr.pipe(pythonLogStream);

    pythonProc.stdout.on('data', (data) => log(`[Python STDOUT] ${data}`));
    pythonProc.stderr.on('data', (data) => log(`[Python STDERR] ${data}`));

    pythonProc.on('close', (code) => {
      log(`Python service closed with code ${code}`);
    });

    // Wait a brief moment for python to open its socket
    await new Promise(r => setTimeout(r, 1500));

    // 4. Start Next.js Web Server
    updateStatus(" Initializing EntityGraph Web Server...", 75);
    
    const sessionSecret = getOrCreateSessionSecret();
    const isDev = !app.isPackaged;
    let nextProc;

    if (isDev) {
      log(`Starting development Web Server with command: npm run dev (cwd: ${WEB_DIR})`);
      nextProc = spawn("npm run dev", {
        cwd: WEB_DIR,
        env: {
          ...process.env,
          SESSION_SECRET: sessionSecret,
          DATABASE_URL: `file:${dbPath}`,
          UPLOAD_DIR: uploadDir,
          KUZU_DB_PATH: kuzuDbPath,
          NLP_SERVICE_URL: 'http://127.0.0.1:8000',
        },
        shell: true
      });
    } else {
      log(`Starting packaged Web Server using Electron Node runtime (cwd: ${WEB_DIR})`);
      nextProc = spawn(process.execPath, [
        path.join(WEB_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'),
        'start'
      ], {
        cwd: WEB_DIR,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          BUILD_DIR: '.next-production',
          SESSION_SECRET: sessionSecret,
          DATABASE_URL: `file:${dbPath}`,
          UPLOAD_DIR: uploadDir,
          NLP_SERVICE_URL: 'http://127.0.0.1:8000',
        },
        shell: true
      });
    }
    setNextProcess(nextProc);

    nextProc.stdout.pipe(nextLogStream);
    nextProc.stderr.pipe(nextLogStream);

    nextProc.stdout.on('data', (data) => log(`[Next.js STDOUT] ${data}`));
    nextProc.stderr.on('data', (data) => log(`[Next.js STDERR] ${data}`));

    nextProc.on('close', (code) => {
      log(`Next.js server closed with code ${code}`);
    });

    // 5. Poll local server until it is fully active
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

module.exports = {
  bootServices,
  waitForServer,
  WEB_DIR,
  NLP_DIR
};
