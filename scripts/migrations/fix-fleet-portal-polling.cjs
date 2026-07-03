const fs = require('fs');

let code = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

// Modify loadSosAlertsOnly to also fetch scheduled-services
code = code.replace(
  /const loadSosAlertsOnly = async \(\) => \{\s*if \(\!user\.org_id\) return;\s*try \{/g,
  `const loadSosAlertsOnly = async () => {\n    if (!user.org_id) return;\n    try {\n      const schedRes = await fetch(\`/api/scheduled-services?org_id=\${user.org_id}\`);\n      const schedData = await schedRes.json();\n      if (schedData.services) setScheduledServices(schedData.services);`
);

fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', code);
console.log('Added scheduled services polling to FleetPortal');
