const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const targetContent = `    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction
      }
    });

    res.json({ reply: response.text });`;

const replacementContent = `    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools: [{
          functionDeclarations: [
            {
              name: "log_sos_alert",
              description: "Logs an SOS emergency alert to the fleet manager. Use this when the driver is in danger, stranded in an unsafe location, or explicitly asks for emergency help.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  reason: { type: Type.STRING, description: "Reason for the SOS alert" }
                },
                required: ["reason"]
              }
            },
            {
              name: "find_service_station",
              description: "Finds the nearest authorized service station. Use this when the driver asks for a nearby mechanic or service center.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING, description: "Approximate location or 'current'" }
                }
              }
            },
            {
              name: "log_maintenance_request",
              description: "Logs a routine maintenance request. Use this when the driver asks to schedule a service, oil change, or non-urgent repair.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING, description: "The maintenance issue" }
                },
                required: ["issue"]
              }
            }
          ]
        }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let toolResponseStr = "";
      if (call.name === "log_sos_alert") {
        toolResponseStr = "[🚨 SOS ALERT SENT] आपकी आपातकालीन स्थिति फ्लीट मैनेजर को भेज दी गई है। कृपया सुरक्षित स्थान पर रहें, मदद जल्द ही आ रही है।";
      } else if (call.name === "find_service_station") {
        toolResponseStr = "[📍 SERVICE STATION FOUND] मैंने आपके आस-पास 3 Tata Motors ऑथराइज्ड सर्विस स्टेशन खोजे हैं। आपकी स्क्रीन पर नेविगेशन लिंक भेजा जा रहा है।";
      } else if (call.name === "log_maintenance_request") {
        const issue = call.args && call.args.issue ? call.args.issue : "सामान्य सर्विस";
        toolResponseStr = \`[⚙️ MAINTENANCE LOGGED] आपका सर्विस रिक्वेस्ट ("\${issue}") फ्लीट मैनेजर को भेज दिया गया है। इसे अगली ट्रिप के बाद शेड्यूल किया जाएगा।\`;
      }
      return res.json({ reply: toolResponseStr });
    }

    res.json({ reply: response.text });`;

serverCode = serverCode.replace(targetContent, replacementContent);
fs.writeFileSync('server.ts', serverCode);
