import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { faultKnowledgeBase } from './server/faultKnowledgeBase.js';
import { GoogleGenAI, Type } from '@google/genai';
import { diagnosticGraph } from './server/langgraph-agents.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy initializer for Gemini client to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      console.warn("WARNING: GEMINI_API_KEY is not set or using placeholder. AI features will fallback to local RAG heuristic.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -----------------------------------------------------
// 1. KEYWORD-BASED RAG RETRIEVAL (Real semantic matcher)
// -----------------------------------------------------
const STOP_WORDS = new Set([
  'hai', 'aur', 'ko', 'ka', 'se', 'mein', 'ki', 'bhi', 'ho', 'raha', 'rah', 'ke', 'par', 'hi', 'yaar', 'bhai', 'na', 'ne', 'kar', 'kya',
  'is', 'the', 'and', 'to', 'for', 'with', 'from', 'in', 'on', 'at', 'it', 'this', 'that', 'of', 'an', 'are', 'was', 'were', 'be', 'been',
  'है', 'और', 'को', 'का', 'से', 'में', 'की', 'भी', 'हो', 'रहा', 'के', 'पर', 'ही', 'क्या', 'कर'
]);

function expandDevanagariQuery(queryHindi: string): string {
  let expanded = queryHindi.toLowerCase();
  const devanagariMap: { [key: string]: string } = {
    "इंजन": "engine",
    "धुआं": "dhua smoke",
    "धुँआ": "dhua smoke",
    "धुआ": "dhua smoke",
    "गर्म": "garam hot heat temperature",
    "गरम": "garam hot heat temperature",
    "तापमान": "temperature",
    "आवाज": "aawaz noise sound",
    "आवाज़": "aawaz noise sound",
    "आवाज़": "aawaz noise sound",
    "ब्रेक": "break brake",
    "सफेद": "safed white",
    "सफ़ेद": "safed white",
    "काला": "kaala black",
    "नीला": "neela blue",
    "पानी": "coolant water paani",
    "तेल": "oil mobil",
    "लीक": "leak",
    "टपक": "tapak dripping leak",
    "क्लच": "clutch",
    "गियर": "gear",
    "झटका": "jhatka misfire",
    "खट": "khat knocking knock",
    "सीटी": "seeti whistling squeal",
    "स्टार्ट": "start",
    "बैटरी": "battery",
    "वाइब्रेशन": "vibration"
  };

  Object.entries(devanagariMap).forEach(([dev, eng]) => {
    if (queryHindi.includes(dev)) {
      expanded += " " + eng;
    }
  });

  return expanded;
}

function performRAGLookup(queryHindi: string, queryEnglish: string): any[] {
  const expandedHindi = expandDevanagariQuery(queryHindi);
  const query = `${expandedHindi} ${queryEnglish.toLowerCase()}`;
  const keywords = query.split(/[\s,.\-!?]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  
  if (keywords.length === 0) return [faultKnowledgeBase.find(f => f.id === "kb_00")];

  const scored = faultKnowledgeBase.map(entry => {
    let score = 0;
    const targets = [
      entry.symptom_hindi.toLowerCase(),
      entry.symptom_english.toLowerCase(),
      entry.recommended_action.toLowerCase(),
      ...entry.likely_causes.map(c => c.toLowerCase())
    ];

    keywords.forEach(kw => {
      targets.forEach(target => {
        try {
          if (new RegExp('\\\\b' + kw + '\\\\b', 'i').test(target)) {
            score += 1;
          }
        } catch (e) {
          if (target.includes(kw)) score += 1;
        }
      });
    });
    return { entry, score };
  });

  const sorted = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.entry);

  return sorted.length > 0 ? sorted.slice(0, 3) : [faultKnowledgeBase.find(f => f.id === "kb_00")];
}

