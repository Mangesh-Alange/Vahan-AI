const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Replace outer wrapper
text = text.replace(/className="min-h-screen.*?"/, 'className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-800/80 bg-gradient-to-tr from-slate-100 via-slate-50 to-slate-200 dark:bg-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black text-slate-800 dark:text-slate-200 flex flex-col font-sans max-w-md mx-auto relative border-x border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"');

// Replace inner glass wrappers that currently say glass-dark
text = text.replace(/glass-dark/g, 'glass dark:bg-slate-800/50 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm');
text = text.replace(/glass /g, 'glass '); // Leave existing glass alone

text = text.replace(/text-neutral-100/g, 'text-slate-900 dark:text-slate-100');
text = text.replace(/text-neutral-200/g, 'text-slate-800 dark:text-slate-200');
text = text.replace(/text-neutral-300/g, 'text-slate-700 dark:text-slate-300');
text = text.replace(/text-neutral-400/g, 'text-slate-600 dark:text-slate-400');
text = text.replace(/text-neutral-500/g, 'text-slate-500 dark:text-slate-500');
text = text.replace(/text-neutral-600/g, 'text-slate-400 dark:text-slate-600');

text = text.replace(/bg-neutral-950/g, 'bg-slate-50 dark:bg-slate-800/80');
text = text.replace(/bg-neutral-900/g, 'bg-slate-100 dark:bg-slate-700/60');
text = text.replace(/bg-neutral-850/g, 'bg-slate-100 dark:bg-slate-750');
text = text.replace(/bg-neutral-800/g, 'bg-slate-200 dark:bg-slate-700/60');
text = text.replace(/bg-neutral-750/g, 'bg-slate-200 dark:bg-slate-600');
text = text.replace(/bg-neutral-700/g, 'bg-slate-300 dark:bg-slate-600');

text = text.replace(/border-neutral-900/g, 'border-slate-200 dark:border-slate-800');
text = text.replace(/border-neutral-850/g, 'border-slate-200 dark:border-slate-700');
text = text.replace(/border-neutral-800/g, 'border-slate-200 dark:border-slate-700');
text = text.replace(/border-neutral-750/g, 'border-slate-300 dark:border-slate-600');
text = text.replace(/border-neutral-700/g, 'border-slate-300 dark:border-slate-600');

text = text.replace(/border-white\/10/g, 'border-slate-200 dark:border-white/10');

// Fix text-white
text = text.replace(/text-white/g, 'text-slate-900 dark:text-white');

// Fix red/amber buttons where we just replaced text-white
text = text.replace(/bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white/g, 'bg-red-600 hover:bg-red-700 text-white');
text = text.replace(/bg-amber-500 hover:bg-amber-600 text-neutral-950/g, 'bg-amber-500 hover:bg-amber-600 text-slate-900');

fs.writeFileSync(file, text);
console.log("Done");
