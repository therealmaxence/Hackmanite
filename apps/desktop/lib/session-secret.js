const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const log = (msg, err) => console.log(`[Electron Main][SessionSecret] ${msg}`, err ? { error: err.message } : {});

function getOrCreateSessionSecret() {
  const file = path.join(app.getPath('userData'), 'session-secret.json');
  try {
    if (fs.existsSync(file)) {
      const { secret } = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (secret && secret.length >= 32) return log("Loaded persistent session secret successfully."), secret;
    }
  } catch (e) {
    log("Failed to read persistent session secret, generating a new one...", e);
  }
  const secret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(file, JSON.stringify({ secret }), 'utf8');
    log("Created and persisted new session secret.");
  } catch (e) {
    log("Failed to persist session secret", e);
  }
  return secret;
}

module.exports = { getOrCreateSessionSecret };