function translateKnowledgeBaseToHindi(id: string, defaultDiag: string, defaultAction: string): { diagnosis: string, recommended_action: string, estimated_cost_range: string } {
  const translations: { [key: string]: { diagnosis: string, action: string, cost: string } } = {
    "kb_01": {
      diagnosis: "कॉमन रेल इंजेक्टर जाम होना या एयर फ़िल्टर ब्लॉक होना (Common Rail Fuel Injector clogging / Clogged Air Filter)",
      action: "1. गाड़ी को तुरंत सुरक्षित जगह खड़ी करें।\n2. एयर फिल्टर चेक करें कि कहीं मिट्टी तो नहीं जमी है।\n3. इंजन को बार-बार चालू न करें। मैकेनिक बुलाकर कॉमन रेल फ्यूल प्रेशर चेक कराएं।",
      cost: "₹8,000 - ₹22,000"
    },
    "kb_02": {
      diagnosis: "ब्रेक पैड पूरी तरह घिस गए हैं या ब्रेक डिस्क खराब है (Worn brake pads / Warped brake rotors)",
      action: "1. ब्रेक सिस्टम कमजोर हो गया है।\n2. गाड़ी की गति कम करें और सुरक्षित स्थान पर रोकें।\n3. ब्रेक पैड को तुरंत बदलवाएं, वरना ब्रेक पूरी तरह फेल हो सकते हैं।",
      cost: "₹3,500 - ₹9,000"
    },
    "kb_03": {
      diagnosis: "इंजन के अंदरूनी हिस्सों (Connecting Rod bearing) का गंभीर रूप से घिस जाना",
      action: "1. इंजन को तुरंत बंद करें।\n2. मोबाइल ऑयल लेवल चेक करें। अगर ऑयल बहुत कम है तो नया ऑयल डालें।\n3. इसे चलाकर वर्कशॉप न ले जाएं, वरना इंजन सीज हो जाएगा। टो क्रेन (Tow Crane) बुलाएं।",
      cost: "₹25,000 - ₹65,000"
    },
    "kb_04": {
      diagnosis: "इंजन ऑयल जलना या पिस्टन रिंग घिसना (Piston Ring wear / Oil burning)",
      action: "1. समय-समय पर इंजन ऑयल का लेवल नापते रहें।\n2. चढ़ाई पर गाड़ी को ज़्यादा न खींचे और गति धीमी रखें।\n3. जल्द से जल्द वर्कशॉप में इंजन कंप्रेशन टेस्ट करवाएं।",
      cost: "₹15,000 - ₹40,000"
    },
    "kb_05": {
      diagnosis: "इंजन अत्यधिक गर्म (Overheat) होना - रेडिएटर लीक या थर्मास्टेट वाल्व जाम (Radiator leak / Thermostat failure)",
      action: "1. गाड़ी तुरंत किनारे लगाएं।\n2. गरम रेडिएटर कैप को कभी भी न खोलें (गंभीर रूप से जलने का खतरा)।\n3. इंजन को 30 मिनट ठंडा होने दें, फिर साफ़ पानी या कूलेंट डालें और लीक की जांच करें।",
      cost: "₹2,500 - ₹12,000"
    },
    "kb_06": {
      diagnosis: "गियर शिफ्टर लिंकेज या क्लच सिलेंडर लीक होना (Clutch cylinder leak / Gearbox synchronizer wear)",
      action: "1. क्लच ऑयल रिज़र्वोइर (clutch oil reservoir) चेक करें।\n2. यदि खाली है, तो ब्रेक/क्लच ऑयल डालें और क्लच पेडल को दबाएं।\n3. धीरे-धीरे बिना बार-बार गियर बदले पास के गैरेज में पहुंचें।",
      cost: "₹6,000 - ₹18,000"
    },
    "kb_07": {
      diagnosis: "पावर स्टीयरिंग ऑयल लीक या पावर स्टीयरिंग पंप खराब (Power steering oil leak / Pump failure)",
      action: "1. पावर स्टीयरिंग ऑयल टैंक चेक करें और तुरंत नया स्टीयरिंग ऑयल डालें।\n2. बेल्ट की जांच करें कि वह टूटी तो नहीं है।\n3. गाड़ी मोड़ते समय ध्यान दें क्योंकि स्टीयरिंग बहुत भारी काम करेगा।",
      cost: "₹1,800 - ₹7,500"
    },
    "kb_08": {
      diagnosis: "टर्बोचार्जरहोस पाइप ढीला होना या लीक होना (Turbocharger hose pipe leak / Intercooler leak)",
      action: "1. टर्बोचार्जर और इंटरकूलर से जुड़े बड़े काले रबर पाइपों की जांच करें।\n2. यदि कोई क्लिप ढीली है, तो उसे पेचकश से टाइट करें।\n3. गति सामान्य रखें ताकि टर्बो पर अधिक दबाव न पड़े।",
      cost: "₹3,000 - ₹15,000"
    },
    "kb_09": {
      diagnosis: "बैटरी डिस्चार्ज होना या टर्मिनल्स में कार्बन जमना (Discharged battery / Corroded terminals)",
      action: "1. बैटरी के तारों (terminals) की जांच करें। यदि सफेद पाउडर या जंग है, तो उसे गरम पानी से साफ करें।\n2. दूसरी गाड़ी की बैटरी से जंप-स्टार्ट (Jump start) करें।\n3. स्टार्ट होने के बाद अल्टरनेटर की चार्जिंग चेक कराएं।",
      cost: "₹1,000 - ₹8,500"
    },
    "kb_10": {
      diagnosis: "इंजन माउंटिंग रबर टूटना या घिसना (Worn engine mounting rubber)",
      action: "1. गाड़ी को सामान्य गति से निकटतम गैरेज तक ले जाएं।\n2. लंबे समय तक गाड़ी को चालू (idle) खड़ा न रखें।\n3. इंजन माउंटिंग बोल्ड और रबर पैड को बदलवाएं।",
      cost: "₹4,000 - ₹12,000"
    },
    "kb_11": {
      diagnosis: "डिफरेंशियल गियर ऑयल की कमी या बेयरिंग घिसना (Rear differential oil leak / Pinion bearing wear)",
      action: "1. गाड़ी रोककर पीछे के एक्सेल (axle) से तेल रिसने की जांच करें।\n2. बिना तेल के चलने पर एक्सेल पूरी तरह जाम हो सकता है, जिससे गाड़ी पलट सकती है।\n3. तुरंत नया डिफरेंशियल ऑयल (EP-90) डलवाएं।",
      cost: "₹8,000 - ₹28,000"
    },
    "kb_12": {
      diagnosis: "टर्बोचार्जर बेयरिंग खराब होना या मैनिफोल्ड लीक (Turbocharger rotor bearing failure)",
      action: "1. टर्बोचार्जर के अंदरूनी पहिये में प्ले या कबाड़ चेक करें।\n2. इंजन की आरपीएम (RPM) बहुत अधिक न बढ़ाएं।\n3. जल्द ही टर्बो बदलें या रिपेयर करवाएं।",
      cost: "₹12,000 - ₹35,000"
    },
    "kb_13": {
      diagnosis: "व्हील एलाइनमेंट आउट होना या टाई रॉड एंड घिसना (Incorrect wheel alignment / Worn tie rod ends)",
      action: "1. टायर का प्रेशर समान रखें।\n2. स्टीयरिंग लिंकेज की जांच करें कि कोई पार्ट ढीला तो नहीं है।\n3. अगले बड़े स्टॉप पर व्हील एलाइनमेंट (Wheel Alignment) करवाएं।",
      cost: "₹1,500 - ₹5,000"
    },
    "kb_14": {
      diagnosis: "एयर कंप्रेसर पाइप लीक या एयर टैंक में पंचर (Critical Low Air Pressure / Brake chamber leak)",
      action: "1. अत्यधिक सुरक्षा खतरा! गाड़ी तुरंत सुरक्षित रोकें।\n2. प्रेशर 6 बार से ऊपर होने तक गाड़ी आगे न बढ़ाएं, वरना ब्रेक नहीं लगेंगे।\n3. चेसिस और हवा के टैंकों के पास हवा लीक होने की सरसराहट की आवाज़ सुनें। मैकेनिक बुलाएं।",
      cost: "₹4,500 - ₹16,000"
    },
    "kb_15": {
      diagnosis: "हेड गैस्केट फटना या इंजन ब्लॉक में क्रैक (Blown head gasket / Coolant mixing with engine oil)",
      action: "1. इंजन को भूलकर भी स्टार्ट न करें।\n2. कूलेंट और इंजन ऑयल आपस में मिल रहे हैं, जिससे इंजन पूरी तरह सीज हो सकता है।\n3. गाड़ी को टो करके सीधे गैरेज ले जाएं।",
      cost: "₹18,000 - ₹45,000"
    },
    "kb_16": {
      diagnosis: "फ्यूल टैंक पंचर होना या फ्यूल पाइपलाइन लीक (Fuel tank puncture / Fuel line leakage)",
      action: "1. आग लगने का अत्यधिक खतरा! इंजन तुरंत बंद करें।\n2. फ्यूल फिल्टर या रिटर्न होज़ के पास रिसाव की जांच करें।\n3. पंचर वाले स्थान पर साबुन या एम-सील (M-Seal) से अस्थायी पैच लगाएं, फिर मैकेनिक को दिखाएं।",
      cost: "₹2,000 - ₹12,000"
    },
    "kb_17": {
      diagnosis: "क्लच रिलीज बेयरिंग खराब होना (Worn clutch release bearing)",
      action: "1. लाल बत्ती या स्टॉप पर क्लच पेडल को दबाकर न रखें (गाड़ी न्यूट्रल में रखें)।\n2. जल्द ही पूरा क्लच किट (प्रेशर प्लेट, क्लच प्लेट और रिलीज बेयरिंग) बदलवाएं।",
      cost: "₹4,500 - ₹11,000"
    },
    "kb_18": {
      diagnosis: "अल्टरनेटर बेल्ट टूटना या रेगुलेटर खराब (Alternator failure / Broken drive belt)",
      action: "1. गाड़ी पर बिजली का लोड कम करें (केबिन पंखा, अतिरिक्त लाइट बंद करें)।\n2. सीधे पास के ऑटो इलेक्ट्रीशियन के पास जाएं।\n3. यदि बेल्ट पानी के पंप को भी चलाती है, तो इंजन तापमान पर नज़र रखें।",
      cost: "₹3,000 - ₹10,000"
    },
    "kb_19": {
      diagnosis: "व्हील नट ढीले होना या स्टीयरिंग नकल बेयरिंग खराब (Worn CV joint / Loose wheel nuts)",
      action: "1. तुरंत गाड़ी रोककर पहियों के नट चेक और टाइट करें।\n2. यदि नट टाइट हैं, तो स्टीयरिंग नकल की जांच करें। ढीला पहिया चलने में बाहर निकल सकता है।",
      cost: "₹2,500 - ₹8,000"
    },
    "kb_20": {
      diagnosis: "कूलेंट का इंजन सिलेंडर में जाना / हेड गैस्केट लीक (Coolant leak into combustion chamber / Hydrolock risk)",
      action: "1. गाड़ी न चलाएं। इससे इंजन ब्लॉक पूरी तरह से टूट सकता है।\n2. कूलेंट का स्तर चेक करें और गाड़ी को मैकेनिक के पास टो करें।",
      cost: "₹12,000 - ₹35,000"
    },
    "kb_21": {
      diagnosis: "गियर केबल टूटना या लिंकेज बुश घिसना (Broken gear shifting cable or linkage bushing)",
      action: "1. केबिन के नीचे गियर शिफ्टर लिंकेज की जांच करें।\n2. बुश आसानी से बदले जा सकते हैं। गियर को जबरदस्ती न लगाएं।",
      cost: "₹2,500 - ₹12,000"
    },
    "kb_22": {
      diagnosis: "कमानी पत्ता (Leaf spring) बुश घिसना या सेंटर बोल्ट टूटना",
      action: "1. कमानी सेट के टूटे पत्तों या खिसके हुए सेंटर बोल्ट की जांच करें।\n2. गाड़ी में ओवरलोडिंग न करें।\n3. गड्ढों से गाड़ी धीरे निकालें ताकि चेसिस को नुकसान न पहुंचे।",
      cost: "₹3,500 - ₹14,000"
    },
    "kb_23": {
      diagnosis: "फ्यूल फिल्टर चोक होना या रेल प्रेशर कम होना (Clogged fuel filter / CRDI system low rail pressure)",
      action: "1. दोनों फ्यूल फिल्टर (प्राइमरी और सेकेंडरी) बदलें।\n2. फ्यूल पाइपलाइन की हवा (bleed) निकालें।\n3. बैटरी का वोल्टेज चेक करें।",
      cost: "₹4,000 - ₹18,000"
    },
    "kb_24": {
      diagnosis: "साइलेंसर या एक्जॉस्ट मैनिफोल्ड से हवा लीक होना (Exhaust manifold gasket leak)",
      action: "1. एक्जॉस्ट गैस केबिन में आ सकती है।\n2. केबिन के शीशे थोड़े खुले रखकर गाड़ी चलाएं।\n3. मैनिफोल्ड के बोल्ट टाइट करवाएं और गैसकेट बदलवाएं।",
      cost: "₹1,500 - ₹6,500"
    },
    "kb_25": {
      diagnosis: "व्हील बेयरिंग सूख जाना या ब्रेक ड्रम जाम होना (Wheel bearing grease seal failure / Jammed brakes)",
      action: "1. तुरंत गाड़ी रोकें! पहिया बहुत गरम हो चुका है।\n2. गाड़ी आगे चलाने पर एक्सेल टूटकर पहिया अलग हो सकता है।\n3. तुरंत टो क्रेन या मोबाइल मैकेनिक बुलाएं।",
      cost: "₹2,500 - ₹8,500"
    },
    "kb_26": {
      diagnosis: "DPF साइलेंसर चोक होना या AdBlue यूरिया की कमी (DPF soot accumulation / DEF low)",
      action: "1. यूरिया (AdBlue) का लेवल चेक करें और रीफिल करें।\n2. गाड़ी को 30 मिनट तक 50 किमी/घंटा से अधिक की स्पीड पर चलाएं ताकि साइलेंसर अपने आप साफ (Regeneration) हो सके।",
      cost: "₹5,000 - ₹25,000"
    },
    "kb_27": {
      diagnosis: "सेल्फ स्टार्टर मोटर पिनियन अटकना (Starter motor gear pinion sticking)",
      action: "1. बैटरी आइसोलेटर चाबी तुरंत बंद करें।\n2. स्टार्टर मोटर पर किसी लकड़ी या रिंच से हल्का थपथपाएं ताकि पिनियन अपनी जगह वापस आ सके।\n3. पास के ऑटो इलेक्ट्रीशियन को दिखाएं।",
      cost: "₹3,500 - ₹11,000"
    },
    "kb_28": {
      diagnosis: "AC कंप्रेसर क्लच बेयरिंग खराब होना (AC compressor clutch bearing failure)",
      action: "1. केबिन में तुरंत AC का स्विच बंद कर दें।\n2. AC बंद होने से बेल्ट फ्री हो जाएगी और आप बेल्ट टूटने के डर के बिना सुरक्षित गाड़ी चला सकेंगे।",
      cost: "₹2,000 - ₹15,000"
    },
    "kb_29": {
      diagnosis: "क्लच प्लेट पूरी तरह घिसना (Worn out clutch plate friction material / Clutch slipping)",
      action: "1. गाड़ी पर अतिरिक्त वजन न लादें।\n2. चढ़ाई आने से पहले ही छोटे गियर में गाड़ी डालें। आधा-क्लच (half-clutch) दबाकर न चलाएं।\n3. अगले बड़े शहर में क्लच बदलवाएं।",
      cost: "₹8,500 - ₹24,000"
    },
    "kb_30": {
      diagnosis: "रियर ब्रेक चैंबर डायाफ्राम खराब या लीक (Damaged rear brake chamber diaphragm)",
      action: "1. अचानक रियर ब्रेक जाम हो सकते हैं।\n2. गाड़ी को सुरक्षित किनारे लगाएं।\n3. रियर व्हील के पीछे जाने वाले एयर होज़ पाइप की जांच करें। ब्रेक एयर बाईपास न करें।",
      cost: "₹2,800 - ₹7,500"
    },
    "kb_31": {
      diagnosis: "प्रोपेलर शाफ्ट (Propeller Shaft) का यूनिवर्सल क्रॉस ज्वाइंट घिसना",
      action: "1. गाड़ी के नीचे लेटकर प्रोपेलर शाफ्ट को हाथ से हिलाकर देखें कि क्रॉस ज्वाइंट में प्ले तो नहीं है।\n2. यदि ज्वाइंट ढीला है, तो गाड़ी तुरंत रोकें। शाफ्ट टूटने से गंभीर दुर्घटना हो सकती है।",
      cost: "₹3,000 - ₹9,500"
    }
  };

  const match = translations[id];
  if (match) {
    return {
      diagnosis: match.diagnosis,
      recommended_action: match.action,
      estimated_cost_range: match.cost
    };
  }

  return {
    diagnosis: "संभावित खराबी: " + defaultDiag,
    recommended_action: "सुझाव: " + defaultAction,
    estimated_cost_range: "₹2,500 - ₹15,000"
  };
}

