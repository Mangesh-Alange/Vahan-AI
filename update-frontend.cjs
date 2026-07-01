const fs = require('fs');
let code = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

code = code.replace(
  '      keywords.forEach(kw => {\r\n        if (query.includes(kw)) matches++;\r\n      });',
  `      keywords.forEach(kw => {
        try {
          if (new RegExp('\\\\b' + kw + '\\\\b', 'i').test(query)) matches++;
        } catch(e) {
          if (query.includes(kw)) matches++;
        }
      });`
);

code = code.replace(
  '            if (w.length > 3 && keywords.some(k => k.includes(w))) matches++;',
  `            try {
              if (w.length > 3 && keywords.some(k => new RegExp('\\\\b' + w + '\\\\b', 'i').test(k))) matches++;
            } catch(e) {
              if (w.length > 3 && keywords.some(k => k.includes(w))) matches++;
            }`
);

fs.writeFileSync('src/driver-app/DriverApp.tsx', code);
