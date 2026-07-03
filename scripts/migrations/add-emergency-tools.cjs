const fs = require('fs');
const file = 'src/driver-app/DriverApp.tsx';
let text = fs.readFileSync(file, 'utf8');

// Ensure MessageCircle and Map are imported from lucide-react
if (!text.includes('MessageCircle,')) {
  text = text.replace(/import {([^}]+)} from 'lucide-react';/, 'import {$1, MessageCircle, Map} from \'lucide-react\';');
}

const emergencyTools = `
              {/* Emergency / Offline Tools */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <a href="#" className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-[#25D366]/30">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp SOS
                </a>
                <a href="#" className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-blue-500/30">
                  <Map className="h-4 w-4" />
                  Find Mechanic
                </a>
              </div>
`;

// Insert after the Run Diagnostic button's closing tag
text = text.replace(/(<\/button>\s*<\/div>\s*)\{\/\* \-\-\- OR \-\-\- \*\/\}/, '$1' + emergencyTools + '\n            {/* --- OR --- */}');

fs.writeFileSync(file, text);
console.log('Added Emergency Tools');
