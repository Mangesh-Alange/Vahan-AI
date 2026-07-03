const fs = require('fs');

let portalCode = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

// 1. Add state variable
if (!portalCode.includes('const [scheduledServices')) {
  portalCode = portalCode.replace(
    'const [workshops, setWorkshops] = useState<ServiceCenter[]>([]);',
    `const [workshops, setWorkshops] = useState<ServiceCenter[]>([]);
  const [scheduledServices, setScheduledServices] = useState<any[]>([]);`
  );
}

// 2. Add fetch logic
if (!portalCode.includes('/api/scheduled-services')) {
  portalCode = portalCode.replace(
    "fetch(`/api/fatigue-events?org_id=${user.org_id}`)",
    "fetch(`/api/fatigue-events?org_id=${user.org_id}`),\n        fetch(`/api/scheduled-services?org_id=${user.org_id}`)"
  );
  
  portalCode = portalCode.replace(
    "const [vData, dData, rData, aData, wData, sData] = await Promise.all",
    "const [vData, dData, rData, aData, wData, sData, servData] = await Promise.all"
  );
  
  portalCode = portalCode.replace(
    "if (sData.events) {",
    `if (servData && servData.services) setScheduledServices(servData.services);
      if (sData.events) {`
  );
}

// 3. Add to UI overview tab
if (!portalCode.includes('Scheduled Predictive Maintenance')) {
  const maintenanceWidget = `
              {/* Scheduled Services Widget */}
              {scheduledServices.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-sm">
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
  
  // We will insert it just above "Recent AI Breakdown Alerts" section which is inside activeTab === 'overview'
  portalCode = portalCode.replace(
    '<div className="glass p-5 rounded-3xl border border-white/40 shadow-xl flex flex-col h-[400px]">',
    maintenanceWidget + '\n<div className="glass p-5 rounded-3xl border border-white/40 shadow-xl flex flex-col h-[400px]">'
  );
}

// Need to import Wrench icon from lucide-react if not there
if (!portalCode.includes('Wrench')) {
  portalCode = portalCode.replace('WifiOff, Check }', 'WifiOff, Check, Wrench }');
}

fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', portalCode);
console.log("Updated FleetPortal.tsx");
