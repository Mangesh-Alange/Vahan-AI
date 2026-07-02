const fs = require('fs');
let code = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

const badStr = "      const res = await fetch(`/api/fatigue-events?org_id=${user.org_id}`),\r\n        fetch(`/api/scheduled-services?org_id=${user.org_id}`);";
const goodStr = "      const res = await fetch(`/api/fatigue-events?org_id=${user.org_id}`);";

const badStr2 = "      const res = await fetch(`/api/fatigue-events?org_id=${user.org_id}`),\n        fetch(`/api/scheduled-services?org_id=${user.org_id}`);";

code = code.replace(badStr, goodStr).replace(badStr2, goodStr);
fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', code);
console.log("Fixed!");