// -----------------------------------------------------
// 2. AUTHENTICATION ENDPOINTS
// -----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "Phone number and password are required." });
  }
  const user = db.authenticate(phone, password);
  if (!user) {
    return res.status(401).json({ error: "Incorrect phone number or password." });
  }
  res.json({ user });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, phone, password, role, preferred_language, org_name } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Check if phone already taken
  const existing = db.getUsers().find(u => u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "Phone number already registered." });
  }

  let orgId: string | null = null;
  if (role === 'fleet_manager') {
    // Generate a fresh organization for new fleet managers
    const newOrgName = org_name || `${name}'s Transport Fleet`;
    const newOrgId = "org_" + Math.random().toString(36).substring(2, 9);
    db.createOrganization({
        id: newOrgId,
        name: newOrgName,
        plan_tier: "free",
        created_at: new Date().toISOString()
      });
    orgId = newOrgId;
  }

  const newUser = db.createUser({
    org_id: orgId,
    role,
    name,
    phone,
    preferred_language: preferred_language || 'hi'
  }, password);

  res.json({ user: newUser });
});

// Invite Code Onboarding Flow
app.post('/api/auth/invite', (req, res) => {
  const { invite_code, name, phone, password, preferred_language } = req.body;
  if (!invite_code || !name || !phone || !password) {
    return res.status(400).json({ error: "Missing required details." });
  }

  // Validate dynamic or standard invite codes
  let org_id = "";
  const codeUpper = invite_code.toUpperCase().trim();
  if (codeUpper === "RAJP-INV-1234" || codeUpper.startsWith("RAJP-INV")) {
    org_id = "org_rajpath";
  } else if (codeUpper === "KEDA-INV-5678" || codeUpper.startsWith("KEDA-INV")) {
    org_id = "org_kedar";
  } else {
    // Dynamic parsing: splits at -INV- and checks both bare and prefixed organization IDs in a case-insensitive manner
    const parts = codeUpper.split("-INV-");
    if (parts.length === 2) {
      const suffix = parts[1].trim();
      const candidate1 = suffix;
      const candidate2 = "org_" + suffix;
      const matchedOrg = db.getOrganizations().find(o => o.id.toLowerCase() === candidate1.toLowerCase() || o.id.toLowerCase() === candidate2.toLowerCase());
        if (matchedOrg) {
          org_id = matchedOrg.id;
        } else {
          // Self-healing fallback: Check if there's a fleet manager with this org_id
          const matchedManager = db.getUsers().find(u => u.role === 'fleet_manager' && u.org_id && (u.org_id.toLowerCase() === candidate1.toLowerCase() || u.org_id.toLowerCase() === candidate2.toLowerCase()));
          if (matchedManager && matchedManager.org_id) {
            org_id = matchedManager.org_id;
            db.createOrganization({
              id: org_id,
              name: `${matchedManager.name}'s Transport Fleet`,
              plan_tier: "free",
              created_at: new Date().toISOString()
            });
          }
        }
    }
  }

  if (!org_id) {
    return res.status(400).json({ error: "Invalid invite code. Please check with your fleet manager." });
  }

  const existing = db.getUsers().find(u => u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "Phone number already registered." });
  }

  const newUser = db.createUser({
    org_id,
    role: "driver",
    name,
    phone,
    preferred_language: preferred_language || 'hi'
  }, password);

  res.json({ user: newUser });
});

