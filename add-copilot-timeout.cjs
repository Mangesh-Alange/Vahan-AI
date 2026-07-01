const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
  /const res = await fetch\('\/api\/driver-copilot', \{/,
  "const controller = new AbortController();\n      const timeoutId = setTimeout(() => controller.abort(), 10000);\n      const res = await fetch('/api/driver-copilot', {\n        signal: controller.signal,"
);

text = text.replace(
  /\}\);\n\s*const data = await res\.json\(\);/g,
  "});\n      clearTimeout(timeoutId);\n      const data = await res.json();"
);

fs.writeFileSync(file, text);
