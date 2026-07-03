const fs = require('fs');

let portalCode = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

// 1. State
if (!portalCode.includes('const [scheduledServices')) {
  portalCode = portalCode.replace(
    'const [workshops, setWorkshops] = useState<ServiceCenter[]>([]);',
    `const [workshops, setWorkshops] = useState<ServiceCenter[]>([]);\n  const [scheduledServices, setScheduledServices] = useState<any[]>([]);`
  );
}

// 2. Fetch in loadAllData
const loadAllDataStart = "const [vRes, dRes, rRes, aRes, wRes, sRes, sosRes] = await Promise.all([";
const replaceLoadAllData = `const [vRes, dRes, rRes, aRes, wRes, sRes, sosRes, schedRes] = await Promise.all([
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


// 3. UI Widget placement
const widget = `
              {/* Scheduled Services Widget */}
              {scheduledServices.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-sm mt-6 mb-6">
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Wrench className="h-4.5 w-4.5" /> Scheduled Predictive Maintenance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {scheduledServices.map((svc, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-800 dark:text-slate-200">{svc.vehicle_id}</span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">Upcoming</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1 line-clamp-2">{svc.reason}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{new Date(svc.scheduled_date).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
`;

// we inject it right before `<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">`
// Let's use string split and join to insert it safely.
const targetLine = '<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">';
if (!portalCode.includes('Scheduled Predictive Maintenance')) {
  // It appears multiple times, but the first one inside OVERVIEW TAB is what we want.
  // We can look for `<!-- Dynamic Grid: Recent Faults + Low EAR warnings -->` or similar.
  // Actually, let's inject it after `<div className="grid grid-cols-1 xl:grid-cols-3 gap-6"> ... </div>` ends.
  portalCode = portalCode.replace(
    /<\/div>\s*\{\/\* Dynamic Grid: Recent Faults \+ Low EAR warnings \*\/\}/s,
    `</div>\n\n${widget}\n\n              {/* Dynamic Grid: Recent Faults + Low EAR warnings */}`
  );
}

// Ensure Wrench is imported
if (!portalCode.includes('Wrench')) {
  portalCode = portalCode.replace('WifiOff, Check }', 'WifiOff, Check, Wrench }');
  portalCode = portalCode.replace('Sun, Moon }', 'Sun, Moon, Wrench }');
}

fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', portalCode);
console.log("Updated correctly");
