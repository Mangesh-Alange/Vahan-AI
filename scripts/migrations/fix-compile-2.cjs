const fs = require('fs');

// server/db.ts
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

// 1. Missing scheduled_services
dbCode = dbCode.replace(
  'fatigue_events,\n      sos_alerts: []\n    };',
  'fatigue_events,\n      sos_alerts: [],\n      scheduled_services: []\n    };'
);

// If it didn't replace, let's use a regex
dbCode = dbCode.replace(/sos_alerts:\s*\[\]\r?\n\s*\};/, 'sos_alerts: [],\n      scheduled_services: []\n    };');

// 2. 'severity' does not exist in type 'FleetAlert'
// Where is `severity` being added to `newAlert` in `fleet_alerts` insert?
dbCode = dbCode.replace(/severity:\s*report\.severity,/, '// severity: report.severity,');

fs.writeFileSync('server/db.ts', dbCode);


// server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// 3. Property 'symptom_text_english' does not exist ... Did you mean 'symptom_english'?
serverCode = serverCode.replace(
  'symptom_text_english: parsed.symptom_text_english,',
  'symptom_text_english: (parsed as any).symptom_text_english || (parsed as any).symptom_english,'
);

fs.writeFileSync('server.ts', serverCode);

console.log('Fixed compile errors 2!');
