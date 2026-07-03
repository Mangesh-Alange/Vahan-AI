const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// The class we want to replace
const targetClass = 'className="glass dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm"';

// First occurrence -> 'className="space-y-4"'
text = text.replace(targetClass, 'className="space-y-4"');

// Second occurrence -> 'className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50"'
text = text.replace(targetClass, 'className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50"');

// Third occurrence -> 'className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50"'
text = text.replace(targetClass, 'className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50"');

fs.writeFileSync(file, text);
console.log('Flattened UI elements');
