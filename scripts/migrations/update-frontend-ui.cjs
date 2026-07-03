const fs = require('fs');
let code = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

// 1. Add image_base64 to Diagnostic payload
code = code.replace(
  'symptom_text_hindi: symptomText,\r\n            acoustic_signal_class: audioSignalClass',
  'symptom_text_hindi: symptomText,\n            acoustic_signal_class: audioSignalClass,\n            image_base64: selectedImage'
);

// 2. Add action object to ChatMessage interface if it exists, or just use any.
// The render block needs to handle msg.action.
const chatRenderTarget = `                  <div
                    key={index}
                    className={\`flex flex-col text-[10px] rounded p-2 \${
                      msg.role === 'user'
                        ? 'bg-slate-200 dark:bg-slate-700/60 text-slate-900 dark:text-white ml-6'
                        : 'bg-amber-950/20 text-slate-800 dark:text-slate-200 border-l-2 border-amber-500 mr-6'
                    }\`}
                  >
                    <span className="font-bold text-[8px] uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                      {msg.role === 'user' ? 'Aap' : 'VahanAI Copilot'}
                    </span>
                    <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>`;

const chatRenderReplacement = `                  <div key={index} className={\`flex flex-col text-[10px] rounded p-2 \${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700/60 text-slate-900 dark:text-white ml-6' : 'bg-amber-950/20 text-slate-800 dark:text-slate-200 border-l-2 border-amber-500 mr-6'}\`}>
                    <span className="font-bold text-[8px] uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                      {msg.role === 'user' ? 'Aap' : 'VahanAI Copilot'}
                    </span>
                    <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                    {(msg as any).action && (msg as any).action.type === 'OPEN_MAPS' && (
                      <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                            <MapPin className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Tata Motors Service Hub</h4>
                            <p className="text-[9px] text-slate-500 mt-0.5">NH-44 Bypass Road • 2.4 km away</p>
                            <button 
                              onClick={() => window.location.assign((msg as any).action.url)}
                              className="mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-full font-bold text-[9px] flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Navigation className="h-3 w-3" />
                              Start Navigation
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>`;

// Note: I have to import MapPin and Navigation if not imported.
code = code.replace(chatRenderTarget, chatRenderReplacement);

if (!code.includes('MapPin')) {
  code = code.replace('import { ', 'import { MapPin, Navigation, ');
}

fs.writeFileSync('src/driver-app/DriverApp.tsx', code);
