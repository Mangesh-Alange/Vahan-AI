const fs = require('fs');

// 1. Update langgraph-agents.ts
let agentsCode = fs.readFileSync('server/langgraph-agents.ts', 'utf8');

agentsCode = agentsCode.replace(
  '  kb_matches: Annotation<any[]>(),',
  '  kb_matches: Annotation<any[]>(),\n  image_base64: Annotation<string>(),'
);

const oldDiagnosticPrompt = `  const kbCtx = JSON.stringify(state.kb_matches);
  const prompt = \`You are the Diagnostic Agent. 
    Based on the symptom: "\${state.symptom_hindi}", acoustic signal: "\${state.acoustic_signal}", and local RAG context: \${kbCtx}. 
    Provide a precise engineering diagnosis strictly in Devanagari Hindi. 
    IMPORTANT: If the symptom is a general query (like asking for locations, service centers, greetings) and NOT a vehicle fault, set diagnosis to 'यह एक सामान्य प्रश्न है, वाहन की खराबी नहीं' (This is a general question, not a vehicle fault).
    Return ONLY a JSON object: { "diagnosis": "string", "reasoning": "string" }\`;
  const res = await model.invoke([new HumanMessage(prompt)]);`;

const newDiagnosticPrompt = `  const kbCtx = JSON.stringify(state.kb_matches);
  const prompt = \`You are the Diagnostic Agent. 
    Based on the symptom: "\${state.symptom_hindi}", acoustic signal: "\${state.acoustic_signal}", and local RAG context: \${kbCtx}. 
    Provide a precise engineering diagnosis strictly in Devanagari Hindi. 
    IMPORTANT: If the symptom is a general query (like asking for locations, service centers, greetings) and NOT a vehicle fault, set diagnosis to 'यह एक सामान्य प्रश्न है, वाहन की खराबी नहीं' (This is a general question, not a vehicle fault).
    If an image is provided, use your visual analysis to accurately identify the broken part or dashboard warning light.
    Return ONLY a JSON object: { "diagnosis": "string", "reasoning": "string" }\`;
  
  let contentMsg: any = prompt;
  if (state.image_base64) {
    contentMsg = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: state.image_base64 }
    ];
  }
  const res = await model.invoke([new HumanMessage({ content: contentMsg })]);`;

agentsCode = agentsCode.replace(oldDiagnosticPrompt, newDiagnosticPrompt);
fs.writeFileSync('server/langgraph-agents.ts', agentsCode);

// 2. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

serverCode = serverCode.replace(
  'const { vehicle_id, driver_id, symptom_text_hindi, symptom_text_english, acoustic_signal_class } = req.body;',
  'const { vehicle_id, driver_id, symptom_text_hindi, symptom_text_english, acoustic_signal_class, image_base64 } = req.body;'
);

serverCode = serverCode.replace(
  '      symptom_hindi: symptom_text_hindi,',
  '      symptom_hindi: symptom_text_hindi,\n      image_base64: image_base64,'
);

fs.writeFileSync('server.ts', serverCode);
