const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const targetServerContent = `    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let toolResponseStr = "";
      if (call.name === "log_sos_alert") {
        const reason = call.args && call.args.reason ? call.args.reason : "Driver requested emergency SOS via Copilot";
        db.addSosAlert("org_rajpath", reason);
        toolResponseStr = "[🚨 SOS ALERT SENT] आपकी आपातकालीन स्थिति फ्लीट मैनेजर को भेज दी गई है। कृपया सुरक्षित स्थान पर रहें, मदद जल्द ही आ रही है।";
      } else if (call.name === "find_service_station") {
        toolResponseStr = "[📍 SERVICE STATION FOUND] मैंने आपके आस-पास 3 Tata Motors ऑथराइज्ड सर्विस स्टेशन खोजे हैं। आपकी स्क्रीन पर नेविगेशन लिंक भेजा जा रहा है।";
      } else if (call.name === "log_maintenance_request") {
        const issue = call.args && call.args.issue ? call.args.issue : "सामान्य सर्विस";
        toolResponseStr = \`[⚙️ MAINTENANCE LOGGED] आपका सर्विस रिक्वेस्ट ("\${issue}") फ्लीट मैनेजर को भेज दिया गया है। इसे अगली ट्रिप के बाद शेड्यूल किया जाएगा।\`;
      }
      return res.json({ reply: toolResponseStr });
    }`;

const replacementServerContent = `    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let toolResponseStr = "";
      let actionObj = null;

      if (call.name === "log_sos_alert") {
        const reason = call.args && call.args.reason ? call.args.reason : "Driver requested emergency SOS via Copilot";
        db.addSosAlert("org_rajpath", reason);
        toolResponseStr = "[🚨 SOS ALERT SENT] आपकी आपातकालीन स्थिति फ्लीट मैनेजर को भेज दी गई है। कृपया सुरक्षित स्थान पर रहें, मदद जल्द ही आ रही है।";
      } else if (call.name === "find_service_station") {
        toolResponseStr = "[📍 SERVICE STATION FOUND] मैंने आपके आस-पास 3 Tata Motors ऑथराइज्ड सर्विस स्टेशन खोजे हैं। आपकी स्क्रीन पर नेविगेशन लिंक भेजा जा रहा है।";
        actionObj = { type: "OPEN_MAPS", url: "https://www.google.com/maps/search/Tata+Motors+Authorized+Service+Station" };
      } else if (call.name === "log_maintenance_request") {
        const issue = call.args && call.args.issue ? call.args.issue : "सामान्य सर्विस";
        toolResponseStr = \`[⚙️ MAINTENANCE LOGGED] आपका सर्विस रिक्वेस्ट ("\${issue}") फ्लीट मैनेजर को भेज दिया गया है। इसे अगली ट्रिप के बाद शेड्यूल किया जाएगा।\`;
      }
      
      return res.json({ reply: toolResponseStr, action: actionObj });
    }`;

serverCode = serverCode.replace(targetServerContent, replacementServerContent);
fs.writeFileSync('server.ts', serverCode);

let driverAppCode = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

const targetDriverAppContent = `      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {`;

const replacementDriverAppContent = `      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.action && data.action.type === 'OPEN_MAPS') {
          setTimeout(() => {
            window.open(data.action.url, '_blank');
          }, 1500); // 1.5s delay to let the user read the chat message before jumping to Maps
        }
      } else {`;

driverAppCode = driverAppCode.replace(targetDriverAppContent, replacementDriverAppContent);
fs.writeFileSync('src/driver-app/DriverApp.tsx', driverAppCode);
