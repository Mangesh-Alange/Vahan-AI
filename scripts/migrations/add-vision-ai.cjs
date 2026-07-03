const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// 1. Add Camera to lucide-react imports
if (!text.includes('Camera,')) {
  text = text.replace(/import {([^}]+)} from 'lucide-react';/, 'import {$1, Camera, X} from \'lucide-react\';');
}

// 2. Add selectedImage state
if (!text.includes('const [selectedImage, setSelectedImage]')) {
  text = text.replace(/const \[symptomText, setSymptomText\] = useState<string>\(''\);/, 'const [symptomText, setSymptomText] = useState<string>(\'\');\n  const [selectedImage, setSelectedImage] = useState<string | null>(null);');
}

// 3. Add Option C UI after Option B
const optionC = `
              {/* Option C: Vision AI */}
              <div className="glass dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                <label className="text-[10px] text-slate-800 dark:text-slate-200 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-amber-500"/> ऑप्शन C: फ़ोटो खींचकर बताएं (Camera AI)
                </label>
                
                <div className="flex flex-col gap-3">
                  {!selectedImage ? (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="h-6 w-6 text-slate-400 mb-2" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Tap to upload a photo of the broken part</p>
                      </div>
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
                  ) : (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={selectedImage} alt="Broken Part" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-amber-500 text-black text-[9px] font-bold rounded flex items-center gap-1 shadow-lg">
                        <Sparkles className="h-3 w-3" /> Gemini Vision Active
                      </div>
                    </div>
                  )}
                </div>
              </div>
`;

// Insert Option C after Option B
// We find the end of Option B's div by looking for the Engine sound pairing selector that comes next
text = text.replace(/\{\/\* Engine sound pairing selector \*\/\}/, optionC + '\n              {/* Engine sound pairing selector */}');

// 4. Update the Run Diagnostic Pipeline button condition so it can be submitted if EITHER text or image is present
text = text.replace(/disabled=\{isDiagnosing \|\| !symptomText\.trim\(\)\}/g, 'disabled={isDiagnosing || (!symptomText.trim() && !selectedImage)}');

fs.writeFileSync(file, text);
console.log('Added Vision AI Option C');
