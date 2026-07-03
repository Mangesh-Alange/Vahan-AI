const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// 1. Add state variable
if (!text.includes('const [isProfileOpen, setIsProfileOpen]')) {
  text = text.replace(/const \[activeTab, setActiveTab\] = useState.*?;/, "$&\n  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);");
}

// 2. Replace Header Controls
const oldHeaderRegex = /\{\/\* Network & Sync Badge Controls \*\/\}[\s\S]*?(?=<\/div>\s*<\/div>\s*\{\/\* Zomato-style Greeting)/;
const newHeader = `{/* Profile Button */}
        <div 
          className="h-10 w-10 bg-slate-900 dark:bg-slate-100 rounded-full flex shadow-lg items-center justify-center text-white dark:text-slate-900 font-bold border-2 border-white dark:border-slate-800 cursor-pointer active:scale-95 transition-transform" 
          onClick={() => setIsProfileOpen(true)}
        >
          {user.name.charAt(0)}
        </div>
`;
text = text.replace(oldHeaderRegex, newHeader);

// 3. Inject the Profile Drawer Right before the PWA Phone Header Frame
// Actually, it's safer to put it inside the root div, let's put it right after `<div className="h-[100dvh]...`

const rootDivRegex = /(<div className=\{`h-\[100dvh\].*?`\}>)/;
const profileDrawer = `
      {/* Profile & Settings Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col overflow-y-auto"
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Your Profile</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                <div className="h-16 w-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-900">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{user.name}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{user.phone}</p>
                  <div className="inline-block mt-2 px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider rounded">Driver Pro</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">12</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trips Completed</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">{historyReports.length}</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Faults Reported</p>
                </div>
              </div>

              {/* Settings List */}
              <div className="flex flex-col">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Settings</h4>
                
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors rounded-2xl cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                      {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-[10px] text-slate-500">Toggle app appearance</p>
                    </div>
                  </div>
                  <div className={\`w-10 h-6 rounded-full p-1 transition-colors \${darkMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}\`}>
                    <div className={\`w-4 h-4 bg-white rounded-full shadow-sm transition-transform \${darkMode ? 'translate-x-4' : 'translate-x-0'}\`} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors rounded-2xl cursor-pointer" onClick={() => setIsOnline(!isOnline)}>
                  <div className="flex items-center gap-3">
                    <div className={\`p-2.5 rounded-xl \${isOnline ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}\`}>
                      {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{isOnline ? 'Online Mode' : 'Offline Mode'}</p>
                      <p className="text-[10px] text-slate-500">Force offline testing</p>
                    </div>
                  </div>
                  <div className={\`w-10 h-6 rounded-full p-1 transition-colors \${isOnline ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}\`}>
                    <div className={\`w-4 h-4 bg-white rounded-full shadow-sm transition-transform \${isOnline ? 'translate-x-4' : 'translate-x-0'}\`} />
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={onLogout}
                className="mt-6 w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 font-black rounded-2xl shadow-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
`;

text = text.replace(rootDivRegex, "$1\n" + profileDrawer);

fs.writeFileSync(file, text);
