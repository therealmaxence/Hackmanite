const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Logger utility
const log = (msg, meta = {}) => {
  console.log(`[Electron Main][SessionSecret] ${msg}`, meta);
};

function getOrCreateSessionSecret() {
  const secretPath = path.join(app.getPath('userData'), 'session-secret.json');
  try {
    if (fs.existsSync(secretPath)) {
      const data = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
      if (data && data.secret && data.secret.length >= 32) {
        log("Loaded persistent session secret successfully.");
        return data.secret;
      }
    }
  } catch (e) {
    log("Failed to read persistent session secret, generating a new one...", { error: e.message });
  }

  const secret = crypto.randomBytes(32).toString('hex');

  try {
    fs.writeFileSync(secretPath, JSON.stringify({ secret }, null, 2), 'utf8');
    log("Created and persisted new session secret.");
  } catch (e) {
    log("Failed to persist session secret", { error: e.message });
  }
  return secret;
}

module.exports = { getOrCreateSessionSecret };
