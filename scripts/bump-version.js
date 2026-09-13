const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const desktopPkgPath = path.join(rootDir, 'apps', 'desktop', 'package.json');
const webPkgPath = path.join(rootDir, 'apps', 'web', 'package.json');
const websitePkgPath = path.join(rootDir, 'website', 'package.json');
const readmePath = path.join(rootDir, 'README.md');

function parseSemver(versionStr) {
  const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid semver string: ${versionStr}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

function calculateNextVersion(currentVersion, bumpType = 'patch') {
  if (/^\d+\.\d+\.\d+/.test(bumpType)) {
    return bumpType;
  }

  const semver = parseSemver(currentVersion);
  switch (bumpType.toLowerCase()) {
    case 'major':
      return `${semver.major + 1}.0.0`;
    case 'minor':
      return `${semver.major}.${semver.minor + 1}.0`;
    case 'patch':
    default:
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
  }
}

function updateJsonVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  json.version = newVersion;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

function updateReadmeVersion(filePath, oldVersion, newVersion) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    new RegExp(`> \\*\\*Version ${oldVersion.replace(/\./g, '\\.')}\\*\\*`, 'g'),
    `> **Version ${newVersion}**`
  );
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  const bumpType = process.argv[2] || 'patch';
  const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
  const currentVersion = desktopPkg.version;
  const newVersion = calculateNextVersion(currentVersion, bumpType);

  updateJsonVersion(desktopPkgPath, newVersion);
  updateJsonVersion(webPkgPath, newVersion);
  updateJsonVersion(websitePkgPath, newVersion);
  updateReadmeVersion(readmePath, currentVersion, newVersion);

  console.log(`Version updated from ${currentVersion} to ${newVersion}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `current_version=${currentVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=v${newVersion}\n`);
  }
}

main();
