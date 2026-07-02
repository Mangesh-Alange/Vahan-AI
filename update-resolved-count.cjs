const fs = require('fs');

let portalCode = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

// 1. Add resolvedAlertsCount
if (!portalCode.includes('const resolvedAlertsCount')) {
  portalCode = portalCode.replace(
    'const activeAlertsCount = alerts.filter(a => !a.resolved).length;',
    'const activeAlertsCount = alerts.filter(a => !a.resolved).length;\n  const resolvedAlertsCount = alerts.filter(a => a.resolved).length;'
  );
}

// 2. Update UI Card
const targetUI = `<span className="text-lg sm:text-2xl font-black text-red-600">{activeAlertsCount} Unresolved</span>`;
const newUI = `<div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg sm:text-2xl font-black text-red-600 leading-none">{activeAlertsCount} <span className="text-sm">Unresolved</span></span>
                      {resolvedAlertsCount > 0 && <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{resolvedAlertsCount} Resolved</span>}
                    </div>`;

portalCode = portalCode.replace(targetUI, newUI);

fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', portalCode);
console.log("Updated resolved alerts UI correctly");