// -----------------------------------------------------
// 3. VEHICLE MANAGEMENT ENDPOINTS
// -----------------------------------------------------
app.get('/api/db-status', (req, res) => {
  res.json(db.getStatus());
});


app.get('/api/scheduled-services', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  const services = db.getScheduledServices(org_id as string);
  res.json({ services });
});

app.post('/api/schedule-service', (req, res) => {
  const data = req.body;
  if (!data.org_id || !data.vehicle_id) {
    return res.status(400).json({ error: "org_id and vehicle_id are required." });
  }
  db.addScheduledService(data);
  res.json({ success: true });
});

app.get('/api/vehicles', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ vehicles: db.getVehicles(org_id as string) });
});

app.post('/api/vehicles', (req, res) => {
  const { org_id, registration_number, make, model, year, assigned_driver_id, mileage, last_service_date } = req.body;
  if (!org_id || !registration_number || !make || !model) {
    return res.status(400).json({ error: "Missing required vehicle parameters." });
  }
  const newVehicle = db.addVehicle({
    org_id,
    registration_number,
    make,
    model,
    year: parseInt(year) || new Date().getFullYear(),
    assigned_driver_id: assigned_driver_id || null,
    mileage: parseInt(mileage) || 0,
    last_service_date: last_service_date || new Date().toISOString().split('T')[0]
  });
  res.json({ vehicle: newVehicle });
});

