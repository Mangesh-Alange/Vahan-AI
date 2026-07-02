const fs = require('fs');

let dbCode = fs.readFileSync('server/db.ts', 'utf8');

// 1. Missing scheduled_services
dbCode = dbCode.replace(
  'fatigue_events,\n      sos_alerts: []\n    };',
  'fatigue_events,\n      sos_alerts: [],\n      scheduled_services: []\n    };'
);

// 2. new Date().toISOString()
dbCode = dbCode.replace(
  'created_at: Date.now()',
  'created_at: new Date().toISOString()'
);

// 3. saveData -> save
dbCode = dbCode.replace(
  'this.saveData();',
  'this.save();'
);

fs.writeFileSync('server/db.ts', dbCode);


let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  'severity: parsed.severity,',
  'severity: parsed.severity as any,'
);

serverCode = serverCode.replace(
  'db.addSosAlert("org_rajpath", reason);',
  'db.addSosAlert("org_rajpath", reason as string);'
);

fs.writeFileSync('server.ts', serverCode);

console.log('Fixed compile errors!');
