const fs = require('fs');
let driverCode = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

// 1. Sync dark mode with document.documentElement
const syncEffect = `
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
`;
if (!driverCode.includes('document.documentElement.classList.add(\'dark\')')) {
  driverCode = driverCode.replace(
    'useEffect(() => {',
    syncEffect + '\n  useEffect(() => {'
  );
}

// 2. Change D icon onClick
const dIconStr = `<div className="h-9 w-9 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900 cursor-pointer" onClick={onLogout}>`;
const newDIconStr = `<div className="h-9 w-9 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900 cursor-pointer" onClick={() => setIsProfileOpen(true)}>`;
driverCode = driverCode.replace(dIconStr, newDIconStr);

fs.writeFileSync('src/driver-app/DriverApp.tsx', driverCode);
console.log('Fixed DriverApp settings');
