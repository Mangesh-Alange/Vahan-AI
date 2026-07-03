const fs = require('fs');

let code = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

// Add state
code = code.replace(
  /const \[registrationMode, setRegistrationMode\] = useState<boolean>\(false\);/g,
  "const [registrationMode, setRegistrationMode] = useState<boolean>(false);\n  const [isInspectionScheduled, setIsInspectionScheduled] = useState<boolean>(false);\n  const [isInspectionDismissed, setIsInspectionDismissed] = useState<boolean>(false);"
);

// Replace the widget rendering condition and the success handling
code = code.replace(
  /\{\/\* Predictive AI Health Widget \*\/\}\s*<div className="glass dark:bg-slate-800\/50 p-4 rounded-xl border border-amber-500\/30 bg-gradient-to-br from-amber-500\/10 to-orange-500\/5 relative overflow-hidden">/g,
  `{/* Predictive AI Health Widget */}\n              {!isInspectionDismissed && !isInspectionScheduled && (\n              <div className="glass dark:bg-slate-800/50 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 relative overflow-hidden">`
);

code = code.replace(
  /if \(res\.ok\) \{\s*alert\('Inspection scheduled successfully! The fleet manager has been notified\.'\);\s*btn\.parentElement\?\.parentElement\?\.remove\(\);\s*\} else \{/g,
  `if (res.ok) {\n                        setIsInspectionScheduled(true);\n                        alert('Inspection scheduled successfully! The fleet manager has been notified.');\n                      } else {`
);

code = code.replace(
  /<button onClick=\{\(e\) => \(e\.target as HTMLElement\)\.parentElement\?\.parentElement\?\.remove\(\)\} className="glass dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-\[9px\] font-bold px-3 py-1\.5 rounded-full hover:bg-slate-700 transition-colors">Dismiss<\/button>\s*<\/div>\s*<\/div>/g,
  `<button onClick={() => setIsInspectionDismissed(true)} className="glass dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-[9px] font-bold px-3 py-1.5 rounded-full hover:bg-slate-700 transition-colors">Dismiss</button>\n                </div>\n              </div>\n              )}`
);

// Add the success state widget
code = code.replace(
  /\{\/\* Onboarding Diagnostic input box \*\/\}/g,
  `{isInspectionScheduled && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-500">Inspection Scheduled</h4>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">The fleet manager has been notified and service is logged.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsInspectionScheduled(false)} className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold text-xs px-2">Hide</button>
                </div>
              )}
              
              {/* Onboarding Diagnostic input box */}`
);

fs.writeFileSync('src/driver-app/DriverApp.tsx', code);
console.log('Fixed DriverApp inline widget success state');
