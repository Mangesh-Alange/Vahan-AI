const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startIdx = 1155;
const endIdx = 1306;

const chatUIPayload = `
              {/* Unified ChatGPT-style Input Bar */}
              <div className="flex flex-col gap-2 mt-2">
                
                {/* Engine sound pairing selector (Chips) */}
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">इंजन की आवाज़ (Sound):</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {[
                      { key: 'normal', label: 'सामान्य' },
                      { key: 'knock', label: 'खट-खट' },
                      { key: 'squeal', label: 'सीटी' },
                      { key: 'misfire', label: 'झटका' }
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setAudioSignalClass(item.key as any)}
                        className={\`text-[9px] px-2 py-0.5 rounded-full font-bold transition-colors \${
                          audioSignalClass === item.key
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'glass dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }\`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Container */}
                <div className="relative glass dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm p-2 flex flex-col focus-within:border-amber-500/50 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-all">
                  
                  {/* Selected Image Preview */}
                  {selectedImage && (
                    <div className="relative w-24 h-24 mb-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-amber-500 text-black text-[8px] font-bold rounded shadow-lg flex items-center gap-1">
                        <Sparkles className="h-2 w-2" /> Vision
                      </div>
                    </div>
                  )}

                  <textarea 
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    placeholder={isRecordingRealVoice ? "[RECORDING ACTIVE...] Speak now" : "Type a message or use the mic..."}
                    className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none min-h-[44px] max-h-[120px] px-2 py-2.5 resize-none leading-relaxed"
                    rows={1}
                  />

                  {/* Actions Row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {/* Camera Button */}
                      <label className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors cursor-pointer">
                        <Camera className="h-5 w-5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = (e) => setSelectedImage(e.target.result);
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      
                      {/* Mic Button */}
                      {!isRecordingRealVoice ? (
                        <button 
                          onClick={startRealVoiceRecording}
                          disabled={isRecordingVoice}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={stopRealVoiceRecording}
                          className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-full animate-pulse transition-colors"
                        >
                          <Square className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Send / Run Diagnostic Button */}
                    <button
                      onClick={runDiagnosticPipeline}
                      disabled={isDiagnosing || (!symptomText.trim() && !selectedImage)}
                      className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-slate-950 disabled:text-slate-400 rounded-full transition-colors shadow-md disabled:shadow-none flex items-center justify-center"
                    >
                      {isDiagnosing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
`;

// Splice array
lines.splice(startIdx, endIdx - startIdx + 1, chatUIPayload);

// Add Send to imports if missing
let text = lines.join('\n');
if (!text.includes('Send,')) {
  text = text.replace(/import {([^}]+)} from 'lucide-react';/, 'import {$1, Send} from \'lucide-react\';');
}

fs.writeFileSync(file, text);
console.log('Successfully refactored chat UI via array splice');
