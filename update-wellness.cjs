const fs = require('fs');
let code = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

// 1. Update the nav bar grid to col-cols-5
code = code.replace(
  'grid-cols-4 shrink-0 z-10">',
  'grid-cols-5 shrink-0 z-10">'
);

// 2. Add the Wellness tab button
const historyButtonTarget = `        <button 
          onClick={() => {
            setActiveTab('history');
            stopAcousticCapture();
            stopFatigueMonitoring();
          }}
          className={\`flex flex-col items-center justify-center py-2 gap-1 transition-colors \${
            activeTab === 'history' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }\`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">पिछली रिपोर्ट</span>
        </button>
      </div>`;

const historyButtonReplacement = `        <button 
          onClick={() => {
            setActiveTab('history');
            stopAcousticCapture();
            stopFatigueMonitoring();
          }}
          className={\`flex flex-col items-center justify-center py-2 gap-1 transition-colors \${
            activeTab === 'history' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }\`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">रिपोर्ट</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('wellness');
            stopAcousticCapture();
            stopFatigueMonitoring();
          }}
          className={\`flex flex-col items-center justify-center py-2 gap-1 transition-colors \${
            activeTab === 'wellness' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }\`}
        >
          <Sparkles className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">वेलनेस</span>
        </button>
      </div>`;

code = code.replace(historyButtonTarget, historyButtonReplacement);

// 3. Add Predictive Health Widget to Diagnose Tab
const predictWidget = `
              {/* Predictive AI Health Widget */}
              <div className="glass dark:bg-slate-800/50 p-4 rounded-xl border border-amber-500/30 mb-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Activity className="h-16 w-16" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Predictive Health (BETA)</h3>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Based on 85,400km mileage and recent overheating pattern across 4 Tata Prima trucks in Rajpath Logistics, your <strong className="text-amber-600 dark:text-amber-400">Radiator Coolant Pump</strong> has a 78% probability of failure in the next 450km.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="bg-amber-500 text-slate-950 text-[9px] font-bold px-3 py-1.5 rounded-full">Schedule Inspection</button>
                  <button className="glass dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-[9px] font-bold px-3 py-1.5 rounded-full">Dismiss</button>
                </div>
              </div>
`;

// Insert it right after: <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI DIAGNOSE</h2>
code = code.replace(
  '<h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI DIAGNOSE</h2>',
  '<h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI DIAGNOSE</h2>' + predictWidget
);

// 4. Add the Wellness Tab content
const wellnessTabContent = `
        {activeTab === 'wellness' && (
          <div className="space-y-4">
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Safety Score</h3>
                  <p className="text-[10px] text-slate-500">Based on Fatigue AI & Telematics</p>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">92</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">Total Safe KMS</span>
                  <span className="font-bold text-slate-900 dark:text-white">45,210 km</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">Fatigue Interventions</span>
                  <span className="font-bold text-slate-900 dark:text-white">2 (Followed Protocol)</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-xl text-slate-950 shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-20">
                <Sparkles className="h-32 w-32" />
              </div>
              <h3 className="text-lg font-black mb-1">Rajpath Rewards</h3>
              <div className="text-3xl font-black mb-3">1,450 pts</div>
              <p className="text-[10px] font-bold opacity-80 mb-4 max-w-[200px]">You are 50 points away from a free Hot Meal at NH-44 Dhaba!</p>
              <button className="bg-slate-950 text-amber-500 font-bold text-[10px] px-4 py-2 rounded-full shadow-lg">
                Redeem Rewards
              </button>
            </div>
          </div>
        )}
`;

// Insert it right before {/* Offline Background Sync */}
code = code.replace(
  '{/* Offline Background Sync */}',
  wellnessTabContent + '\n        {/* Offline Background Sync */}'
);

code = code.replace(
  "const [activeTab, setActiveTab] = useState<'diagnose' | 'acoustic' | 'fatigue' | 'history'>('diagnose');",
  "const [activeTab, setActiveTab] = useState<'diagnose' | 'acoustic' | 'fatigue' | 'history' | 'wellness'>('diagnose');"
);

fs.writeFileSync('src/driver-app/DriverApp.tsx', code);
