const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Replace bottom navbar styling
const oldNav = '<div className="bg-slate-950/90 backdrop-blur-xl border-t border-white/10 p-4 pb-8 shadow-2xl shrink-0 z-20 relative">';
const newNav = '<div className="bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 p-4 pb-8 shadow-[0_-10px_40px_rgb(0,0,0,0.05)] shrink-0 z-20 relative">';

text = text.replace(oldNav, newNav);

// Update specific active states
text = text.replace(/text-amber-500/g, 'text-amber-600 dark:text-amber-500');
text = text.replace(/text-slate-500 hover:text-slate-300/g, 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300');

fs.writeFileSync(file, text);
