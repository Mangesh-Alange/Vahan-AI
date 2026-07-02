const fs = require('fs');

let portalCode = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

const searchLoadAllDataStart = "const [vRes, dRes, rRes, aRes, wRes, sRes, sosRes] = await Promise.all([";
const searchLoadAllDataEnd = "      if (sosData.alerts) {";

const replaceLoadAllData = `      const [vRes, dRes, rRes, aRes, wRes, sRes, sosRes, schedRes] = await Promise.all([
        fetch(\`/api/vehicles?org_id=\${user.org_id}\`),
        fetch(\`/api/drivers?org_id=\${user.org_id}\`),
        fetch(\`/api/fault-reports?org_id=\${user.org_id}\`),
        fetch(\`/api/fleet-alerts?org_id=\${user.org_id}\`),
        fetch('/api/service-centers'),
        fetch(\`/api/fatigue-events?org_id=\${user.org_id}\`),
        fetch(\`/api/sos-alerts?org_id=\${user.org_id}\`),
        fetch(\`/api/scheduled-services?org_id=\${user.org_id}\`)
      ]);

      const [vData, dData, rData, aData, wData, sData, sosData, schedData] = await Promise.all([
        vRes.json(), dRes.json(), rRes.json(), aRes.json(), wRes.json(), sRes.json(), sosRes.json(), schedRes.json()
      ]);

      if (vData.vehicles) setVehicles(vData.vehicles);
      if (dData.drivers) setDrivers(dData.drivers);
      if (rData.reports) setReports(rData.reports);
      if (aData.alerts) setAlerts(aData.alerts);
      if (wData.centers) setWorkshops(wData.centers);
      if (schedData.services) setScheduledServices(schedData.services);
      if (sData.events) {
        setSafetyLogs(sData.events);
        // Initialize processed set with existing IDs so only NEW ones trigger the alarm!
        setProcessedFatigueAlertIds(new Set(sData.events.map((e: FatigueEvent) => e.id)));
      }
      if (sosData.alerts) {`;

portalCode = portalCode.replace(/const \[vRes, dRes, rRes, aRes, wRes, sRes, sosRes\] = await Promise\.all\(\[[\s\S]*?if \(sosData\.alerts\) \{/, replaceLoadAllData);

// Now for the "Active Patterns 0 Unresolved" issue.
// The user wants it to say "1 Unresolved" or something, based on unresolved alerts.
// Wait, the "0 Unresolved" is in `activeAlertsCount`.
// Wait, alerts are `FleetAlert[]`. If `alerts` is empty, it says "0 Unresolved". That is correct.
// However, the user said: "also the resolved should update according to thte history and show proper count of resolved and unresolved"
// Let's check how activeAlertsCount is computed.
// `const activeAlertsCount = alerts.filter(a => !a.resolved).length;`
// How is resolved count computed? Maybe there is no resolved count displayed. Let's look for "Unresolved" in the code.

fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', portalCode);
console.log("loadAllData updated!");
