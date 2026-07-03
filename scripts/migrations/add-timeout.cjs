const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  /const res = await fetch\('\/api\/fault-reports', \{\s*method: 'POST',/,
  "const controller = new AbortController();\n        const timeoutId = setTimeout(() => controller.abort(), 10000);\n        const res = await fetch('/api/fault-reports', {\n          signal: controller.signal,\n          method: 'POST',"
);

text = text.replace(
  /\}\);\n\s*const data = await res\.json\(\);/,
  "});\n        clearTimeout(timeoutId);\n        const data = await res.json();"
);

fs.writeFileSync(file, text);
