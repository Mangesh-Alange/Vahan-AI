const fs = require('fs');
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

dbCode = dbCode.replace(
  /pattern_description:\s*'SOS EMERGENCY ALERT:\s*'\s*\+\s*reason,\s*severity:\s*'high',/,
  "pattern_description: 'SOS EMERGENCY ALERT: ' + reason,"
);

fs.writeFileSync('server/db.ts', dbCode);
console.log('Fixed severity in db.ts cleanly');
