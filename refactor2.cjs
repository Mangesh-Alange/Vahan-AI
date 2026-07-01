const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Header wrapper
text = text.replace(
  /className=\"glass dark:bg-slate-800\/50 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-white\/10 shrink-0\"/g,
  'className=\"bg-slate-950/90 backdrop-blur-xl border-b border-white/10 text-white px-4 py-4 flex items-center justify-between shadow-lg shrink-0 z-20 relative\"'
);

// We need to fix the text color in the header since it's now a dark header
text = text.replace(
  /text-slate-900 dark:text-white flex items-center gap-1.5/g,
  'text-white flex items-center gap-1.5'
);

// We need to fix the subtitle in the header
text = text.replace(
  /text-slate-600 dark:text-slate-400\">Secure Fleet/g,
  'text-slate-400\">Secure Fleet'
);

// We need to make the Option A button orange box look more premium
text = text.replace(/bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl/g, 'bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20');
text = text.replace(/bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex/g, 'bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-lg shadow-amber-500/20');

// Make the inputs look glassier
text = text.replace(/bg-slate-50 dark:bg-slate-800\/80 text-xs text-slate-900 dark:text-white px-3/g, 'bg-white dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white px-3 shadow-inner');

fs.writeFileSync(file, text);
