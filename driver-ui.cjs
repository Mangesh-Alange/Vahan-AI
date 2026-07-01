const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// 1. Add darkMode state
if (!text.includes('const [darkMode, setDarkMode] = useState')) {
  text = text.replace(/const \[isOnline, setIsOnline\] = useState<boolean>\(true\);/, 'const [isOnline, setIsOnline] = useState<boolean>(true);\n  const [darkMode, setDarkMode] = useState<boolean>(true);');
}

// 2. Add dark mode toggle button to the header
// The header contains <div className="flex items-center gap-2"> followed by the isOnline button
text = text.replace(
  /<div className=\"flex items-center gap-2\">\s*<button\s*onClick={\(\) => setIsOnline\(!isOnline\)}/m,
  `<div className="flex items-center gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-full hover:bg-slate-800/50 text-slate-300 transition-colors" title="Toggle Theme">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button 
            onClick={() => setIsOnline(!isOnline)}`
);

// Ensure Sun, Moon, FileText are imported from lucide-react
if (!text.includes('Sun,')) {
  text = text.replace(/import {([^}]+)} from 'lucide-react';/, 'import {$1, Sun, Moon, FileText} from \'lucide-react\';');
}

// 3. Apply the dynamic dark mode class to the main wrapper
text = text.replace(/className=\"min-h-screen transition-colors duration-500 bg-slate-50 bg-gradient-to-tr from-slate-100 via-slate-50 to-slate-200 dark:bg-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black text-slate-800 dark:text-slate-200 flex flex-col font-sans max-w-md mx-auto relative border-x border-slate-200 dark:border-white\/10 shadow-2xl overflow-hidden\"/, 'className={`min-h-screen transition-colors duration-500 flex flex-col font-sans max-w-md mx-auto relative border-x shadow-2xl overflow-hidden ${darkMode ? \\'dark bg-slate-950 bg-gradient-to-tr from-slate-950 via-slate-900 to-black text-slate-200 border-white/10\\' : \\'bg-slate-50 bg-gradient-to-tr from-slate-100 via-slate-50 to-slate-200 text-slate-800 border-slate-200\\'}`}');

// 4. Fix Option A flex stretching issue
text = text.replace(/<div className=\"flex gap-2\">/g, '<div className="flex items-center gap-3">');

// 5. Fix Option A inner text box muddiness
text = text.replace(/className=\"flex-1 glass dark:bg-slate-800\/50 border border-slate-200 dark:border-white\/10 shadow-sm transition-colors rounded-xl p-3 min-h-\\[4\\.5rem\\] flex flex-col justify-center\"/g, 'className="flex-1 bg-white/60 dark:bg-slate-900/50 shadow-inner rounded-xl p-3 min-h-[4.5rem] flex flex-col justify-center border border-slate-200 dark:border-slate-700/50 transition-colors"');

// 6. Make Option A text pop more
text = text.replace(/<p className=\"text-\\[9px\\] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider\">Option A: Speak to Gemini AI<\/p>/g, '<p className="text-[10px] text-slate-800 dark:text-slate-200 font-black uppercase tracking-widest flex items-center gap-1.5 mb-2"><Sparkles className="h-3 w-3 text-amber-500"/> Option A: Voice AI</p>');

// 7. Make Option B text pop more
text = text.replace(/<p className=\"text-\\[9px\\] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider\">Option B: Type Symptoms<\/p>/g, '<p className="text-[10px] text-slate-800 dark:text-slate-200 font-black uppercase tracking-widest flex items-center gap-1.5 mb-2"><FileText className="h-3 w-3 text-amber-500"/> Option B: Type Symptoms</p>');

fs.writeFileSync(file, text);
console.log('Driver UI Refactor complete');
