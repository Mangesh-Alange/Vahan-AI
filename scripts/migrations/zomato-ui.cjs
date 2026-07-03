const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Ensure MapPin is imported
if (!text.includes('MapPin,')) {
  text = text.replace(/import {([^}]+)} from 'lucide-react';/, 'import {$1, MapPin} from \'lucide-react\';');
}

// 1. Redesign Header
const oldHeaderRegex = /\{\/\* PWA Phone Header Frame \*\/\}[\s\S]*?(?=\{\/\* Primary Fatigue Critical Full-Screen Warning Flash \*\/\})/;
const newHeader = `{/* Zomato-style Premium Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <MapPin className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Current Route</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            NH-48, Pune Hwy
          </h1>
        </div>

        {/* Network & Sync Badge Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOnline(!isOnline)} 
            className={\`flex items-center justify-center h-8 w-8 rounded-full shadow-sm transition-colors \${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }\`}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </button>
          
          <button onClick={() => setDarkMode(!darkMode)} className="h-8 w-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm border border-slate-100 dark:border-slate-700">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <div className="h-9 w-9 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900 cursor-pointer" onClick={onLogout}>
            {user.name.charAt(0)}
          </div>
        </div>
      </div>

      `;

text = text.replace(oldHeaderRegex, newHeader);

// 2. Redesign the Welcome Driver and Vehicle Selector
const oldWelcomeRegex = /\{\/\* Welcome Driver Badge card \*\/\}[\s\S]*?(?=\{\/\* Tab View Stages \*\/\})/;
const newWelcome = `{/* Zomato-style Greeting & Vehicle Widget */}
        <div className="px-5 mb-6 mt-2">
          <h2 className="text-[26px] leading-tight font-black text-slate-900 dark:text-white mb-1">Hi, {user.name.split(' ')[0]} 👋</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">Ready for a safe journey today?</p>

          {/* Premium Vehicle Selector Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800/60 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <Truck className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Active Vehicle</p>
                {!registrationMode ? (
                  selectedVehicleId ? (
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {vehicles.find(v => v.id === selectedVehicleId)?.registration_number || "Select your truck"}
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-amber-500">No Truck Selected</div>
                  )
                ) : (
                  <div className="text-sm font-bold text-amber-500">Registering...</div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setRegistrationMode(!registrationMode)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              {registrationMode ? "Cancel" : "Change"}
            </button>
          </div>

          {/* Minimalist Registration Form */}
          {registrationMode && (
            <form onSubmit={handleRegisterVehicle} className="mt-4 p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Reg Number</label>
                  <input type="text" placeholder="MH-12-AB-1234" value={newVehicle.registration_number} onChange={(e) => setNewVehicle(prev => ({ ...prev, registration_number: e.target.value }))} className="w-full mt-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white p-3 rounded-2xl border-none focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Model</label>
                  <input type="text" placeholder="e.g. Signa" value={newVehicle.model} onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))} className="w-full mt-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white p-3 rounded-2xl border-none focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all active:scale-95">Register Truck</button>
            </form>
          )}
        </div>

        `;

text = text.replace(oldWelcomeRegex, newWelcome);

// 3. Make Common Issues a horizontal scrolling chip list
const oldIssuesRegex = /<div className="flex flex-wrap gap-1\.5">[\s\S]*?demoScenarios\.map[\s\S]*?<\/div>\s*<\/div>/;
const newIssues = `<div className="flex overflow-x-auto whitespace-nowrap hide-scrollbar gap-3 pb-4 pt-1 -mx-5 px-5">
                {demoScenarios.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSymptomText(scene.text);
                      setAudioSignalClass(scene.sound);
                      setSpeechStatus(\`Loaded: \${scene.title}\`);
                    }}
                    className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 hover:border-amber-500 dark:hover:border-amber-500 transition-all flex flex-col items-start gap-1 w-[140px] text-left active:scale-95"
                  >
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{scene.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">{scene.text}</p>
                  </button>
                ))}
              </div>
            </div>`;
text = text.replace(oldIssuesRegex, newIssues);

// Global Background Polish: Light mode background
text = text.replace(/bg-gradient-to-tr from-slate-100 via-slate-50 to-slate-200/, 'bg-[#F9FAFB]');
text = text.replace(/max-w-md mx-auto relative border-x/, 'max-w-md mx-auto relative sm:border-x');

// 4. Floating unified chat bar with heavy shadow
const chatRegex = /className="relative glass dark:bg-slate-900\/60 rounded-2xl border border-slate-200 dark:border-slate-700\/50 shadow-sm p-2 flex flex-col focus-within:border-amber-500\/50 focus-within:shadow-\[0_0_15px_rgba\(245,158,11,0\.1\)\] transition-all"/;
text = text.replace(chatRegex, 'className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] p-2.5 flex flex-col focus-within:border-amber-500/50 focus-within:shadow-[0_8px_30px_rgba(245,158,11,0.15)] transition-all"');

fs.writeFileSync(file, text);
