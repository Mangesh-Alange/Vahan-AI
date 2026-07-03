const fs = require('fs');

let vc = fs.readFileSync('vite.config.ts', 'utf8');
vc = vc.replace(
  "ignored: ['**/data/**']",
  "ignored: ['**/data/**', '**/*_db.json', '**/vahanai_db.json']"
);
fs.writeFileSync('vite.config.ts', vc);

let s = fs.readFileSync('server.ts', 'utf8');
s = s.replace(/gemini-1\.5-flash/g, 'gemini-2.5-flash');
fs.writeFileSync('server.ts', s);

let l = fs.readFileSync('server/langgraph-agents.ts', 'utf8');
l = l.replace(/gemini-1\.5-flash/g, 'gemini-2.5-flash');
fs.writeFileSync('server/langgraph-agents.ts', l);