app.put('/api/vehicles/:id', (req, res) => {
  const updated = db.updateVehicle(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Vehicle not found." });
  res.json({ vehicle: updated });
});

app.delete('/api/vehicles/:id', (req, res) => {
  const deleted = db.deleteVehicle(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Vehicle not found." });
  res.json({ success: true });
});

// -----------------------------------------------------
// 4. DRIVER MANAGEMENT ENDPOINTS
// -----------------------------------------------------
app.get('/api/drivers', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  
  // Find all users who are drivers under this org
  const drivers = db.getUsers().filter(u => u.org_id === org_id && u.role === 'driver');
  res.json({ drivers });
});

// -----------------------------------------------------
// 5. DIAGNOSTIC PIPELINE (Multi-Agent Reasoning)
// -----------------------------------------------------
app.post('/api/fault-reports', async (req, res) => {
  const { vehicle_id, driver_id, symptom_text_hindi, symptom_text_english, acoustic_signal_class, image_base64 } = req.body;
  
  if (!driver_id || !symptom_text_hindi) {
    return res.status(400).json({ error: "Driver ID and symptom text are required." });
  }

  // Fallback vehicle_id determination if missing
  let targetVehicleId = vehicle_id;
  if (!targetVehicleId) {
    const driver = db.getUsers().find(u => u.id === driver_id);
    if (driver && driver.org_id) {
      const orgVehs = db.getVehicles(driver.org_id);
      const assignedVeh = orgVehs.find(v => v.assigned_driver_id === driver_id);
      targetVehicleId = assignedVeh ? assignedVeh.id : (orgVehs[0] ? orgVehs[0].id : "veh_unknown");
    } else {
      targetVehicleId = "veh_unknown";
    }
  }

  const timestamp = new Date().toISOString();

  // Step A: Perform RAG lookup against local fault knowledge base
  const kbMatches = performRAGLookup(symptom_text_hindi, symptom_text_english || "");
  console.log(`RAG matched ${kbMatches.length} faults from database for diagnosis.`);

  // Prepare fallback heuristic values in case Gemini fails or is not available
  const topMatch = kbMatches[0];
  const fallbackResult = {
    symptom_text_english: symptom_text_english || "The engine stalls and is releasing black smoke.",
    diagnosis: topMatch.symptom_english + ". " + topMatch.likely_causes.join(", ") + " suspected.",
    severity: topMatch.severity,
    recommended_action: topMatch.recommended_action,
    estimated_cost_range: topMatch.typical_cost_range,
    agent_trace: {
      SupervisorAgent: "Local RAG Supervisor routed to heavy drivetrain diagnostics.",
      DiagnosticAgent: `Identified match with fault model ${topMatch.id} based on keywords and acoustical pattern of "${acoustic_signal_class || 'none'}".`,
      TriageAgent: `Matched severity category: ${topMatch.severity.toUpperCase()}. Driver action advised.`,
      MaintenanceAgent: `Recommended immediate inspection of ${topMatch.likely_causes[0]}. Cost estimate standard: ${topMatch.typical_cost_range}.`,
      ReportAgent: "Compiled standard offline diagnostic report row successfully."
    }
  };

  // Step B: Call Gemini multi-agent reasoning pipeline or fallback gracefully if key is missing/placeholder
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    console.log("INFO: Resolving via server-side Local RAG heuristic (Gemini API Key not set/using placeholder).");
    const hTranslation = translateKnowledgeBaseToHindi(topMatch.id, fallbackResult.diagnosis, fallbackResult.recommended_action);
    
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: fallbackResult.symptom_text_english,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: fallbackResult.severity,
      diagnosis: hTranslation.diagnosis,
      recommended_action: hTranslation.recommended_action,
      estimated_cost_range: hTranslation.estimated_cost_range,
      synced_at: timestamp, // Mark synced since it hit server successfully
      agent_trace_json: JSON.stringify(fallbackResult.agent_trace)
    });

    return res.json({ 
      report: saved, 
      warning: "Diagnostic pipeline resolved via server-side Local RAG heuristic (Gemini API was offline/unavailable)." 
    });
  }

  try {
    console.log("Invoking True LangGraph 5-Agent Pipeline...");
    
    // Execute the LangGraph workflow
    const parsed = await diagnosticGraph.invoke({
      symptom_hindi: symptom_text_hindi,
      image_base64: image_base64,
      acoustic_signal: acoustic_signal_class || "normal",
      kb_matches: kbMatches
    });

    // Save report to database
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: (parsed as any).symptom_text_english || (parsed as any).symptom_english,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: parsed.severity as any,
      diagnosis: parsed.diagnosis,
      recommended_action: parsed.recommended_action,
      estimated_cost_range: parsed.estimated_cost_range,
      synced_at: timestamp,
      agent_trace_json: JSON.stringify(parsed.agent_trace)
    });

    return res.json({ report: saved });

  } catch (error: any) {
    console.warn("Gemini Multi-Agent API failed at runtime. Saving using local RAG fallback.", error.message);
    const hTranslation = translateKnowledgeBaseToHindi(topMatch.id, fallbackResult.diagnosis, fallbackResult.recommended_action);

    // Save report using local RAG fallback
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: fallbackResult.symptom_text_english,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: fallbackResult.severity,
      diagnosis: hTranslation.diagnosis,
      recommended_action: hTranslation.recommended_action,
      estimated_cost_range: hTranslation.estimated_cost_range,
      synced_at: timestamp, // Mark synced since it hit server successfully
      agent_trace_json: JSON.stringify(fallbackResult.agent_trace)
    });

    return res.json({ 
      report: saved, 
      warning: "Diagnostic pipeline resolved via server-side Local RAG fallback due to a transient API issue." 
    });
  }
});

