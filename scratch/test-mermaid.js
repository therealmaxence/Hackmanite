const fs = require('fs');
const path = require('path');

const wikiDir = path.join(__dirname, '../src/content/wiki');
const files = fs.readdirSync(wikiDir).filter(f => f.endsWith('.md'));

console.log('Checking markdown files for Mermaid blocks...');

files.forEach(file => {
  const content = fs.readFileSync(path.join(wikiDir, file), 'utf8');
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  let match;
  let count = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    count++;
    console.log(`\nFound Mermaid block #${count} in ${file}:`);
    console.log(match[1].trim());
  }
});
