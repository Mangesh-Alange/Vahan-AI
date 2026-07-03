const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Replace technical jargon with truck driver friendly Hindi/English mix
text = text.replace(/Multi-Agent Diagnostic Pipeline Running\.\.\./g, 'समस्या चेक की जा रही है... (Checking Fault...)');
text = text.replace(/Run AI Diagnostic Sequence/g, 'खराबी चेक करें (Find Problem)');

// Option A / B headers
text = text.replace(/AI OPTION A: VOICE COMMANDS/g, 'ऑप्शन A: बोलकर बताएं (Speak)');
text = text.replace(/Option B: Type Symptoms/g, 'ऑप्शन B: लिखकर बताएं (Type)');

text = text.replace(/AI VOICE & SYMPTOM REPORTER/g, 'खराबी की रिपोर्ट करें (Report Fault)');
text = text.replace(/Secure Fleet Integration/g, 'आपका सुरक्षित सफर');
text = text.replace(/assigned truck/g, 'आपकी गाड़ी (Your Vehicle)');

text = text.replace(/DEMO QUICK SCENARIOS/g, 'आम समस्याएं (Common Issues)');
text = text.replace(/Select a pre-written Indian transport failure to auto-fill the symptom box above:/g, 'जल्दी से अपनी समस्या चुनें (Select a quick issue):');

text = text.replace(/Legacy recognition active\.\.\./g, 'सुन रहा है... (Listening...)');
text = text.replace(/Or use Legacy Browser Speech Recognition/g, 'या फ़ोन के माइक से बोलें (Or use phone mic)');

// Chat placeholder
text = text.replace(/Ask AI Copilot:/g, 'पूछें:');

fs.writeFileSync(file, text);
console.log('Driver Jargon Fixed');