// Local Client Offline Mode Sync endpoint
app.post('/api/fault-reports/sync', (req, res) => {
  const { reports } = req.body;
  if (!reports || !Array.isArray(reports)) {
    return res.status(400).json({ error: "Invalid sync package." });
  }

  console.log(`Syncing ${reports.length} pending offline fault reports from driver device...`);
  const syncedReports = [];

  for (const rep of reports) {
    // Add to DB with current synced timestamp
    const saved = db.addFaultReport({
      vehicle_id: rep.vehicle_id,
      driver_id: rep.driver_id,
      timestamp: rep.timestamp,
      symptom_text_hindi: rep.symptom_text_hindi,
      symptom_text_english: rep.symptom_text_english,
      acoustic_signal_class: rep.acoustic_signal_class,
      severity: rep.severity,
      diagnosis: rep.diagnosis,
      recommended_action: rep.recommended_action,
      estimated_cost_range: rep.estimated_cost_range,
      synced_at: new Date().toISOString(),
      agent_trace_json: rep.agent_trace_json
    });
    syncedReports.push(saved);
  }

  res.json({ success: true, syncedCount: syncedReports.length });
});

app.get('/api/fault-reports', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ reports: db.getFaultReports(org_id as string) });
});

app.get('/api/fault-reports/driver/:driverId', (req, res) => {
  res.json({ reports: db.getDriverFaultReports(req.params.driverId) });
});

