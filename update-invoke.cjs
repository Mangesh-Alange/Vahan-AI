const fs = require('fs');

let agentsCode = fs.readFileSync('server/langgraph-agents.ts', 'utf8');
agentsCode = agentsCode.replace(
  /const res = await model.invoke\(\[new HumanMessage\(prompt\)]\);\s*const parsed = parseJSON\(res\.content\.toString\(\)\);/,
  `let contentMsg: any = prompt;
  if (state.image_base64) {
    contentMsg = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: state.image_base64 }
    ];
  }
  const res = await model.invoke([new HumanMessage({ content: contentMsg })]);
  const parsed = parseJSON(res.content.toString());`
);
fs.writeFileSync('server/langgraph-agents.ts', agentsCode);
