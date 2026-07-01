const fs = require('fs');
let code = fs.readFileSync('src/fleet-portal/FleetPortal.tsx', 'utf8');

const targetContent = `              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" /> Urgent Cross-Vehicle Pattern Alerts
              </h3>
              
              <div className="space-y-2">`;

const replacementContent = `              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" /> Urgent Cross-Vehicle Pattern Alerts
              </h3>
              
              {/* Macro Intelligence Map visualization */}
              <div className="w-full h-64 bg-slate-900 rounded-xl relative overflow-hidden border border-slate-700 shadow-inner mb-4 flex items-center justify-center">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 
                 {/* Fake Map Elements */}
                 <div className="absolute top-10 left-10 text-slate-700 text-[10px] font-mono">NH-44 Corridor</div>
                 <div className="absolute bottom-12 right-20 text-slate-700 text-[10px] font-mono">Pune-Mumbai Expressway</div>
                 
                 <div className="text-center z-10 pointer-events-none">
                   <Map className="h-12 w-12 text-slate-500 mx-auto mb-2 opacity-50" />
                   <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm">Macro-Intelligence Map</h3>
                 </div>
                 {alerts.filter(a => !a.resolved).map((a, i) => {
                    const top = 20 + Math.random() * 60;
                    const left = 20 + Math.random() * 60;
                    return (
                    <div key={i} className="absolute flex flex-col items-center animate-bounce" style={{ top: \`\${top}%\`, left: \`\${left}%\` }}>
                       <div className="h-6 w-6 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500 relative">
                         <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                         <div className="h-2 w-2 rounded-full bg-red-500"></div>
                       </div>
                       <span className="text-[8px] bg-slate-950 text-red-400 mt-1 px-1 rounded shadow border border-red-500/30 font-bold max-w-[100px] truncate">{a.id.includes('sos') ? 'SOS Alert' : 'Federated Fault Hotspot'}</span>
                    </div>
                 )})}
              </div>
              
              <div className="space-y-2">`;

code = code.replace(targetContent, replacementContent);
fs.writeFileSync('src/fleet-portal/FleetPortal.tsx', code);