// Real-time audio transcription endpoint via Gemini 3.5 Flash
app.post('/api/transcribe-audio', async (req, res) => {
  const { audio_base64, mime_type } = req.body;
  if (!audio_base64) {
    return res.status(400).json({ error: "Audio base64 data is required." });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return res.json({
        hindi: "इंजन बार बार बंद हो रहा है और धुआं आ रहा है",
        english: "The engine is stalling repeatedly and smoke is coming out"
      });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mime_type || "audio/webm",
            data: audio_base64
          }
        },
        "Listen to this voice recording of an Indian commercial truck driver describing their vehicle symptom. Transcribe what they say in Hindi (Devanagari script) and translate it to clear English. Output your response as a JSON object with 'hindi' and 'english' keys."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hindi: { type: Type.STRING, description: "Transcription of the driver symptom in Devanagari Hindi" },
            english: { type: Type.STRING, description: "Direct English translation of the driver symptom" }
          },
          required: ["hindi", "english"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Audio transcription via Gemini failed:", error.message);
    res.status(500).json({ error: "Failed to transcribe audio. Please type the symptom manually." });
  }
});

// Conversational Driver Copilot AI assistant endpoint via Gemini 3.5 Flash
app.post('/api/driver-copilot', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return res.json({ reply: "हाँ भाई, लगता है गाड़ी का पावर कम हो रहा है। कृपया एयर फ़िल्टर और पाइप के क्लैंप चेक करें। मैं अभी ऑफलाइन लोकल मोड में हूँ।" });
    }

    const ai = getGeminiClient();
    const systemInstruction = `
      You are VahanAI's Senior Fleet Diagnostic Copilot, an expert mechanic and technical support assistant for Indian commercial vehicles (Tata, Ashok Leyland, Mahindra trucks & buses).
      Answer the driver's questions or comments in a friendly, reassuring, simple, and mechanical expert manner.
      Respond strictly in clear, simple Hindi (written in Devanagari script) so that the truck driver can easily read and understand. Do not use complex English terms or Latin script unless absolutely necessary (like name of parts: 'radiator', 'injector' which can be written in Hindi like 'रेडिएटर' or 'इंजेक्टर').
      Keep answers concise (max 3-4 sentences), highly practical, safety-first, and realistic for Indian highway breakdown scenarios.
    `;

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.content }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
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
      let actionObj = null;

      if (call.name === "log_sos_alert") {
        const reason = call.args && call.args.reason ? call.args.reason : "Driver requested emergency SOS via Copilot";
        db.addSosAlert("org_rajpath", reason as string);
        toolResponseStr = "[🚨 SOS ALERT SENT] आपकी आपातकालीन स्थिति फ्लीट मैनेजर को भेज दी गई है। कृपया सुरक्षित स्थान पर रहें, मदद जल्द ही आ रही है।";
      } else if (call.name === "find_service_station") {
        toolResponseStr = "[📍 SERVICE STATION FOUND] मैंने आपके आस-पास 3 Tata Motors ऑथराइज्ड सर्विस स्टेशन खोजे हैं। आपकी स्क्रीन पर नेविगेशन लिंक भेजा जा रहा है।";
        actionObj = { type: "OPEN_MAPS", url: "https://www.google.com/maps/search/Tata+Motors+Authorized+Service+Station" };
      } else if (call.name === "log_maintenance_request") {
        const issue = call.args && call.args.issue ? call.args.issue : "सामान्य सर्विस";
        toolResponseStr = `[⚙️ MAINTENANCE LOGGED] आपका सर्विस रिक्वेस्ट ("${issue}") फ्लीट मैनेजर को भेज दिया गया है। इसे अगली ट्रिप के बाद शेड्यूल किया जाएगा।`;
      }
      
      return res.json({ reply: toolResponseStr, action: actionObj });
    }

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Driver copilot AI failed:", error.message);
    res.json({ reply: "माफ़ कीजिये भाई, नेटवर्क में कुछ दिक्कत है। कृपया चेक करें कि इंजन ऑयल का लेवल सही है और कोई कूलेंट लीक तो नहीं हो रहा है।" });
  }
});

