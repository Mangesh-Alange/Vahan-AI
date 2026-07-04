import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, AlertTriangle, Check, ShieldAlert, Sparkles, Volume2, 
  Wifi, WifiOff, FileText, Download, Play, Square, Activity, 
  Eye, RefreshCw, LogOut, ChevronDown, ChevronUp, UserPlus, 
  Truck, Settings, Lock, Phone, User, EyeOff, AlertOctagon, HelpCircle,
  Send, MessageSquare, Sun, Moon
, Camera, X, MessageCircle, Map, MapPin, Navigation} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType, Vehicle, FaultReport, FatigueEvent } from '../types.js';
import { faultKnowledgeBase } from '../../server/faultKnowledgeBase.js';
import { API_URL } from '../config.js';

interface DriverAppProps {
  user: UserType;
  onLogout: () => void;
}

type VehicleIssueCategory =
  | 'Engine'
  | 'Transmission/Gearbox'
  | 'Brakes'
  | 'Electrical System'
  | 'Suspension/Steering'
  | 'Cooling System'
  | 'Exhaust'
  | 'Not Sure / Multiple';
type QuestionnaireAnswerValue = boolean | string | string[] | null;
type IntakeFrequency = 'Always' | 'Only when cold-started' | 'Only at high speed' | 'Intermittent';
type IntakeDuration = 'Just started' | 'Few days' | 'Few weeks' | 'Ongoing for a long time';
type QuestionnaireStage = 1 | 2 | 3 | 4;

interface QuestionnaireQuestion {
  key: string;
  label: string;
  type: 'boolean' | 'choice' | 'text' | 'multi-select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

interface DriverIssueQuestionnaireContext {
  primaryCategory: VehicleIssueCategory;
  possibleRelatedCategories: VehicleIssueCategory[];
  symptoms: Record<string, boolean | string | string[]>;
  frequency: IntakeFrequency | '';
  duration: IntakeDuration | '';
  userAdditionalNotes: string;
  userDescription: string;
}

const VEHICLE_ISSUE_CATEGORIES: VehicleIssueCategory[] = [
  'Engine',
  'Transmission/Gearbox',
  'Brakes',
  'Electrical System',
  'Suspension/Steering',
  'Cooling System',
  'Exhaust',
  'Not Sure / Multiple'
];

const ISSUE_CATEGORY_META: Record<VehicleIssueCategory, { hint: string; keywords: string[]; accent: string }> = {
  Engine: {
    hint: 'Noise, power loss, rough idle, smoke.',
    keywords: ['engine', 'pickup', 'power', 'overheat', 'smoke', 'misfire', 'knocking', 'ticking', 'इंजन', 'पावर', 'धुआं'],
    accent: 'bg-orange-500/10 text-orange-500 border-orange-500/30'
  },
  'Transmission/Gearbox': {
    hint: 'Hard shifting, slip, clutch, gear noise.',
    keywords: ['gear', 'gearbox', 'transmission', 'clutch', 'slip', 'shift', 'grinding', 'clunk', 'गियर', 'क्लच'],
    accent: 'bg-amber-500/10 text-amber-500 border-amber-500/30'
  },
  Brakes: {
    hint: 'Pedal feel, pull, squeal, vibration.',
    keywords: ['brake', 'pedal', 'squeal', 'grinding', 'pulls', 'spongy', 'ब्रेक', 'पैडल'],
    accent: 'bg-red-500/10 text-red-400 border-red-500/30'
  },
  'Electrical System': {
    hint: 'Battery, charging, lights, starting.',
    keywords: ['battery', 'charging', 'alternator', 'start', 'self', 'flicker', 'wiring', 'electrical', 'बैटरी', 'स्टार्ट'],
    accent: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
  },
  'Suspension/Steering': {
    hint: 'Knocks, steering play, drift, bumps.',
    keywords: ['suspension', 'steering', 'knock', 'play', 'drift', 'alignment', 'shock', 'झटका', 'स्टीयरिंग'],
    accent: 'bg-violet-500/10 text-violet-400 border-violet-500/30'
  },
  'Cooling System': {
    hint: 'Heat, coolant, fan, steam, leaks.',
    keywords: ['coolant', 'temperature', 'overheat', 'radiator', 'fan', 'steam', 'heat', 'water', 'कूलेंट', 'गर्म'],
    accent: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  },
  Exhaust: {
    hint: 'Smoke color, soot, smell, exhaust noise.',
    keywords: ['exhaust', 'smoke', 'soot', 'muffler', 'silencer', 'smell', 'black smoke', 'white smoke', 'धुआं', 'साइलेंसर'],
    accent: 'bg-stone-500/10 text-stone-300 border-stone-500/30'
  },
  'Not Sure / Multiple': {
    hint: 'Use when signs overlap or are unclear.',
    keywords: [],
    accent: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
  }
};

const QUESTIONNAIRE_QUESTIONS: Record<Exclude<VehicleIssueCategory, 'Not Sure / Multiple'>, QuestionnaireQuestion[]> = {
  Engine: [
    { key: 'engineNoise', label: 'Any unusual noise from the engine (knocking/ticking)?', type: 'boolean', required: true },
    { key: 'dashboardWarning', label: 'Any warning light on the dashboard?', type: 'boolean', required: true },
    { key: 'powerLoss', label: 'Loss of power while driving or climbing?', type: 'boolean', required: true },
    { key: 'smokeColor', label: 'Smoke from exhaust?', type: 'choice', options: ['None', 'White', 'Black', 'Blue', 'Not sure'] },
    { key: 'roughIdle', label: 'Rough idling or vibration at stop?', type: 'boolean' }
  ],
  'Transmission/Gearbox': [
    { key: 'hardToShiftGears', label: 'Hard to shift gears?', type: 'boolean', required: true },
    { key: 'grindingNoise', label: 'Grinding or clunking when shifting?', type: 'boolean', required: true },
    { key: 'delayedEngagement', label: 'Delayed engagement in Drive or Reverse?', type: 'boolean', required: true },
    { key: 'gearSlip', label: 'Engine revs rise but vehicle does not pull as expected?', type: 'boolean' },
    { key: 'fluidLeak', label: 'Any fluid leak under the vehicle?', type: 'choice', options: ['No', 'Yes - red/brown', 'Yes - clear', 'Yes - unsure'] }
  ],
  Brakes: [
    { key: 'squealingOrGrinding', label: 'Squealing or grinding noise when braking?', type: 'boolean', required: true },
    { key: 'softBrakePedal', label: 'Soft or spongy brake pedal?', type: 'boolean', required: true },
    { key: 'pullsToOneSide', label: 'Vehicle pulls to one side when braking?', type: 'boolean', required: true },
    { key: 'brakePulse', label: 'Pedal pulsation or vibration under braking?', type: 'boolean' },
    { key: 'warningLight', label: 'Brake warning light on dashboard?', type: 'boolean' }
  ],
  'Electrical System': [
    { key: 'startingProblem', label: 'Starting or cranking problem?', type: 'boolean', required: true },
    { key: 'batteryWarningLight', label: 'Battery / charging warning light on?', type: 'boolean', required: true },
    { key: 'lightsFlicker', label: 'Headlights or cabin lights flickering?', type: 'boolean', required: true },
    { key: 'accessoriesDead', label: 'Any accessories not working (horn, wipers, indicators)?', type: 'boolean' },
    { key: 'burningSmell', label: 'Burning smell from wiring or fuse box?', type: 'boolean' }
  ],
  'Suspension/Steering': [
    { key: 'knockOverBumps', label: 'Knock or thud over bumps / potholes?', type: 'boolean', required: true },
    { key: 'steeringPlay', label: 'Excessive play or looseness in steering?', type: 'boolean', required: true },
    { key: 'pullOrDrift', label: 'Vehicle pulls or drifts to one side?', type: 'boolean', required: true },
    { key: 'bodyRoll', label: 'Body roll or bouncing feels unusually high?', type: 'boolean' },
    { key: 'tyreWear', label: 'Uneven tyre wear noticed?', type: 'boolean' }
  ],
  'Cooling System': [
    { key: 'temperatureHigh', label: 'Temperature gauge running high?', type: 'boolean', required: true },
    { key: 'coolantLeak', label: 'Any coolant leak under the vehicle or near radiator?', type: 'boolean', required: true },
    { key: 'fanRunningConstantly', label: 'Cooling fan running continuously or too often?', type: 'boolean', required: true },
    { key: 'steamOrSweetSmell', label: 'Steam or sweet smell from the bonnet area?', type: 'boolean' },
    { key: 'heaterWeak', label: 'Cabin heater weak even when engine warms up?', type: 'boolean' }
  ],
  Exhaust: [
    { key: 'smokeColor', label: 'Exhaust smoke color?', type: 'choice', options: ['None', 'White', 'Black', 'Blue', 'Grey', 'Not sure'], required: true },
    { key: 'sootOrResidue', label: 'Soot or residue around the tailpipe?', type: 'boolean', required: true },
    { key: 'exhaustNoise', label: 'Loud exhaust leak or hissing sound?', type: 'boolean', required: true },
    { key: 'smell', label: 'Strong fuel, burning or oily smell from exhaust?', type: 'boolean' },
    { key: 'powerDrop', label: 'Power drop or sluggish acceleration?', type: 'boolean' }
  ]
};

const FREQUENCY_OPTIONS: IntakeFrequency[] = ['Always', 'Only when cold-started', 'Only at high speed', 'Intermittent'];
const DURATION_OPTIONS: IntakeDuration[] = ['Just started', 'Few days', 'Few weeks', 'Ongoing for a long time'];

export default function DriverApp({ user, onLogout }: DriverAppProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'diagnose' | 'acoustic' | 'fatigue' | 'history' | 'wellness'>('diagnose');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  
  // Network Simulation & Theme
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  // Vehicles State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [registrationMode, setRegistrationMode] = useState<boolean>(false);
  const [isInspectionScheduled, setIsInspectionScheduled] = useState<boolean>(false);
  const [isInspectionDismissed, setIsInspectionDismissed] = useState<boolean>(false);
  const [newVehicle, setNewVehicle] = useState({
    registration_number: '',
    make: 'Tata' as 'Tata' | 'Ashok Leyland' | 'Mahindra',
    model: '',
    year: 2024,
    mileage: 50000
  });

  // Voice & Input State
  const [symptomText, setSymptomText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [speechStatus, setSpeechStatus] = useState<string>('');
  const [audioSignalClass, setAudioSignalClass] = useState<'normal' | 'knock' | 'squeal' | 'misfire'>('normal');

  // Diagnosis State
  const [diagnosisResult, setDiagnosisResult] = useState<FaultReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [showTrace, setShowTrace] = useState<boolean>(false);

  // Acoustic Fault State
  const [isRecordingAcoustic, setIsRecordingAcoustic] = useState<boolean>(false);
  const [acousticWaveform, setAcousticWaveform] = useState<number[]>(Array(50).fill(128));
  const [acousticClassification, setAcousticClassification] = useState<string>('सही इंजन आवाज़ (Normal)');
  const [acousticDataLog, setAcousticDataLog] = useState<any[]>([]);
  const acousticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const acousticMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const acousticChunksRef = useRef<Blob[]>([]);
  const acousticStartTimeRef = useRef<number>(0);

  // Fatigue State
  const [isFatigueMonitoring, setIsFatigueMonitoring] = useState<boolean>(false);
  const [earValue, setEarValue] = useState<number>(0.32);
  const [earHistory, setEarHistory] = useState<number[]>(Array(40).fill(0.32));
  const [isDrowsy, setIsDrowsy] = useState<boolean>(false);
  const [isCritical, setIsCritical] = useState<boolean>(false);
  const [simulateDrowsy, setSimulateDrowsy] = useState<boolean>(false);
  
  const simulateDrowsyRef = useRef<boolean>(false);
  const isCriticalRef = useRef<boolean>(false);

  
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    simulateDrowsyRef.current = simulateDrowsy;
  }, [simulateDrowsy]);

