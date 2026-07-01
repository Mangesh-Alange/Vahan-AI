import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// 1. Define the Graph State structure
export const GraphState = Annotation.Root({
  symptom_hindi: Annotation<string>(),
  acoustic_signal: Annotation<string>(),
  kb_matches: Annotation<any[]>(),
  image_base64: Annotation<string>(),
  
  // Populated by agents
  symptom_english: Annotation<string>(),
  diagnosis: Annotation<string>(),
  severity: Annotation<string>(),
  recommended_action: Annotation<string>(),
  estimated_cost_range: Annotation<string>(),
  
  agent_trace: Annotation<Record<string, string>>({
    reducer: (state, update) => ({ ...state, ...update }),
    default: () => ({})
  })
});

// Helper to safely parse JSON from LLM output
const parseJSON = (text: string) => {
  try {
    return JSON.parse(text.replace(/```json|```/gi, "").trim());
  } catch (e) {
    console.error("Failed to parse JSON from LLM:", text);
    return {};
  }
};

// 2. Define the Agent Nodes
const supervisorAgent = async (state: typeof GraphState.State) => {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 500,
  });
  const res = await model.invoke([
    new SystemMessage(`You are the Supervisor Agent of VahanAI. 
      Translate the driver's Hindi symptom to English and outline the diagnostic strategy. 
      Return ONLY a JSON object: { "english_translation": "string", "strategy_notes": "string" }`),
    new HumanMessage(`Hindi Symptom: ${state.symptom_hindi}`)
  ]);
  const parsed = parseJSON(res.content.toString());
  return {
    symptom_english: parsed.english_translation || "Translation failed",
    agent_trace: { SupervisorAgent: parsed.strategy_notes || "Routing handled." }
  };
};

const diagnosticAgent = async (state: typeof GraphState.State) => {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 800,
  });
  const kbCtx = JSON.stringify(state.kb_matches);
  const prompt = `You are the Diagnostic Agent. 
    Based on the symptom: "${state.symptom_hindi}", acoustic signal: "${state.acoustic_signal}", and local RAG context: ${kbCtx}. 
    Provide a precise engineering diagnosis strictly in Devanagari Hindi. 
    IMPORTANT: If the symptom is a general query (like asking for locations, service centers, greetings) and NOT a vehicle fault, set diagnosis to 'यह एक सामान्य प्रश्न है, वाहन की खराबी नहीं' (This is a general question, not a vehicle fault).
    Return ONLY a JSON object: { "diagnosis": "string", "reasoning": "string" }`;
  let contentMsg: any = prompt;
  if (state.image_base64) {
    contentMsg = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: state.image_base64 }
    ];
  }
  const res = await model.invoke([new HumanMessage({ content: contentMsg })]);
  const parsed = parseJSON(res.content.toString());
  return {
    diagnosis: parsed.diagnosis || "अज्ञात तकनीकी समस्या। (Unknown technical issue.)",
    agent_trace: { DiagnosticAgent: parsed.reasoning || "Diagnostic theory applied." }
  };
};

const triageAgent = async (state: typeof GraphState.State) => {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 400,
  });
  const prompt = `You are the Triage Agent. 
    Given the diagnosis: "${state.diagnosis}". 
    Establish road safety severity. Must be exactly one of: "drive", "caution", or "stop_immediately". 
    IMPORTANT: If the diagnosis indicates it is not a vehicle fault, ALWAYS return "drive".
    Return ONLY a JSON object: { "severity": "string", "reasoning": "string" }`;
  const res = await model.invoke([new HumanMessage(prompt)]);
  const parsed = parseJSON(res.content.toString());
  const sev = ["drive", "caution", "stop_immediately"].includes(parsed.severity) ? parsed.severity : "caution";
  return {
    severity: sev,
    agent_trace: { TriageAgent: parsed.reasoning || `Severity assessed as ${sev}` }
  };
};

const maintenanceAgent = async (state: typeof GraphState.State) => {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 800,
  });
  const prompt = `You are the Maintenance Agent. 
    Given diagnosis: "${state.diagnosis}". 
    Outline actionable roadside instructions strictly in Devanagari Hindi. 
    IMPORTANT: If the diagnosis indicates it is a general question or not a vehicle fault, just reply conversationally to their question in Devanagari Hindi instead of giving maintenance steps, and set cost to "N/A".
    Also estimate repair cost in Indian Rupees (e.g. ₹5,000 - ₹10,000) or "N/A".
    Return ONLY a JSON object: { "recommended_action": "string", "estimated_cost_range": "string", "reasoning": "string" }`;
  const res = await model.invoke([new HumanMessage(prompt)]);
  const parsed = parseJSON(res.content.toString());
  return {
    recommended_action: parsed.recommended_action || "कृपया नजदीकी मैकेनिक से संपर्क करें।",
    estimated_cost_range: parsed.estimated_cost_range || "N/A",
    agent_trace: { MaintenanceAgent: parsed.reasoning || "Maintenance protocol drafted." }
  };
};

const reportAgent = async (state: typeof GraphState.State) => {
  return {
    agent_trace: { ReportAgent: "Compiled structured diagnostic workflow from LangGraph agents successfully." }
  };
};

// 3. Compile the Graph
const builder = new StateGraph(GraphState)
  .addNode("supervisor", supervisorAgent)
  .addNode("diagnostic", diagnosticAgent)
  .addNode("triage", triageAgent)
  .addNode("maintenance", maintenanceAgent)
  .addNode("report", reportAgent)
  
  .addEdge(START, "supervisor")
  .addEdge("supervisor", "diagnostic")
  .addEdge("diagnostic", "triage")
  .addEdge("triage", "maintenance")
  .addEdge("maintenance", "report")
  .addEdge("report", END);

export const diagnosticGraph = builder.compile();