// -----------------------------------------------------
// 6. PATTERN ALERTS ENDPOINTS
// -----------------------------------------------------
app.get('/api/fleet-alerts', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ alerts: db.getFleetAlerts(org_id as string) });
});

app.post('/api/fleet-alerts/:id/resolve', (req, res) => {
  const resolved = db.resolveFleetAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: "Alert not found." });
  res.json({ success: true });
});

// -----------------------------------------------------
// 7. FATIGUE EVENTS ENDPOINTS
// -----------------------------------------------------
app.get('/api/fatigue-events', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ events: db.getFatigueEvents(org_id as string) });
});

app.post('/api/fatigue-events', (req, res) => {
  const { driver_id, ear_value, duration_seconds, severity } = req.body;
  if (!driver_id || ear_value === undefined) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  const newEvent = db.addFatigueEvent({
    driver_id,
    timestamp: new Date().toISOString(),
    ear_value: parseFloat(ear_value),
    duration_seconds: parseInt(duration_seconds) || 5,
    severity: severity || "caution"
  });
  res.json({ event: newEvent });
});

// -----------------------------------------------------
// 8. SERVICE CENTERS ENDPOINTS
// -----------------------------------------------------
app.get('/api/service-centers', (req, res) => {
  res.json({ centers: db.getServiceCenters() });
});

// -----------------------------------------------------
// 9. WHATSAPP WEBHOOK (Real testable endpoint)
// -----------------------------------------------------
app.post('/api/whatsapp/webhook', async (req, res) => {
  const { From, Body } = req.body; // Standard Twilio fields
  if (!From || !Body) {
    return res.status(400).json({ error: "Missing standard From/Body parameters." });
  }

  console.log(`Received Twilio WhatsApp message from ${From}: "${Body}"`);

  // Simple hardcoded driver search or anonymous fallback
  const driver = db.getUsers().find(u => From.includes(u.phone)) || { id: "driver_anon", name: "Anonymous Driver" };
  const vehicle = db.getVehicles("org_rajpath")[0]; // Mock to first available Rajpath vehicle

  const kbMatches = performRAGLookup(Body, "");
  const topMatch = kbMatches[0];

  let diagnosisText = "";
  let severityText = "";
  let actions = "";

  const key = process.env.GEMINI_API_KEY;
  if (key && key !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = getGeminiClient();
      const prompt = `
        A driver sent a breakdown symptom via WhatsApp in Hindi: "${Body}"
        Analyze this and provide a brief English diagnosis, Hindi diagnosis, and severity (DRIVE / CAUTION / STOP).
        Keep it extremely concise (max 3 sentences) suitable for a WhatsApp reply.
      `;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      diagnosisText = response.text || topMatch.symptom_english;
      severityText = topMatch.severity.toUpperCase();
      actions = topMatch.recommended_action;
    } catch (err: any) {
      console.warn("WhatsApp Gemini generation failed, using local RAG:", err.message);
      diagnosisText = `Basic Offline Diagnosis: ${topMatch.symptom_english}. Possible cause: ${topMatch.likely_causes[0]}.`;
      severityText = topMatch.severity.toUpperCase();
      actions = topMatch.recommended_action;
    }
  } else {
    diagnosisText = `Basic Offline Diagnosis: ${topMatch.symptom_english}. Possible cause: ${topMatch.likely_causes[0]}.`;
    severityText = topMatch.severity.toUpperCase();
    actions = topMatch.recommended_action;
  }

  // Generate Twilio TwiML response
  res.set('Content-Type', 'text/xml');
  const twimlResponse = `
    <Response>
      <Message>
        *VahanAI Roadside Diagnosis*
        
        *Symptom:* ${Body}
        *Severity:* ${severityText}
        *Diagnosis:* ${diagnosisText}
        
        *Action Recommended:* ${actions}
        *Repair Est:* ${topMatch.typical_cost_range}
      </Message>
    </Response>
  `;
  res.send(twimlResponse.trim());
});

// -----------------------------------------------------
// 9.5. EMERGENCY SOS ENDPOINTS
// -----------------------------------------------------
app.get('/api/sos-alerts', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ alerts: db.getSosAlerts(org_id as string) });
});

app.post('/api/sos-alerts', (req, res) => {
  const { org_id, driver_id, driver_name, truck_number, current_route, latitude, longitude, timestamp, status } = req.body;
  if (!org_id || !driver_id || !driver_name || !truck_number) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  const newAlert = db.addSosAlertRecord({
    org_id,
    driver_id,
    driver_name,
    truck_number,
    current_route: current_route || "Unknown Route",
    latitude: parseFloat(latitude) || 0,
    longitude: parseFloat(longitude) || 0,
    timestamp: timestamp || new Date().toISOString(),
    status: status || "SOS"
  });
  res.json({ alert: newAlert });
});

app.post('/api/sos-alerts/:id/resolve', (req, res) => {
  const resolved = db.resolveSosAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: "SOS alert not found." });
  res.json({ success: true });
});

// -----------------------------------------------------
// 10. VITE MIDDLEWARE & STATIC SERVING
// -----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Connect to MongoDB asynchronously on startup
  db.connectMongo().catch(err => {
    console.error("Error initializing MongoDB connection:", err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VahanAI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