  useEffect(() => {
    isCriticalRef.current = isCritical;
  }, [isCritical]);

  const fatigueIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const avgDarkPixelsRef = useRef<number>(0);
  
  // Suppression cooldown for cancelling alert without instant re-trigger
  const suppressedUntilRef = useRef<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Fatigue Score & Audio Alarm Synthesizer
  const [fatigueScore, setFatigueScore] = useState<number>(0);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmAudioContextRef = useRef<AudioContext | null>(null);

  const startAlarmSound = () => {
    if (alarmIntervalRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      alarmAudioContextRef.current = ctx;

      let toggle = false;
      alarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(toggle ? 1050 : 1450, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        toggle = !toggle;
      }, 350);
    } catch (e) {
      console.error("Failed to play alarm buzzer", e);
    }
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmAudioContextRef.current) {
      try {
        alarmAudioContextRef.current.close();
      } catch (e) {}
      alarmAudioContextRef.current = null;
    }
  };

  // History State
  const [historyReports, setHistoryReports] = useState<FaultReport[]>([]);
  const [isSyncingHistory, setIsSyncingHistory] = useState<boolean>(false);

  // Real voice message recording (Gemini AI)
  const [isRecordingRealVoice, setIsRecordingRealVoice] = useState<boolean>(false);
  const [realVoiceStatus, setRealVoiceStatus] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);

  // Driver AI Copilot Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: "नमस्ते भाई! मैं आपका VahanAI कोपायलट सहायक हूँ। गाड़ी के ब्रेकडाउन, मैकेनिक्स या हाइवे सुरक्षा के बारे में कुछ भी पूछें।" }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingToCopilot, setIsSendingToCopilot] = useState<boolean>(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState<boolean>(false);
  const [questionnaireStep, setQuestionnaireStep] = useState<QuestionnaireStage>(1);
  const [selectedIssueCategory, setSelectedIssueCategory] = useState<VehicleIssueCategory | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, QuestionnaireAnswerValue>>({});
  const [pendingCopilotMessage, setPendingCopilotMessage] = useState<string | null>(null);
  const [suggestedIssueCategory, setSuggestedIssueCategory] = useState<VehicleIssueCategory | null>(null);
  const [relatedCategories, setRelatedCategories] = useState<VehicleIssueCategory[]>([]);
  const [questionnaireFrequency, setQuestionnaireFrequency] = useState<IntakeFrequency | ''>('');
  const [questionnaireDuration, setQuestionnaireDuration] = useState<IntakeDuration | ''>('');
  const [userAdditionalNotes, setUserAdditionalNotes] = useState<string>('');
  const [questionnaireStepError, setQuestionnaireStepError] = useState<string>('');
  const [questionnaireReview, setQuestionnaireReview] = useState<DriverIssueQuestionnaireContext | null>(null);
  const [isQuestionnaireSubmitting, setIsQuestionnaireSubmitting] = useState<boolean>(false);

  // SOS State
  const [isSendingSos, setIsSendingSos] = useState<boolean>(false);
  const [sosSuccessMessage, setSosSuccessMessage] = useState<string>('');

  const handleSOS = async () => {
    const confirmMessage = "⚠️ क्या आप आपातकालीन स्थिति (SOS) घोषित करना चाहते हैं? इससे फ्लीट मैनेजर को सूचित किया जाएगा।\n\n(Do you want to declare an emergency? This will notify your Fleet Manager.)";
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSendingSos(true);
    setSosSuccessMessage('');

    const sendSosPayload = async (lat: number, lng: number) => {
      try {
        const activeVehicle = vehicles.find(v => v.id === selectedVehicleId);
        const truckNumber = activeVehicle ? activeVehicle.registration_number : "MH-12-UNKNOWN";
        const currentRoute = "NH-48, Pune Hwy"; // Default current route

        const res = await fetch(`${API_URL}/api/sos-alerts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: user.org_id,
            driver_id: user.id,
            driver_name: user.name,
            truck_number: truckNumber,
            current_route: currentRoute,
            latitude: lat,
            longitude: lng,
            timestamp: new Date().toISOString(),
            status: "SOS"
          })
        });

        if (res.ok) {
          setSosSuccessMessage("🚨 फ्लीट मैनेजर को सूचित कर दिया गया है! सहायता जल्द आ रही है। (Fleet Manager notified!)");
          setTimeout(() => setSosSuccessMessage(''), 5000);
        } else {
          alert("Failed to send SOS. Please check your internet connection.");
        }
      } catch (err) {
        console.error("SOS call failed", err);
        alert("Failed to send SOS due to connection error.");
      } finally {
        setIsSendingSos(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendSosPayload(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation failed. Sending with default coordinates.", error);
          sendSosPayload(19.0760, 72.8777); // Default fallback (Mumbai highway coordinates)
        },
        { timeout: 8000 }
      );
    } else {
      console.warn("Geolocation not supported. Sending with default coordinates.");
      sendSosPayload(19.0760, 72.8777);
    }
  };

  // Demo scenarios
  const demoScenarios = [
    { title: "सफ़ेद धुआं (White Smoke)", text: "Exhaust se bohot tez safed dhua nikal raha hai jisme mithi sweet smell hai", desc: "Engine burning coolant", sound: "normal" as const },
    { title: "काला धुआं (Black Smoke)", text: "Gaadi ka engine band ho raha hai baar baar, thoda kaala dhua bhi aa raha hai", desc: "Common rail injector blockage (Reference Case)", sound: "misfire" as const },
    { title: "खतरनाक आवाज़ (Engine Knocking)", text: "Engine se lagatar khat-khat ki aawaz aa rahi hai, speed badhne par aawaz tez hoti hai", desc: "Connecting rod bearing damage", sound: "knock" as const },
    { title: "ब्रेक चीखना (Brake Squealing)", text: "Break dabaane par cheekhney ki tez aawaz aa rahi hai aur pedal kaanp raha hai", desc: "Severely worn brake pads", sound: "squeal" as const },
    { title: "क्लच स्लिप (Clutch Slippage)", text: "Gaadi jab thandi rehti hai tab start hone me bohot jhatka khati hai, safed smoke ata hai", desc: "Cold start ignition fault", sound: "misfire" as const }
  ];

  // -----------------------------------------------------
  // ON LOAD INITIALIZATION
  // -----------------------------------------------------
  useEffect(() => {
    fetchVehicles();
    fetchHistory();
    loadOfflineReports();

    // Listen to offline/online events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      stopAcousticCapture();
      stopFatigueMonitoring();
    };
  }, [user]);

  // Sync history periodically if online
  useEffect(() => {
    if (isOnline) {
      syncOfflineReports();
    }
  }, [isOnline]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Load vehicles
  const fetchVehicles = async () => {
    try {
      if (!user.org_id) return;
      const res = await fetch(`${API_URL}/api/vehicles?org_id=${user.org_id}`);
      const data = await res.json();
      if (data.vehicles) {
        setVehicles(data.vehicles);
        // Find if this driver is already assigned to a vehicle
        const assigned = data.vehicles.find((v: Vehicle) => v.assigned_driver_id === user.id);
        if (assigned) {
          setSelectedVehicleId(assigned.id);
        }
        // NOTE: Do NOT auto-select an unassigned vehicle — the driver must
        // explicitly register or bind a vehicle so assigned_driver_id is persisted.
      }
    } catch (err) {
      console.error("Failed to load vehicles from server.", err);
    }
  };

  // Load history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/fault-reports/driver/${user.id}`);
      const data = await res.json();
      if (data.reports) {
        setHistoryReports(data.reports);
      }
    } catch (err) {
      console.error("Error loading reports history", err);
    }
  };

  const loadOfflineReports = () => {
    const offlineData = localStorage.getItem(`offline_reports_${user.id}`);
    if (offlineData) {
      const parsed = JSON.parse(offlineData);
      // Combine with fetched history for uniform display
      setHistoryReports(prev => {
        const serverReports = prev.filter(p => p.synced_at !== null);
        return [...parsed, ...serverReports];
      });
    }
  };

  // -----------------------------------------------------
  // OFFLINE CAPABILITY LOGIC (Client-side engine RAG)
  // -----------------------------------------------------
  const performOfflineRAGDiagnosis = (hindiText: string): FaultReport => {
    const query = hindiText.toLowerCase();
    
    // Simple client-side token search
    let bestMatch = faultKnowledgeBase[0];
    let maxMatches = 0;

    faultKnowledgeBase.forEach(entry => {
      let matches = 0;
      const keywords = [
        ...entry.symptom_hindi.toLowerCase().split(/\s+/),
        ...entry.symptom_english.toLowerCase().split(/\s+/)
      ].filter(k => k.length > 3);

      keywords.forEach(kw => {
        try {
          if (new RegExp('\\b' + kw + '\\b', 'i').test(query)) matches++;
        } catch(e) {
          if (query.includes(kw)) matches++;
        }
      });

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = entry;
      }
    });

    const mockTrace = {
      SupervisorAgent: "OFFLINE MODE: Edge routing triggered. Local diagnostic pipeline active.",
      DiagnosticAgent: `OFFLINE MODE: Matched offline knowledge base row ${bestMatch.id} with ${maxMatches} keyword overlaps. Acoustical signal evaluated as: "${audioSignalClass}".`,
      TriageAgent: `OFFLINE MODE: Auto-assessed safety severity as: ${bestMatch.severity.toUpperCase()}.`,
      MaintenanceAgent: `OFFLINE MODE: Local pricing mapped for spare parts. Suggested action: ${bestMatch.recommended_action}`,
      ReportAgent: "OFFLINE MODE: Saved localized backup diagnosis index. Awaiting cloud re-analysis sync."
    };

    const offlineSymptomEnglish = bestMatch.symptom_english + (audioSignalClass !== 'normal' ? " ENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER." : "");
    const offlineDiagnosis = "OFFLINE MODE — Basic Local Diagnosis: " + bestMatch.symptom_english + " (Diagnosis run locally due to lack of network). Likely cause: " + bestMatch.likely_causes.join(", ") + (audioSignalClass !== 'normal' ? "\n\nENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER." : "");

    return {
      id: "offline_rep_" + Math.random().toString(36).substring(2, 9),
      vehicle_id: selectedVehicleId || "veh_unknown",
      driver_id: user.id,
      timestamp: new Date().toISOString(),
      symptom_text_hindi: hindiText,
      symptom_text_english: offlineSymptomEnglish,
      acoustic_signal_class: audioSignalClass,
      severity: bestMatch.severity,
      diagnosis: offlineDiagnosis,
      recommended_action: bestMatch.recommended_action,
      estimated_cost_range: bestMatch.typical_cost_range,
      synced_at: null, // null indicates offline pending sync
      agent_trace_json: JSON.stringify(mockTrace)
    };
  };

  // Submit diagnostic report
  const runDiagnosticPipeline = async () => {
    if (!symptomText.trim()) return;
    setIsDiagnosing(true);
    setDiagnosisResult(null);

    // Simulate standard processing network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!isOnline) {
      // Offline mode: perform edge calculation
      const result = performOfflineRAGDiagnosis(symptomText);
      
      // Save offline report to localStorage
      const offlineData = localStorage.getItem(`offline_reports_${user.id}`);
      const list = offlineData ? JSON.parse(offlineData) : [];
      list.unshift(result);
      localStorage.setItem(`offline_reports_${user.id}`, JSON.stringify(list));

      setDiagnosisResult(result);
      setHistoryReports(prev => [result, ...prev]);
      setIsDiagnosing(false);
    } else {
      // Online mode: call backend Express multi-agent LLM route
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${API_URL}/api/fault-reports`, {
          signal: controller.signal,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: selectedVehicleId,
            driver_id: user.id,
            symptom_text_hindi: symptomText,
            symptom_text_english: symptomText, // Server will translate
            acoustic_signal_class: audioSignalClass,
            image_base64: selectedImage
          })
        });
        const data = await res.json();
        if (data.report) {
          setDiagnosisResult(data.report);
          setHistoryReports(prev => [data.report, ...prev]);
        } else if (data.error) {
          alert("Error: " + data.error);
        }
      } catch (err) {
        console.error("Diagnostic pipeline server request failed. Falling back to local RAG.", err);
        // Fallback to local RAG diagnostic even if request failed
        const result = performOfflineRAGDiagnosis(symptomText);
        setDiagnosisResult(result);
      } finally {
        setIsDiagnosing(false);
      }
    }
  };

  const syncOfflineReports = async () => {
    const offlineData = localStorage.getItem(`offline_reports_${user.id}`);
    if (!offlineData) return;

    const list = JSON.parse(offlineData);
    if (list.length === 0) return;

    setIsSyncingHistory(true);
    console.log(`Starting background sync of ${list.length} offline diagnostic reports...`);

    try {
      const res = await fetch(`${API_URL}/api/fault-reports/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: list })
      });
      const data = await res.json();
      if (data.success) {
        // Successfully synced! Clear local storage
        localStorage.removeItem(`offline_reports_${user.id}`);
        // Refresh server database records
        await fetchHistory();
        console.log("Offline background sync completed successfully.");
      }
    } catch (err) {
      console.error("Failed to background sync offline reports.", err);
    } finally {
      setIsSyncingHistory(false);
    }
  };

  // -----------------------------------------------------
  // VEHICLE REGISTRATION
  // -----------------------------------------------------
  const handleRegisterVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.registration_number || !newVehicle.model) return;

    try {
      const res = await fetch(`${API_URL}/api/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: user.org_id || "org_solo",
          registration_number: newVehicle.registration_number,
          make: newVehicle.make,
          model: newVehicle.model,
          year: newVehicle.year,
          assigned_driver_id: user.id,
          mileage: newVehicle.mileage,
          last_service_date: new Date().toISOString().split('T')[0]
        })
      });
      const data = await res.json();
      if (data.vehicle) {
        setVehicles(prev => [...prev, data.vehicle]);
        setSelectedVehicleId(data.vehicle.id);
        setRegistrationMode(false);
        alert("Vehicle successfully registered and assigned!");
      }
    } catch (err) {
      console.error("Failed to register vehicle.", err);
    }
  };

  // Bind driver to an existing unassigned org vehicle
  const handleBindExistingVehicle = async (vehicleId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_driver_id: user.id })
      });
      const data = await res.json();
      if (data.vehicle) {
        setVehicles(prev => prev.map(v => v.id === vehicleId ? data.vehicle : v));
        setSelectedVehicleId(vehicleId);
        alert("Vehicle bound and assigned to your account!");
      } else {
        alert("Failed to bind vehicle. Please try again.");
      }
    } catch (err) {
      console.error("Failed to bind existing vehicle.", err);
    }
  };

  // -----------------------------------------------------
  // HINDI SPEECH RECOGNITION (Web Speech API)
  // -----------------------------------------------------
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus("Browser Speech API not supported. Please type symptoms instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecordingVoice(true);
    setSpeechStatus("गाड़ी के लक्षणों को हिंदी में बोलें... (Speak now...)");

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setSymptomText(speechToText);
      setSpeechStatus("सफलतापूर्वक पहचाना गया! (Speech recognized)");
      setIsRecordingVoice(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setSpeechStatus(`Speech error: ${event.error}. Please type below.`);
      setIsRecordingVoice(false);
    };

    recognition.onend = () => {
      setIsRecordingVoice(false);
    };

    recognition.start();
  };

  // -----------------------------------------------------
  // REAL VOICE RECORDING AND TRANSCRIPTION (Gemini AI)
  // -----------------------------------------------------
  const startRealVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
        setRealVoiceStatus("Transcribing with Gemini AI...");
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const res = await fetch(`${API_URL}/api/transcribe-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio_base64: base64Data,
                mime_type: 'audio/webm'
              })
            });
            const data = await res.json();
            if (data.hindi) {
              setSymptomText(data.hindi);
              setSpeechStatus(`Gemini Transcribed: "${data.hindi}"`);
              setRealVoiceStatus('');
            } else {
              setRealVoiceStatus('Transcription failed. Try speaking clearly or typing.');
            }
          } catch (err) {
            console.error("Transcription API failed", err);
            setRealVoiceStatus('Error connecting to AI. Try typing.');
          }
        };
      };

      mediaRecorder.start();
      setIsRecordingRealVoice(true);
      setRealVoiceStatus("Listening... Tap STOP when done.");
    } catch (err) {
      console.error("Microphone access failed", err);
      setRealVoiceStatus("Microphone access blocked or unsupported.");
    }
  };

  const stopRealVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingRealVoice(false);
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // -----------------------------------------------------
  // DRIVER AI COPILOT INTERACTION
  // -----------------------------------------------------
  const sendCopilotMessage = async (userMsg: string, extraContext?: DriverIssueQuestionnaireContext) => {
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSendingToCopilot(true);

    if (!isOnline) {
      // Offline RAG System Fallback
      setTimeout(() => {
        const words = userMsg.toLowerCase().split(/\s+/);
        let matchedFault = null;
        let maxMatches = 0;

        for (const fault of faultKnowledgeBase) {
          const keywords = [fault.symptom_hindi, fault.symptom_english].flatMap(s => s.toLowerCase().split(/\s+/));
          let matches = 0;
          for (const w of words) {
            try {
              if (w.length > 3 && keywords.some(k => new RegExp('\\b' + w + '\\b', 'i').test(k))) matches++;
            } catch(e) {
              if (w.length > 3 && keywords.some(k => k.includes(w))) matches++;
            }
          }
          if (matches > maxMatches) {
            maxMatches = matches;
            matchedFault = fault;
          }
        }

        if (matchedFault) {
          const reply = `[ऑफ़लाइन मोड] आपके लक्षणों के आधार पर यह ${matchedFault.diagnosis} हो सकता है। सुझाव: ${matchedFault.recommended_action_hindi}`;
          setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } else {
          setChatMessages(prev => [...prev, { role: 'assistant', content: "[ऑफ़लाइन मोड] मुझे इस समस्या का सटीक कारण नहीं मिला। कृपया गाड़ी सुरक्षित स्थान पर रोक लें।" }]);
        }
        setIsSendingToCopilot(false);
      }, 800);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const requestBody: Record<string, unknown> = {
        message: userMsg,
        history: chatMessages.slice(-6) // Send last 6 messages for context
      };
      if (extraContext) {
        requestBody.questionnaireContext = extraContext;
      }

      const res = await fetch(`${API_URL}/api/driver-copilot`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.action && data.action.type === 'OPEN_MAPS') {
          setTimeout(() => {
            window.location.assign(data.action.url);
          }, 1500);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Server side issue, please try again." }]);
      }
    } catch (err) {
      console.error("Copilot request failed", err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Maaf kijiyega, net connection slow ya disconnected hai." }]);
    } finally {
      setIsSendingToCopilot(false);
    }
  };

  const inferIssueCategoryFromMessage = (message: string): VehicleIssueCategory | null => {
    const text = message.toLowerCase();
    let bestCategory: VehicleIssueCategory | null = null;
    let bestScore = 0;

    for (const category of VEHICLE_ISSUE_CATEGORIES) {
      if (category === 'Not Sure / Multiple') continue;
      const score = ISSUE_CATEGORY_META[category].keywords.reduce((acc, keyword) => (
        text.includes(keyword.toLowerCase()) ? acc + 1 : acc
      ), 0);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestScore >= 1 ? bestCategory : null;
  };

  const createQuestionDefaults = (category: VehicleIssueCategory): Record<string, QuestionnaireAnswerValue> => {
    const defaults: Record<string, QuestionnaireAnswerValue> = {};
    const questions = category === 'Not Sure / Multiple'
      ? [
          { key: 'uncertainSystems', type: 'multi-select' as const },
          { key: 'genericNoise', type: 'boolean' as const },
          { key: 'genericLeak', type: 'boolean' as const },
          { key: 'genericWarning', type: 'boolean' as const }
        ]
      : QUESTIONNAIRE_QUESTIONS[category];

    for (const question of questions) {
      defaults[question.key] = question.type === 'text'
        ? ''
        : question.type === 'multi-select'
          ? []
          : question.type === 'choice'
            ? ''
            : null;
    }

    return defaults;
  };

  const getCategoryQuestions = (category: VehicleIssueCategory) => {
    if (category === 'Not Sure / Multiple') {
      return [
        { key: 'uncertainSystems', label: 'Which systems seem possibly involved?', type: 'multi-select' as const, options: VEHICLE_ISSUE_CATEGORIES.filter(option => option !== 'Not Sure / Multiple'), required: true },
        { key: 'genericNoise', label: 'Any unusual noise?', type: 'boolean' as const, required: true },
        { key: 'genericLeak', label: 'Any fluid leak or smell?', type: 'boolean' as const },
        { key: 'genericWarning', label: 'Any dashboard warning light?', type: 'boolean' as const }
      ];
    }
    return QUESTIONNAIRE_QUESTIONS[category];
  };

  const normalizeChoice = (value: QuestionnaireAnswerValue) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return '';
  };

  const collectStructuredSymptoms = (category: VehicleIssueCategory, answers: Record<string, QuestionnaireAnswerValue>) => {
    const symptoms: Record<string, boolean | string | string[]> = {};
    for (const [key, value] of Object.entries(answers)) {
      if (value === null || value === '' || (Array.isArray(value) && !value.length)) continue;
      symptoms[key] = value;
    }
    if (category === 'Not Sure / Multiple' && Array.isArray(answers.uncertainSystems)) {
      symptoms.uncertainSystems = answers.uncertainSystems;
    }
    return symptoms;
  };

  const detectRelatedCategories = (primaryCategory: VehicleIssueCategory, answers: Record<string, QuestionnaireAnswerValue>): VehicleIssueCategory[] => {
    const joined = Object.values(answers)
      .flatMap((value) => Array.isArray(value) ? value : [normalizeChoice(value)])
      .join(' ')
      .toLowerCase();
    const scores = new Map<VehicleIssueCategory, number>();

    for (const category of VEHICLE_ISSUE_CATEGORIES) {
      if (category === 'Not Sure / Multiple') continue;
      let score = 0;
      for (const keyword of ISSUE_CATEGORY_META[category].keywords) {
        if (joined.includes(keyword.toLowerCase())) score += 1;
      }
      if (score > 0) scores.set(category, score);
    }

    const related = [...scores.entries()]
      .filter(([category]) => category !== primaryCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category]) => category);

    return related;
  };

  const buildQuestionnaireContext = () => {
    if (!selectedIssueCategory || !pendingCopilotMessage) return null;
    const category = selectedIssueCategory;
    const symptoms = collectStructuredSymptoms(category, questionnaireAnswers);
    const related = category === 'Not Sure / Multiple'
      ? (questionnaireAnswers.uncertainSystems as VehicleIssueCategory[] | undefined)?.filter((item) => item !== 'Not Sure / Multiple') ?? []
      : detectRelatedCategories(category, questionnaireAnswers);

    return {
      primaryCategory: category,
      possibleRelatedCategories: related,
      symptoms,
      frequency: questionnaireFrequency,
      duration: questionnaireDuration,
      userAdditionalNotes: userAdditionalNotes.trim(),
      userDescription: pendingCopilotMessage
    };
  };

  const resetQuestionnaire = () => {
    setIsQuestionnaireOpen(false);
    setQuestionnaireStep(1);
    setSelectedIssueCategory(null);
    setSuggestedIssueCategory(null);
    setRelatedCategories([]);
    setQuestionnaireAnswers({});
    setQuestionnaireFrequency('');
    setQuestionnaireDuration('');
    setUserAdditionalNotes('');
    setQuestionnaireReview(null);
    setQuestionnaireStepError('');
  };

  const handleSkipQuestionnaire = async () => {
    const pendingMessage = pendingCopilotMessage;
    resetQuestionnaire();
    setPendingCopilotMessage(null);

    if (pendingMessage) {
      await sendCopilotMessage(pendingMessage);
    }
  };

  const handleQuestionnaireCategorySelect = (category: VehicleIssueCategory) => {
    setSelectedIssueCategory(category);
    setQuestionnaireAnswers(createQuestionDefaults(category));
    setQuestionnaireStepError('');
  };

  const handleQuestionnaireContinue = () => {
    if (!selectedIssueCategory) {
      setQuestionnaireStepError('Please choose a category first.');
      return;
    }
    setQuestionnaireStep(2);
    setQuestionnaireStepError('');
  };

  const isQuestionnaireStepTwoValid = () => {
    if (!selectedIssueCategory) return false;
    const questions = getCategoryQuestions(selectedIssueCategory).filter(question => question.required);
    return questions.every((question) => {
      const value = questionnaireAnswers[question.key];
      if (question.type === 'boolean') return typeof value === 'boolean';
      if (question.type === 'choice') return typeof value === 'string' && value.trim().length > 0;
      if (question.type === 'multi-select') return Array.isArray(value) && value.length > 0;
      return typeof value === 'string' && value.trim().length > 0;
    });
  };

  const handleQuestionnaireNext = () => {
    if (!isQuestionnaireStepTwoValid()) {
      setQuestionnaireStepError('Please answer the required checks before continuing.');
      return;
    }
    setQuestionnaireStep(3);
    setQuestionnaireStepError('');
  };

  const handleQuestionnaireReview = () => {
    const context = buildQuestionnaireContext();
    if (!context) {
      setQuestionnaireStepError('Questionnaire data is incomplete.');
      return;
    }

    const related = context.possibleRelatedCategories.length
      ? context.possibleRelatedCategories
      : detectRelatedCategories(context.primaryCategory, questionnaireAnswers);

    setRelatedCategories(related);
    setQuestionnaireReview({ ...context, possibleRelatedCategories: related });
    setQuestionnaireStep(4);
    setQuestionnaireStepError('');
  };

  const handleQuestionnaireComplete = async () => {
    const context = buildQuestionnaireContext();
    if (!context) return;
    const finalContext = {
      ...context,
      possibleRelatedCategories: relatedCategories.length ? relatedCategories : context.possibleRelatedCategories
    };
    setIsQuestionnaireSubmitting(true);
    try {
      await sendCopilotMessage(finalContext.userDescription, finalContext);
    } finally {
      resetQuestionnaire();
      setPendingCopilotMessage(null);
      setIsQuestionnaireSubmitting(false);
    }
  };

  const handleQuestionnaireBack = () => {
    setQuestionnaireStep(prev => (prev === 1 ? 1 : (prev - 1) as QuestionnaireStage));
    setQuestionnaireStepError('');
  };

  const handleQuestionnaireChoice = (key: string, value: QuestionnaireAnswerValue) => {
    setQuestionnaireAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSendToCopilot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingToCopilot || isQuestionnaireOpen) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const guessedCategory = inferIssueCategoryFromMessage(userMsg);
    setPendingCopilotMessage(userMsg);
    setIsQuestionnaireOpen(true);
    setQuestionnaireStep(1);
    setSelectedIssueCategory(guessedCategory ?? null);
    setSuggestedIssueCategory(guessedCategory);
    setRelatedCategories([]);
    setQuestionnaireAnswers(guessedCategory ? createQuestionDefaults(guessedCategory) : createQuestionDefaults('Not Sure / Multiple'));
    setQuestionnaireFrequency('');
    setQuestionnaireDuration('');
    setUserAdditionalNotes('');
    setQuestionnaireReview(null);
    setQuestionnaireStepError('');
  };

  // -----------------------------------------------------
  // AUDIO FAULT DETECTION SYSTEM
  // -----------------------------------------------------
  // Helper to compute RMS and Zero Crossing Rate for similarity comparison
  const getActiveSignal = (data: Float32Array): Float32Array => {
    let maxVal = 0;
    for (let i = 0; i < data.length; i++) {
      const absVal = Math.abs(data[i]);
      if (absVal > maxVal) maxVal = absVal;
    }
    
    const threshold = maxVal * 0.05;
    let startIdx = 0;
    let endIdx = data.length - 1;
    
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) {
        startIdx = i;
        break;
      }
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) {
        endIdx = i;
        break;
      }
    }
    
    if (endIdx > startIdx) {
      return data.subarray(startIdx, endIdx + 1);
    }
    return data;
  };

  const analyzeAudioBuffer = (buffer: AudioBuffer) => {
    const rawData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // We will extract segments of the audio to compute frequency features
    const N = 2048; // Frame size
    const hopSize = 1024; // Hop size (50% overlap)
    
    let totalFrames = 0;
    let sumEnergy = 0;
    let sumCentroid = 0;
    let sumAvgFreq = 0;
    let sumPeakFreq = 0;
    
    const re = new Float32Array(N);
    const im = new Float32Array(N);
    
    // In-place Cooley-Tukey Radix-2 FFT
    const runFFT = (reArr: Float32Array, imArr: Float32Array) => {
      const n = reArr.length;
      let i = 0;
      for (let j = 1; j < n - 1; j++) {
        let bit = n >> 1;
        while (i >= bit) {
          i -= bit;
          bit >>= 1;
        }
        i += bit;
        if (j < i) {
          let temp = reArr[j];
          reArr[j] = reArr[i];
          reArr[i] = temp;
          temp = imArr[j];
          imArr[j] = imArr[i];
          imArr[i] = temp;
        }
      }
      for (let len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len;
        const wlen_re = Math.cos(angle);
        const wlen_im = Math.sin(angle);
        for (let j = 0; j < n; j += len) {
          let w_re = 1;
          let w_im = 0;
          for (let k = 0; k < len / 2; k++) {
            const u_re = reArr[j + k];
            const u_im = imArr[j + k];
            const t_re = reArr[j + k + len / 2] * w_re - imArr[j + k + len / 2] * w_im;
            const t_im = reArr[j + k + len / 2] * w_im + imArr[j + k + len / 2] * w_re;
            reArr[j + k] = u_re + t_re;
            imArr[j + k] = u_im + t_im;
            reArr[j + k + len / 2] = u_re - t_re;
            imArr[j + k + len / 2] = u_im - t_im;
            const next_w_re = w_re * wlen_re - w_im * wlen_im;
            w_im = w_re * wlen_im + w_im * wlen_re;
            w_re = next_w_re;
          }
        }
      }
    };
    
    // We step through rawData
    for (let offset = 0; offset + N <= rawData.length; offset += hopSize) {
      // 1. Copy samples and apply Hann window
      let frameEnergy = 0;
      for (let i = 0; i < N; i++) {
        const val = rawData[offset + i];
        frameEnergy += val * val;
        // Hann window
        const win = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
        re[i] = val * win;
        im[i] = 0;
      }
      frameEnergy = frameEnergy / N;
      
      // 2. Perform FFT
      runFFT(re, im);
      
      // 3. Compute magnitude spectrum for first N/2 bins
      let maxMag = -1;
      let peakBin = 0;
      let magSum = 0;
      let magSqSum = 0;
      let weightedFreqSum = 0;
      let weightedFreqSqSum = 0;
      
      for (let k = 0; k < N / 2; k++) {
        const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        magSum += mag;
        magSqSum += mag * mag;
        
        const freq = (k * sampleRate) / N;
        weightedFreqSum += freq * mag;
        weightedFreqSqSum += freq * mag * mag;
        
        if (mag > maxMag) {
          maxMag = mag;
          peakBin = k;
        }
      }
      
      const frameCentroid = magSum > 0 ? (weightedFreqSum / magSum) : 0;
      const frameAvgFreq = magSqSum > 0 ? (weightedFreqSqSum / magSqSum) : 0;
      const framePeakFreq = (peakBin * sampleRate) / N;
      
      sumEnergy += frameEnergy;
      sumCentroid += frameCentroid;
      sumAvgFreq += frameAvgFreq;
      sumPeakFreq += framePeakFreq;
      totalFrames++;
    }
    
    if (totalFrames === 0) {
      return {
        energy: 0,
        spectralCentroid: 0,
        averageFrequency: 0,
        peakFrequency: 0
      };
    }
    
    return {
      energy: sumEnergy / totalFrames,
      spectralCentroid: sumCentroid / totalFrames,
      averageFrequency: sumAvgFreq / totalFrames,
      peakFrequency: sumPeakFreq / totalFrames
    };
  };

  const analyzeAndCompareAcoustic = async (audioBlob: Blob) => {
    let audioCtx: AudioContext | null = null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx();

      const decodeUrlOrBlob = async (target: string | Blob) => {
        let arrayBuffer: ArrayBuffer;
        if (typeof target === 'string') {
          const res = await fetch(target);
          if (!res.ok) throw new Error(`Failed to load: ${target}`);
          arrayBuffer = await res.arrayBuffer();
        } else {
          arrayBuffer = await target.arrayBuffer();
        }
        return await audioCtx.decodeAudioData(arrayBuffer);
      };

      const [recordedBuffer, goodBuffer, badBuffer] = await Promise.all([
        decodeUrlOrBlob(audioBlob),
        decodeUrlOrBlob('/src/assets/audio/good.mp3'),
        decodeUrlOrBlob('/src/assets/audio/bad.mp3')
      ]);

      const recordedFeatures = analyzeAudioBuffer(recordedBuffer);
      const goodFeatures = analyzeAudioBuffer(goodBuffer);
      const badFeatures = analyzeAudioBuffer(badBuffer);

      // Relative differences between recorded sound and references
      const distToGood = 
        Math.abs(recordedFeatures.energy - goodFeatures.energy) / (goodFeatures.energy || 1) +
        Math.abs(recordedFeatures.spectralCentroid - goodFeatures.spectralCentroid) / (goodFeatures.spectralCentroid || 1) +
        Math.abs(recordedFeatures.averageFrequency - goodFeatures.averageFrequency) / (goodFeatures.averageFrequency || 1) +
        Math.abs(recordedFeatures.peakFrequency - goodFeatures.peakFrequency) / (goodFeatures.peakFrequency || 1);

      const distToBad = 
        Math.abs(recordedFeatures.energy - badFeatures.energy) / (badFeatures.energy || 1) +
        Math.abs(recordedFeatures.spectralCentroid - badFeatures.spectralCentroid) / (badFeatures.spectralCentroid || 1) +
        Math.abs(recordedFeatures.averageFrequency - badFeatures.averageFrequency) / (badFeatures.averageFrequency || 1) +
        Math.abs(recordedFeatures.peakFrequency - badFeatures.peakFrequency) / (badFeatures.peakFrequency || 1);

      const s1 = 1 / (1 + distToGood);
      const s2 = 1 / (1 + distToBad);
      const confidence = (Math.max(s1, s2) / (s1 + s2)) * 100;

      const durationSeconds = ((Date.now() - acousticStartTimeRef.current) / 1000).toFixed(1);
      const dateTime = new Date().toLocaleString();

      let resultText = "";
      let diagnosisResult = "";
      let signalClass: 'normal' | 'knock' | 'squeal' | 'misfire' = 'normal';

      if (distToGood < distToBad) {
        resultText = "✅ Engine is in good condition.\nNo abnormal engine sound detected.";
        diagnosisResult = "Healthy";
        signalClass = "normal";
      } else {
        resultText = "⚠️ Engine is not in good condition.\nPossible abnormal engine sound detected.\nPlease visit the nearest service center.";
        diagnosisResult = "Faulty";
        signalClass = "knock";
      }

      setAcousticClassification(resultText);
      setAudioSignalClass(signalClass);

      setAcousticDataLog(prev => [
        {
          timestamp: dateTime,
          duration: `${durationSeconds}s`,
          result: diagnosisResult,
          confidence: `${confidence.toFixed(1)}%`
        },
        ...prev
      ]);

      await audioCtx.close();

    } catch (err) {
      console.error("Acoustic analysis failed:", err);
      setAcousticClassification("⚠️ Engine is not in good condition.\nPossible abnormal engine sound detected.\nPlease visit the nearest service center.");
      setAudioSignalClass("knock");
      if (audioCtx) {
        try {
          await audioCtx.close();
        } catch (e) {}
      }
    }
  };

  const startAcousticCapture = async () => {
    setIsRecordingAcoustic(true);
    setAcousticClassification("Analyzing Engine Frequencies...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      acousticChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      acousticMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          acousticChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(acousticChunksRef.current, { type: 'audio/webm' });
        await analyzeAndCompareAcoustic(audioBlob);
      };

      mediaRecorder.start();
      acousticStartTimeRef.current = Date.now();

      // Setup Web Audio API and canvas waveform analyzer
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Draw real-time canvas visualization
      const canvas = canvasRef.current;
      const canvasCtx = canvas?.getContext('2d');
      
      const drawWaveform = () => {
        if (!analyserRef.current || !canvas || !canvasCtx) return;
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
        
        analyserRef.current.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = 'rgba(23, 23, 23, 0.4)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i];
          canvasCtx.fillStyle = `rgb(${barHeight + 100}, ${barHeight * 0.5 + 50}, 20)`;
          canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth - 1, barHeight / 2);
          x += barWidth;
        }
      };

      drawWaveform();

    } catch (err) {
      console.error("Failed to access audio capture microphone.", err);
      setAcousticClassification("Microphone capture blocked or unavailable.");
      setIsRecordingAcoustic(false);
    }
  };

  const stopAcousticCapture = () => {
    setIsRecordingAcoustic(false);
    if (acousticMediaRecorderRef.current && acousticMediaRecorderRef.current.state !== 'inactive') {
      acousticMediaRecorderRef.current.stop();
      acousticMediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    analyserRef.current = null;
  };

  const exportAcousticCSV = () => {
    if (acousticDataLog.length === 0) {
      alert("No engine audio feature logs captured yet. Press start to capture logs.");
      return;
    }

    const headers = ["Date & Time", "Recording Duration", "Diagnosis Result", "Confidence (%)"];
    const rows = acousticDataLog.map(item => [
      item.timestamp,
      item.duration,
      item.result,
      item.confidence
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vahanai_acoustic_diagnoses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -----------------------------------------------------
  // WEB-CAM DRIVER FATIGUE DETECTION
  // -----------------------------------------------------
  const updateFatigueState = (computedEar: number) => {
    // Check if alert is suppressed
    if (Date.now() < suppressedUntilRef.current) {
      setFatigueScore(0);
      setIsDrowsy(false);
      setIsCritical(false);
      stopAlarmSound();
      return;
    }

    const isClosed = computedEar < 0.25;

    setFatigueScore(prev => {
      let nextScore = prev;
      if (isClosed) {
        nextScore = Math.min(100, prev + 15); // Progressive increase on closed eye
      } else {
        if (!isCriticalRef.current) {
          nextScore = Math.max(0, prev - 8); // Progressive decrease for blinking recovery
        }
      }

      setIsDrowsy(nextScore >= 40);

      if (nextScore >= 80) {
        if (!isCriticalRef.current) {
          setIsCritical(true);
          isCriticalRef.current = true;
          triggerAudioFatigueWarning(computedEar);
          startAlarmSound();
        }
      }

      return nextScore;
    });
  };

  const startFatigueMonitoring = async () => {
    setIsFatigueMonitoring(true);
    avgDarkPixelsRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }

      // Loop canvas reading pixel contrast data to run simulated yet real computation
      fatigueIntervalRef.current = setInterval(() => {
        const video = webcamVideoRef.current;
        const canvas = eyeCanvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (video && canvas && ctx) {
          // Process webcam frame via canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = frame.data;

          // Compute a real mathematical value from the actual video pixels
          // Sum the dark pixels to calculate eye pupil presence (luminance contrast)
          let darkPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luminance < 40) darkPixels++; // Count dark pixels (simulating pupil tracking)
          }

          // Use real-time adaptive baseline calibration to detect eye closing/blinking
          if (avgDarkPixelsRef.current === 0) {
            avgDarkPixelsRef.current = darkPixels || 1;
          } else {
            avgDarkPixelsRef.current = avgDarkPixelsRef.current * 0.98 + darkPixels * 0.02;
          }

          const ratio = darkPixels / avgDarkPixelsRef.current;
          const cappedDev = Math.max(0.4, Math.min(1.2, ratio));
          let computedEar = 0.14 + (cappedDev * 0.16);
          
          if (simulateDrowsyRef.current) {
            computedEar = 0.14 + Math.random() * 0.04; // Forced Drowsiness state (< 0.25)
          }

          setEarValue(parseFloat(computedEar.toFixed(3)));
          
          setEarHistory(prev => {
            const copy = [...prev.slice(1), computedEar];
            return copy;
          });

          updateFatigueState(computedEar);
        }
      }, 300);

    } catch (err) {
      console.error("Webcam capture blocked or unavailable for fatigue tracking.", err);
      // Fallback to purely simulated dynamic timer if camera blocked
      fatigueIntervalRef.current = setInterval(() => {
        let computedEar = 0.28 + Math.random() * 0.05;
        if (simulateDrowsyRef.current) {
          computedEar = 0.13 + Math.random() * 0.04;
        }

        setEarValue(parseFloat(computedEar.toFixed(3)));
        setEarHistory(prev => [...prev.slice(1), computedEar]);

        updateFatigueState(computedEar);
      }, 500);
    }
  };

  const stopFatigueMonitoring = () => {
    setIsFatigueMonitoring(false);
    setIsDrowsy(false);
    setIsCritical(false);
    setFatigueScore(0);
    avgDarkPixelsRef.current = 0;
    stopAlarmSound();
    if (fatigueIntervalRef.current) clearInterval(fatigueIntervalRef.current);
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleCancelAlert = () => {
    setSimulateDrowsy(false);
    setIsCritical(false);
    setIsDrowsy(false);
    setFatigueScore(0);
    stopAlarmSound();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Suppress for 15 seconds
    const duration = 15000;
    suppressedUntilRef.current = Date.now() + duration;
    setCooldownRemaining(15);
  };

  const handleStopMonitorAndCancel = () => {
    setSimulateDrowsy(false);
    setFatigueScore(0);
    stopAlarmSound();
    stopFatigueMonitoring();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Hindi TTS alert via SpeechSynthesis
  const triggerAudioFatigueWarning = (customEar?: number) => {
    if ('speechSynthesis' in window && !window.speechSynthesis.speaking) {
      const text = "सावधान! आप नींद में लग रहे हैं। कृपया तुरंत गाड़ी साइड में लगाएं!";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    // Always log fatigue event to server database
    logFatigueToServer(customEar, "critical");
  };

  const logFatigueToServer = async (customEar?: number, customSeverity?: "caution" | "critical") => {
    try {
      const finalEar = customEar !== undefined ? customEar : earValue;
      const finalSeverity = customSeverity || (simulateDrowsyRef.current ? "critical" : "caution");
      await fetch(`${API_URL}/api/fatigue-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: user.id,
          ear_value: finalEar,
          duration_seconds: 6,
          severity: finalSeverity
        })
      });
    } catch (err) {
      console.error("Failed to log fatigue event to server database", err);
    }
  };

  return (
    <div className={`h-[100dvh] transition-colors duration-500 flex flex-col font-sans max-w-md mx-auto relative sm:border-x shadow-2xl overflow-hidden ${darkMode ? 'dark bg-slate-950 bg-gradient-to-tr from-slate-950 via-slate-900 to-black text-slate-200 border-white/10' : 'bg-slate-50 bg-[#F9FAFB] text-slate-800 border-slate-200'}`}>

      {/* Profile & Settings Drawer */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col overflow-y-auto"
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Your Profile</h2>
              <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              {/* Profile Card */}
              <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                <div className="h-16 w-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white text-2xl font-black border-4 border-white dark:border-slate-900">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{user.name}</h3>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">{user.phone}</p>
                  <div className="inline-block mt-2 px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider rounded">Driver Pro</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">12</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Trips Completed</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/60">
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">{historyReports.length}</div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Faults Reported</p>
                </div>
              </div>

              {/* Settings List */}
              <div className="flex flex-col">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Settings</h4>
                
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors rounded-2xl cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                      {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-[10px] text-slate-500">Toggle app appearance</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors rounded-2xl cursor-pointer" onClick={() => setIsOnline(!isOnline)}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{isOnline ? 'Online Mode' : 'Offline Mode'}</p>
                      <p className="text-[10px] text-slate-500">Force offline testing</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isOnline ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={onLogout}
                className="mt-6 w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 font-black rounded-2xl shadow-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zomato-style Premium Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
            <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Current Route</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            NH-48, Pune Hwy
          </h1>
        </div>

        {/* Network & Sync Badge Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOnline(!isOnline)} 
            className={`flex items-center justify-center h-8 w-8 rounded-full shadow-sm transition-colors ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            }`}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </button>
          
          <button onClick={() => setDarkMode(!darkMode)} className="h-8 w-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm border border-slate-100 dark:border-slate-700">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <div className="h-9 w-9 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-full flex shadow-md items-center justify-center text-white font-bold border-2 border-white dark:border-slate-900 cursor-pointer" onClick={() => setIsProfileOpen(true)}>
            {user.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* Primary Fatigue Critical Full-Screen Warning Flash */}
      <AnimatePresence>
        {isCritical && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-950/95 z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <AlertOctagon className="h-24 w-24 text-red-500 animate-bounce mb-6" />
            <h2 className="text-2xl font-black text-red-400 uppercase tracking-wider">सावधान! नींद आ रही है!</h2>
            <p className="text-base text-slate-900 dark:text-white font-medium mt-2">Drowsiness Detected (EAR: {earValue})</p>
            
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-6 max-w-xs bg-red-900/50 p-4 rounded-lg border border-red-500/30 font-semibold">
              "कृपया तुरंत गाड़ी साइड में लगाएं! ठंडे पानी से मुंह धोएं और ब्रेक लें।"
            </p>

            <div className="flex flex-col gap-3 mt-8 w-full max-w-xs">
              <button 
                onClick={handleCancelAlert}
                className="w-full bg-white text-red-950 font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-neutral-100 transition-colors text-xs uppercase tracking-wider"
              >
                Cancel Alert (15s Pause)
              </button>
              <button 
                onClick={handleStopMonitorAndCancel}
                className="w-full glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-slate-200 dark:bg-slate-700/60 transition-colors text-xs uppercase tracking-wider"
              >
                Stop Web-Cam Monitor
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Scrolling Stage */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        
        {/* Zomato-style Greeting & Vehicle Widget */}
        <div className="px-5 mb-6 mt-2">
          <h2 className="text-[26px] leading-tight font-black text-slate-900 dark:text-white mb-1">Hi, {user.name.split(' ')[0]} 👋</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">Ready for a safe journey today?</p>

          {/* Premium Vehicle Selector Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800/60 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <Truck className="h-6 w-6 text-amber-600 dark:text-amber-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Active Vehicle</p>
                {!registrationMode ? (
                  selectedVehicleId ? (
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {vehicles.find(v => v.id === selectedVehicleId)?.registration_number || "Select your truck"}
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-500">No Truck Selected</div>
                  )
                ) : (
                  <div className="text-sm font-bold text-amber-600 dark:text-amber-500">Registering...</div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setRegistrationMode(!registrationMode)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              {registrationMode ? "Cancel" : "Change"}
            </button>
          </div>

          {/* Emergency SOS Button Card */}
          <div className="bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 dark:border-red-500/10 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <AlertOctagon className="h-5.5 w-5.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-600 dark:text-red-400">Emergency SOS</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">In danger or broke down? Notify Fleet Manager instantly.</p>
              </div>
            </div>
            <button 
              onClick={handleSOS}
              disabled={isSendingSos}
              className={`w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs font-black px-5 py-3 rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${isSendingSos ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>🆘 Emergency SOS</span>
            </button>
          </div>

          {/* SOS Success Message */}
          <AnimatePresence>
            {sosSuccessMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-3 text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mt-2 shadow-sm"
              >
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{sosSuccessMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimalist Registration Form */}
          {registrationMode && (
            <form onSubmit={handleRegisterVehicle} className="mt-4 p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Reg Number</label>
                  <input type="text" placeholder="MH-12-AB-1234" value={newVehicle.registration_number} onChange={(e) => setNewVehicle(prev => ({ ...prev, registration_number: e.target.value }))} className="w-full mt-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white p-3 rounded-2xl border-none focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Model</label>
                  <input type="text" placeholder="e.g. Signa" value={newVehicle.model} onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))} className="w-full mt-1 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold text-slate-900 dark:text-white p-3 rounded-2xl border-none focus:ring-2 focus:ring-amber-500 outline-none transition-all" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all active:scale-95">Register Truck</button>
            </form>
          )}
        </div>

        {/* Tab View Stages */}
        {activeTab === 'diagnose' && (
          <div className="space-y-4">
            
            {/* Predictive AI Health Widget */}
              {!isInspectionDismissed && !isInspectionScheduled && (
              <div className="glass dark:bg-slate-800/50 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Activity className="h-16 w-16" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Predictive Health (BETA)</h3>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Based on 85,400km mileage and recent overheating pattern across 4 Tata Prima trucks in Rajpath Logistics, your <strong className="text-amber-600 dark:text-amber-400">Radiator Coolant Pump</strong> has a 78% probability of failure in the next 450km.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalText = btn.textContent;
                  btn.disabled = true;
                  btn.textContent = "Scheduling...";
                  try {
                    const res = await fetch(`${API_URL}/api/schedule-service`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        org_id: user?.org_id || 'org_rajpath',
                          vehicle_id: vehicles.find(v => v.id === selectedVehicleId)?.registration_number || 'MH-12-YK-3561',
                          driver_id: user?.id || 'u_driver1',
                        reason: 'Predictive AI Recommendation: Radiator Coolant Pump',
                        scheduled_date: new Date(Date.now() + 86400000).toISOString()
                      })
                    });
                    if (res.ok) {
                        setIsInspectionScheduled(true);
                        alert('Inspection scheduled successfully! The fleet manager has been notified.');
                      } else { throw new Error('fail'); }
                  } catch (err) { alert('Error scheduling inspection: ' + (err.message || JSON.stringify(err)));
                    btn.disabled = false;
                    btn.textContent = originalText;
                  }
                }} className="bg-amber-500 text-slate-950 text-[9px] font-bold px-3 py-1.5 rounded-full hover:bg-amber-400 transition-colors disabled:opacity-50">Schedule Inspection</button>
                <button onClick={() => setIsInspectionDismissed(true)} className="glass dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-[9px] font-bold px-3 py-1.5 rounded-full hover:bg-slate-700 transition-colors">Dismiss</button>
                </div>
              </div>
              )}
            
            {isInspectionScheduled && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-500">Inspection Scheduled</h4>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">The fleet manager has been notified and service is logged.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsInspectionScheduled(false)} className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold text-xs px-2">Hide</button>
                </div>
              )}
              
              {/* Onboarding Diagnostic input box */}
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 animate-pulse" /> Diagnose Issue
              </h3>
              

              {/* Unified ChatGPT-style Input Bar */}
              <div className="flex flex-col gap-2 mt-2">
                
                {/* Engine sound pairing selector (Chips) */}
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">इंजन की आवाज़ (Sound):</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {[
                      { key: 'normal', label: 'सामान्य' },
                      { key: 'knock', label: 'खट-खट' },
                      { key: 'squeal', label: 'सीटी' },
                      { key: 'misfire', label: 'झटका' }
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setAudioSignalClass(item.key as any)}
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                          audioSignalClass === item.key
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'glass dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Container */}
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] p-2.5 flex flex-col focus-within:border-amber-500/50 focus-within:shadow-[0_8px_30px_rgba(245,158,11,0.15)] transition-all">
                  
                  {/* Selected Image Preview */}
                  {selectedImage && (
                    <div className="relative w-24 h-24 mb-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-amber-500 text-black text-[8px] font-bold rounded shadow-lg flex items-center gap-1">
                        <Sparkles className="h-2 w-2" /> Vision
                      </div>
                    </div>
                  )}

                  <textarea 
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isDiagnosing && (symptomText.trim() || selectedImage)) {
                          runDiagnosticPipeline();
                        }
                      }
                    }}
                    placeholder={isRecordingRealVoice ? "[RECORDING ACTIVE...] Speak now" : "Type a message or use the mic..."}
                    className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none min-h-[44px] max-h-[120px] px-2 py-2.5 resize-none leading-relaxed"
                    rows={1}
                  />

                  {/* Actions Row */}
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {/* Camera Button */}
                      <label className="p-2 text-slate-400 hover:text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors cursor-pointer">
                        <Camera className="h-5 w-5" />
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
                      
                      {/* Mic Button */}
                      {!isRecordingRealVoice ? (
                        <button 
                          onClick={startRealVoiceRecording}
                          disabled={isRecordingVoice}
                          className="p-2 text-slate-400 hover:text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={stopRealVoiceRecording}
                          className="p-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-full animate-pulse transition-colors"
                        >
                          <Square className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Send / Run Diagnostic Button */}
                    <button
                      onClick={runDiagnosticPipeline}
                      disabled={isDiagnosing || (!symptomText.trim() && !selectedImage)}
                      className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-slate-950 disabled:text-slate-400 rounded-full transition-colors shadow-md disabled:shadow-none flex items-center justify-center"
                    >
                      {isDiagnosing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Structured Diagnosis Display Card — shown immediately after running diagnostic */}
            <AnimatePresence>
              {diagnosisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl"
                >
                  {/* Status header banner */}
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${
                    diagnosisResult.severity === 'stop_immediately' 
                      ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                      : diagnosisResult.severity === 'caution' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    <span className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      {diagnosisResult.synced_at === null 
                        ? "Edge Mode — Basic Offline Diagnosis" 
                        : "Server Mode — Full AI Diagnosis"
                      }
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      diagnosisResult.severity === 'stop_immediately' 
                        ? 'bg-red-500/20 text-red-300' 
                        : diagnosisResult.severity === 'caution' 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {diagnosisResult.severity === 'stop_immediately' ? "Stop Immediately" : diagnosisResult.severity === 'caution' ? "Caution Required" : "Safe to Drive"}
                    </span>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 space-y-4">
                    {/* Hindi Translation Subtitle row */}
                    <div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">English translation</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                        "{diagnosisResult.symptom_text_english}"
                      </p>
                    </div>

                    {diagnosisResult.acoustic_signal_class && diagnosisResult.acoustic_signal_class !== 'normal' && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs font-bold text-red-500 flex items-center gap-2 mt-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>⚠️ ENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.</span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 dark:border-white/10 pt-3">
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Mechanical Diagnosis</p>
                      <p className="text-sm text-amber-400 font-bold leading-relaxed mt-0.5">
                        {diagnosisResult.diagnosis}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-white/10 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Action required</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-0.5">
                          {diagnosisResult.recommended_action}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Estimated Cost Range</p>
                        <p className="text-sm text-slate-900 dark:text-white font-black leading-relaxed mt-0.5">
                          {diagnosisResult.estimated_cost_range}
                        </p>
                        <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1">Indian Spare Parts &amp; Labor Standard</p>
                      </div>
                    </div>

                    {/* Agent reasoning trace logs */}
                    <div className="border-t border-slate-200 dark:border-white/10 pt-2">
                      <button 
                        onClick={() => setShowTrace(!showTrace)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors py-1"
                      >
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                          <Sparkles className="h-3 w-3" /> Show Multi-Agent Engineering Trace
                        </span>
                        {showTrace ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {showTrace && (
                        <div className="glass dark:bg-slate-800/50 rounded-lg p-2.5 mt-2 border border-slate-200 dark:border-slate-700 space-y-2 font-mono text-[9px] text-slate-700 dark:text-slate-300 leading-normal">
                          {(() => {
                            try {
                              const trace = JSON.parse(diagnosisResult.agent_trace_json);
                              return Object.entries(trace).map(([agent, text]: any) => (
                                <div key={agent} className="border-b border-slate-200 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                                  <span className="text-amber-400 font-bold">[{agent}]:</span>{" "}
                                  <span className="text-slate-700 dark:text-slate-300">{text}</span>
                                </div>
                              ));
                            } catch (e) {
                              return <p className="text-red-400">Failed to load tracing logs.</p>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── SEPARATOR: below are support tools ── */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
              <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Support Tools</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
            </div>

            {/* Quick Demo Scenarios */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" /> Common Issues (आम समस्याएं)
              </h4>
              <p className="text-[9px] text-slate-600 dark:text-slate-400">जल्दी से अपनी समस्या चुनें (Select a quick issue):</p>
              <div className="flex overflow-x-auto whitespace-nowrap hide-scrollbar gap-3 pb-4 pt-1 -mx-4 px-4">
                {demoScenarios.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSymptomText(scene.text);
                      setAudioSignalClass(scene.sound);
                      setSpeechStatus(`Loaded: ${scene.title}`);
                    }}
                    className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 hover:border-amber-500 dark:hover:border-amber-500 transition-all flex flex-col items-start gap-1 w-[160px] whitespace-normal text-left active:scale-95"
                  >
                    <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight">{scene.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full mt-0.5">{scene.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* VahanAI Copilot — conversational Q&A, NOT a fault reporter */}
            <div className="glass dark:bg-slate-800/50 border border-amber-500/30 shadow-sm transition-colors p-4 rounded-xl space-y-3">
              <div className="border-b border-slate-200 dark:border-white/10 pb-2 space-y-0.5">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-500" /> VahanAI Copilot — Quick Q&amp;A Chat
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-500 leading-relaxed">
                  💬 <strong className="text-slate-600 dark:text-slate-400">Copilot</strong> = Ask general highway/mechanic questions in Hindi (no fault report saved).<br />
                  🔧 <strong className="text-slate-600 dark:text-slate-400">Symptom Reporter above</strong> = Describe your fault → AI diagnoses &amp; saves a permanent breakdown report to the fleet DB.
                </p>
              </div>
              <div className="glass dark:bg-slate-800/50 rounded-lg p-2.5 max-h-[140px] overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col text-[10px] rounded p-2 ${
                      msg.role === 'user'
                        ? 'bg-slate-200 dark:bg-slate-700/60 text-slate-900 dark:text-white ml-6'
                        : 'bg-amber-950/20 text-slate-800 dark:text-slate-200 border-l-2 border-amber-500 mr-6'
                    }`}
                  >
                    <span className="font-bold text-[8px] uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                      {msg.role === 'user' ? 'Aap' : 'VahanAI Copilot'}
                    </span>
                    <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
                    {(msg as any).action && (msg as any).action.type === 'OPEN_MAPS' && (
                      <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                            <MapPin className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">Tata Motors Service Hub</h4>
                            <p className="text-[9px] text-slate-500 mt-0.5">NH-44 Bypass Road • 2.4 km away</p>
                            <button 
                              onClick={() => window.location.assign((msg as any).action.url)}
                              className="mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-full font-bold text-[9px] flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <Navigation className="h-3 w-3" />
                              Start Navigation
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isSendingToCopilot && (
                  <div className="flex items-center gap-1.5 text-[9px] text-amber-400/80 p-1 font-mono">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Copilot is thinking...</span>
                  </div>
                )}
              </div>
              {isQuestionnaireOpen && (
                <div className="glass dark:bg-slate-800/50 rounded-lg border border-amber-500/40 p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Guided Pre-Diagnostic Intake</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Optional, mechanic-style, and designed to sharpen the model's first guess.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSkipQuestionnaire}
                      className="text-[9px] px-2 py-1 rounded bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                      Skip
                    </button>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${(questionnaireStep / 4) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                    <span>Step {questionnaireStep} of 4</span>
                    <span>Collecting structured symptoms before AI call</span>
                  </div>

                  {questionnaireStep === 1 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        Which part of the vehicle seems to have the issue?
                      </p>
                      {suggestedIssueCategory && (
                        <p className="text-[9px] text-emerald-500">
                          AI hint from your text: <span className="font-bold">{suggestedIssueCategory}</span>
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-1.5">
                        {VEHICLE_ISSUE_CATEGORIES.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleQuestionnaireCategorySelect(category)}
                            className={`rounded border p-2 text-left transition-colors ${
                              selectedIssueCategory === category
                                ? `${ISSUE_CATEGORY_META[category].accent} border-current`
                                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500'
                            }`}
                          >
                            <div className="text-[9px] font-bold leading-tight">{category}</div>
                            <div className="text-[8px] mt-0.5 leading-relaxed opacity-80">{ISSUE_CATEGORY_META[category].hint}</div>
                          </button>
                        ))}
                      </div>
                      {questionnaireStepError && <p className="text-[9px] text-red-400">{questionnaireStepError}</p>}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleQuestionnaireContinue}
                          disabled={!selectedIssueCategory}
                          className="text-[9px] px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold transition-colors"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {questionnaireStep === 2 && selectedIssueCategory && (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          Follow-up checks for {selectedIssueCategory}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">These are the checks a mechanic would usually ask next.</p>
                      </div>

                      {getCategoryQuestions(selectedIssueCategory).map((question) => (
                        <div key={question.key} className="space-y-1.5 rounded border border-slate-200 dark:border-slate-700/60 p-2">
                          <p className="text-[9px] text-slate-600 dark:text-slate-400">
                            {question.label} {question.required && <span className="text-red-500">*</span>}
                          </p>

                          {question.type === 'boolean' && (
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuestionnaireChoice(question.key, true)}
                                className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                  questionnaireAnswers[question.key] === true
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuestionnaireChoice(question.key, false)}
                                className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                  questionnaireAnswers[question.key] === false
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                No
                              </button>
                            </div>
                          )}

                          {question.type === 'choice' && question.options && (
                            <div className="flex flex-wrap gap-1.5">
                              {question.options.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleQuestionnaireChoice(question.key, option)}
                                  className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                    questionnaireAnswers[question.key] === option
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                      : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}

                          {question.type === 'multi-select' && question.options && (
                            <div className="grid grid-cols-2 gap-1.5">
                              {question.options.map((option) => {
                                const current = Array.isArray(questionnaireAnswers[question.key]) ? questionnaireAnswers[question.key] as string[] : [];
                                const active = current.includes(option);
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                      setQuestionnaireAnswers(prev => {
                                        const existing = Array.isArray(prev[question.key]) ? prev[question.key] as string[] : [];
                                        const next = existing.includes(option)
                                          ? existing.filter(item => item !== option)
                                          : [...existing, option];
                                        return { ...prev, [question.key]: next };
                                      });
                                    }}
                                    className={`text-[9px] px-2 py-1 rounded border text-left transition-colors ${
                                      active
                                        ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {question.type === 'text' && (
                            <input
                              type="text"
                              value={typeof questionnaireAnswers[question.key] === 'string' ? questionnaireAnswers[question.key] as string : ''}
                              onChange={(event) => handleQuestionnaireChoice(question.key, event.target.value)}
                              placeholder={question.placeholder || 'Type short answer...'}
                              className="w-full text-[10px] px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                            />
                          )}
                        </div>
                      ))}

                      {questionnaireStepError && <p className="text-[9px] text-red-400">{questionnaireStepError}</p>}

                      <div className="flex justify-between gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleQuestionnaireBack}
                          className="text-[9px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleQuestionnaireNext}
                          disabled={!isQuestionnaireStepTwoValid()}
                          className="text-[9px] px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {questionnaireStep === 3 && (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Frequency &amp; duration</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">This helps the model separate a one-off fault from a recurring pattern.</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] text-slate-600 dark:text-slate-400">How often does this happen?</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {FREQUENCY_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setQuestionnaireFrequency(option);
                                setQuestionnaireStepError('');
                              }}
                              className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                questionnaireFrequency === option
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] text-slate-600 dark:text-slate-400">How long has this been happening?</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {DURATION_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setQuestionnaireDuration(option);
                                setQuestionnaireStepError('');
                              }}
                              className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                                questionnaireDuration === option
                                  ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {(questionnaireFrequency || questionnaireDuration) && (
                          <p className="text-[8px] text-emerald-500">
                            Selected: {questionnaireFrequency || '—'} / {questionnaireDuration || '—'}
                          </p>
                        )}
                      </div>

                      {questionnaireStepError && <p className="text-[9px] text-red-400">{questionnaireStepError}</p>}

                      <div className="flex justify-between gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleQuestionnaireBack}
                          className="text-[9px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleQuestionnaireReview}
                          className="text-[9px] px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  )}

                  {questionnaireStep === 4 && questionnaireReview && (
                    <div className="space-y-2.5">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Review &amp; extra notes</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">Check the structured intake before sending it to the AI model.</p>
                      </div>

                      <div className="grid gap-2 text-[9px]">
                        <div className="rounded border border-slate-200 dark:border-slate-700/60 p-2">
                          <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[8px]">Primary category</p>
                          <p className="font-bold text-slate-800 dark:text-white">{questionnaireReview.primaryCategory}</p>
                        </div>
                        <div className="rounded border border-slate-200 dark:border-slate-700/60 p-2">
                          <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[8px]">Possible related categories</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(relatedCategories.length ? relatedCategories : questionnaireReview.possibleRelatedCategories).length > 0 ? (
                              (relatedCategories.length ? relatedCategories : questionnaireReview.possibleRelatedCategories).map((category) => (
                                <span key={category} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  {category}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">None flagged</span>
                            )}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 dark:border-slate-700/60 p-2">
                          <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[8px]">Frequency / duration</p>
                          <p className="font-medium text-slate-800 dark:text-white">
                            {questionnaireReview.frequency || '—'} / {questionnaireReview.duration || '—'}
                          </p>
                        </div>
                        <div className="rounded border border-slate-200 dark:border-slate-700/60 p-2">
                          <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[8px]">Original query</p>
                          <p className="text-slate-800 dark:text-white leading-relaxed mt-0.5">{questionnaireReview.userDescription}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[9px] text-slate-600 dark:text-slate-400">Additional notes</p>
                        <textarea
                          value={userAdditionalNotes}
                          onChange={(event) => setUserAdditionalNotes(event.target.value)}
                          placeholder="Add anything else the mechanic should know..."
                          className="w-full min-h-[72px] resize-y text-[10px] px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {questionnaireStepError && <p className="text-[9px] text-red-400">{questionnaireStepError}</p>}

                      <div className="flex justify-between gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleQuestionnaireBack}
                          className="text-[9px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleQuestionnaireComplete()}
                          disabled={isQuestionnaireSubmitting || isSendingToCopilot}
                          className="text-[9px] px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-bold transition-colors"
                        >
                          {isQuestionnaireSubmitting || isSendingToCopilot ? 'Sending...' : 'Send to Copilot'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleSendToCopilot} className="flex gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isOnline ? "पूछें: Temp gauge high ho toh kya karein?" : "ऑफ़लाइन मोड: खराबी खोजें (Search offline)..."}
                  className="flex-1 glass dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSendingToCopilot || !chatInput.trim() || isQuestionnaireOpen}
                  className="bg-amber-500 hover:bg-amber-600 disabled:glass dark:bg-slate-800/50 text-neutral-950 disabled:text-slate-500 dark:text-slate-500 px-3.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

          </div>
        )}

        {activeTab === 'acoustic' && (
          <div className="space-y-4">
            
            {/* Real Audio FFT Visualizer card */}
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-amber-600 dark:text-amber-500" /> इंजन की आवाज़ से जांच (Acoustic Sound Detection)
                </h3>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700/60 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                  आवाज़ विश्लेषक (Audio Analyzer)
                </span>
              </div>

              <div className="glass dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <canvas 
                  ref={canvasRef} 
                  width={340} 
                  height={130} 
                  className="w-full rounded glass dark:bg-slate-800/50"
                />
              </div>

              {/* Status & Output */}
              <div className="glass dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-center">
                <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">इंजन की आवाज़ की पहचान (Engine Sound Status)</p>
                <p className={`text-base font-black uppercase whitespace-pre-line ${
                  audioSignalClass === 'normal' 
                    ? 'text-emerald-400' 
                    : audioSignalClass === 'knock' 
                    ? 'text-red-400 animate-pulse' 
                    : 'text-amber-400 animate-pulse'
                }`}>
                  {acousticClassification}
                </p>
                <p className="text-[9px] text-slate-600 dark:text-slate-400">
                  आवाज़ की फ्रीक्वेंसी का रीयल-टाइम विश्लेषण और वर्गीकरण
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!isRecordingAcoustic ? (
                  <button 
                    onClick={startAcousticCapture}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-xl hover:-translate-y-0.5"
                  >
                    <Play className="h-4 w-4" /> इंजन की आवाज़ रिकॉर्ड करें
                  </button>
                ) : (
                  <button 
                    onClick={stopAcousticCapture}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg animate-pulse"
                  >
                    <Square className="h-4 w-4" /> रिकॉर्डिंग रोकें (Stop)
                  </button>
                )}

                <button 
                  onClick={exportAcousticCSV}
                  disabled={acousticDataLog.length === 0}
                  className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors hover:bg-slate-200 dark:bg-slate-600 disabled:glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors disabled:text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow"
                >
                  <Download className="h-4 w-4" /> डाटा एक्सपोर्ट करें (CSV)
                </button>
              </div>
            </div>

            {/* Validation signal documentation */}
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                Honesty Guardrail: Acoustic Diagnosis
              </h4>
              <p className="text-[11px]">
                *This tool parses actual real-time microphone stream input using the browser's FFT capabilities. To be completely honest, it classifies the sound with a sophisticated rule-based spectral centring script (Normal/Knock/Squeal/Misfire) instead of on-device neural nets. It allows mechanical developers to export the raw signal CSV for downstream deep learning models.*
              </p>
            </div>

          </div>
        )}

        {activeTab === 'fatigue' && (
          <div className="space-y-4">
            
            {/* Webcam aspect tracker box */}
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-amber-600 dark:text-amber-500" /> Driver Fatigue Monitor (EAR)
                </h3>
                {cooldownRemaining > 0 ? (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 animate-pulse">
                    PAUSED ({cooldownRemaining}s)
                  </span>
                ) : (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                    isCritical 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : isDrowsy 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {isCritical ? "CRITICAL SLEEPY" : isDrowsy ? "DROWSY WARNING" : "DRIVER COGNITIVE SAFE"}
                  </span>
                )}
              </div>

              {/* Webcam stream rendering */}
              <div className="flex justify-center gap-3">
                <div className="h-28 w-28 rounded-full border-2 border-slate-200 dark:border-white/10 overflow-hidden glass dark:bg-slate-800/50 relative shrink-0">
                  <video 
                    ref={webcamVideoRef}
                    autoPlay 
                    muted 
                    playsInline
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                  <canvas 
                    ref={eyeCanvasRef}
                    width={112}
                    height={112}
                    className="absolute inset-0 opacity-20 pointer-events-none"
                  />
                  {!isFatigueMonitoring && (
                    <div className="absolute inset-0 flex items-center justify-center glass dark:bg-slate-800/50/80 text-slate-500 dark:text-slate-500 text-[10px] font-semibold">
                      कैमरा बंद है (Closed)
                    </div>
                  )}
                </div>

                {/* EAR History visual timeline scrolling chart */}
                <div className="flex-1 glass dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">आँखों की स्थिति (EAR):</span>
                    <span className={`font-mono font-bold ${earValue < 0.25 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                      {earValue} EAR
                    </span>
                  </div>
                  
                  {/* Small custom graphic timeline */}
                  <div className="h-10 flex items-end gap-[1.5px] pt-2 border-b border-slate-200 dark:border-slate-800">
                    {earHistory.map((val, idx) => (
                      <div 
                        key={idx} 
                        className={`flex-1 rounded-t-sm transition-all ${
                          val < 0.25 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                        style={{ height: `${val * 240}%` }}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between text-[8px] text-slate-500 dark:text-slate-500 mt-1 font-mono">
                    <span>-10s</span>
                    <span>नींद की सीमा (Limit 0.25)</span>
                    <span>अभी (Now)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Progressive Fatigue Meter */}
              {isFatigueMonitoring && (
                <div className="glass dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">थकान का स्तर (Fatigue Score):</span>
                    <span className={`font-mono font-black ${fatigueScore >= 80 ? 'text-red-500 animate-bounce' : fatigueScore >= 40 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-500'}`}>
                      {fatigueScore}%
                    </span>
                  </div>
                  <div className="h-2 w-full glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        fatigueScore >= 80 ? 'bg-red-500 animate-pulse' : fatigueScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${fatigueScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-500 dark:text-slate-500">
                    <span>सामान्य (Normal)</span>
                    <span>चेतावनी (Warning &gt;= 40%)</span>
                    <span>गंभीर अलार्म (Alarm &gt;= 80%)</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                {!isFatigueMonitoring ? (
                  <button 
                    onClick={startFatigueMonitoring}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 rounded-lg text-xs transition-colors shadow-lg"
                  >
                    थकान मॉनिटर चालू करें
                  </button>
                ) : (
                  <button 
                    onClick={stopFatigueMonitoring}
                    className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors hover:bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 py-2 rounded-lg text-xs transition-colors shadow"
                  >
                    कैमरा बंद करें (Stop)
                  </button>
                )}

                <button 
                  onClick={() => setSimulateDrowsy(!simulateDrowsy)}
                  className={`font-bold py-2 rounded-lg text-xs transition-all ${
                    simulateDrowsy 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                      : 'bg-slate-200 dark:bg-slate-700/60 hover:bg-slate-300 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {simulateDrowsy ? "नींद का डेमो चालू है" : "नींद का डेमो देखें"}
                </button>
              </div>
            </div>

            {/* Fatigue details summary */}
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                Integrated Safety Diagnostics
              </h4>
              <p className="text-[11px]">
                *If you simulate drowsiness (EAR drops below 0.25), the application automatically detects active closure. If sustained, a full screen visual siren fires, a high-pitch Hindi warning alert synthesizes via SpeechSynthesis, and safety fatigue entries are synchronized to the Fleet Manager dashboard.*
              </p>
            </div>

          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Symptom &amp; Repair Logs
              </h3>
              <button 
                onClick={syncOfflineReports}
                disabled={isSyncingHistory || !isOnline}
                className="text-[10px] glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors hover:glass dark:bg-slate-800/50 disabled:glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-500 hover:text-amber-400 disabled:text-slate-400 dark:text-slate-600 px-2 py-1 rounded font-bold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingHistory ? 'animate-spin' : ''}`} />
                <span>Force sync local log</span>
              </button>
            </div>

            <div className="space-y-3">
              {historyReports.length === 0 ? (
                <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-6 rounded-xl border border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-500">
                  No previous breakdown logs registered.
                </div>
              ) : (
                historyReports.map((report, idx) => (
                  <div key={idx} className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-md">
                    <div className="px-3 py-2 glass dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px]">
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                      
                      {/* Sync Indicator badge */}
                      <span className={`flex items-center gap-1 font-bold ${
                        report.synced_at !== null 
                          ? 'text-emerald-400' 
                          : 'text-slate-500 dark:text-slate-500'
                      }`}>
                        {report.synced_at !== null ? <Check className="h-3.5 w-3.5" /> : <WifiOff className="h-3 w-3" />}
                        {report.synced_at !== null ? "Synced" : "Offline pending"}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-900 dark:text-white font-semibold flex-1 leading-normal">
                          "{report.symptom_text_hindi}"
                        </p>
                        <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          report.severity === 'stop_immediately' 
                            ? 'bg-red-500/20 text-red-400' 
                            : report.severity === 'caution' 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {report.severity}
                        </span>
                      </div>

                      <div className="glass dark:bg-slate-800/50 p-2.5 rounded border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px] leading-normal">
                        <p className="text-amber-400 font-bold">{report.diagnosis}</p>
                        {report.acoustic_signal_class && report.acoustic_signal_class !== 'normal' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-[10px] font-bold text-red-400 flex items-center gap-1.5 my-1">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <span>ENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.</span>
                          </div>
                        )}
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Action: {report.recommended_action}</p>
                        <p className="text-slate-900 dark:text-white font-black text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                          Est Cost: {report.estimated_cost_range}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {activeTab === 'wellness' && (
          <div className="space-y-4">
            <div className="glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Safety Score</h3>
                  <p className="text-[10px] text-slate-500">Based on Fatigue AI & Telematics</p>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">92</span>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">Total Safe KMS</span>
                  <span className="font-bold text-slate-900 dark:text-white">45,210 km</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">Fatigue Interventions</span>
                  <span className="font-bold text-slate-900 dark:text-white">2 (Followed Protocol)</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-xl text-slate-950 shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-20">
                <Sparkles className="h-32 w-32" />
              </div>
              <h3 className="text-lg font-black mb-1">Rajpath Rewards</h3>
              <div className="text-3xl font-black mb-3">1,450 pts</div>
              <p className="text-[10px] font-bold opacity-80 mb-4 max-w-[200px]">You are 50 points away from a free Hot Meal at NH-44 Dhaba!</p>
              <button className="bg-slate-950 text-amber-500 font-bold text-[10px] px-4 py-2 rounded-full shadow-lg">
                Redeem Rewards
              </button>
            </div>
          </div>
        )}

      </div>

      {/* PWA bottom navbar */}
      <div className="absolute bottom-0 inset-x-0 glass dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-sm transition-colors border-t border-slate-200 dark:border-white/10 grid grid-cols-5 shrink-0 z-10">
        <button 
          onClick={() => setActiveTab('diagnose')}
          className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeTab === 'diagnose' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }`}
        >
          <Mic className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">खराबी जांच</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('acoustic');
            stopFatigueMonitoring();
          }}
          className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeTab === 'acoustic' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }`}
        >
          <Activity className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">इंजन आवाज़</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('fatigue');
            stopAcousticCapture();
            startFatigueMonitoring();
          }}
          className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeTab === 'fatigue' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }`}
        >
          <Eye className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">थकान/नींद</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('history');
            stopAcousticCapture();
            stopFatigueMonitoring();
          }}
          className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeTab === 'history' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">इतिहास</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('wellness');
            stopAcousticCapture();
            stopFatigueMonitoring();
          }}
          className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
            activeTab === 'wellness' ? 'text-amber-600 bg-amber-50 dark:bg-slate-800/80 rounded-xl' : 'text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-600 dark:text-amber-500 transition-colors'
          }`}
        >
          <Sparkles className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold">वेलनेस</span>
        </button>
      </div>

    </div>
  );
}
