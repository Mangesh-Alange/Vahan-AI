import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Truck, Users, AlertTriangle, CheckCircle, RefreshCw, Plus, 
  Trash2, Mail, Link, AlertOctagon, Eye, MapPin, ChevronRight, FileText, Search, 
  ShieldAlert, Settings, Info, Check, Calendar, Sun, Moon
} from 'lucide-react';
import { User, Vehicle, FaultReport, FleetAlert, ServiceCenter, FatigueEvent, SosAlert } from '../types.js';
import { motion, AnimatePresence } from 'motion/react';

interface FleetPortalProps {
  user: User;
  onLogout: () => void;
}

export default function FleetPortal({ user, onLogout }: FleetPortalProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'drivers' | 'reports' | 'safety' | 'workshops'>('overview');
  
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Sync dark mode class with HTML tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [reports, setReports] = useState<FaultReport[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [workshops, setWorkshops] = useState<ServiceCenter[]>([]);
  const [scheduledServices, setScheduledServices] = useState<any[]>([]);
  const [safetyLogs, setSafetyLogs] = useState<FatigueEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active critical fatigue alerts being shown as overlay to fleet manager
  const [activeFatigueAlerts, setActiveFatigueAlerts] = useState<FatigueEvent[]>([]);
  // Store processed fatigue alert IDs so we don't trigger alerts multiple times
  const [processedFatigueAlertIds, setProcessedFatigueAlertIds] = useState<Set<string>>(new Set());

  // SOS Alert States
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [activeSosAlert, setActiveSosAlert] = useState<SosAlert | null>(null);
  const [processedSosAlertIds, setProcessedSosAlertIds] = useState<Set<string>>(new Set());

  // Refs for SOS siren alarm audio
  const sosAlarmContextRef = React.useRef<AudioContext | null>(null);
  const sosAlarmIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startSosAlarm = () => {
    if (sosAlarmIntervalRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      sosAlarmContextRef.current = ctx;

      let toggle = false;
      sosAlarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(toggle ? 700 : 1000, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        toggle = !toggle;
      }, 450);
    } catch (e) {
      console.error("Failed to play SOS siren", e);
    }
  };

  const stopSosAlarm = () => {
    if (sosAlarmIntervalRef.current) {
      clearInterval(sosAlarmIntervalRef.current);
      sosAlarmIntervalRef.current = null;
    }
    if (sosAlarmContextRef.current) {
      try {
        sosAlarmContextRef.current.close();
      } catch (e) {}
      sosAlarmContextRef.current = null;
    }
  };

  // Refs to manage the live portal siren audio and recurring loop
  const portalAlarmContextRef = React.useRef<AudioContext | null>(null);
  const portalAlarmIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startPortalSiren = () => {
    if (portalAlarmIntervalRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      portalAlarmContextRef.current = ctx;

      let toggle = false;
      portalAlarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(toggle ? 650 : 950, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        toggle = !toggle;
      }, 400);
    } catch (e) {
      console.error("Failed to play portal siren", e);
    }
  };

  const stopPortalSiren = () => {
    if (portalAlarmIntervalRef.current) {
      clearInterval(portalAlarmIntervalRef.current);
      portalAlarmIntervalRef.current = null;
    }
    if (portalAlarmContextRef.current) {
      try {
        portalAlarmContextRef.current.close();
      } catch (e) {}
      portalAlarmContextRef.current = null;
    }
  };

  const loadSafetyDataOnly = async () => {
    if (!user.org_id) return;
    try {
      const res = await fetch(`/api/fatigue-events?org_id=${user.org_id}`),
        fetch(`/api/scheduled-services?org_id=${user.org_id}`);
      const data = await res.json();
      if (data.events) {
        setSafetyLogs(data.events);

        // Check for any NEW CRITICAL fatigue events (within last 30 seconds) that we haven't processed yet
        const nowMs = Date.now();
        const thirtySecondsAgo = nowMs - 30 * 1000;

        const newCriticalAlerts = data.events.filter((event: FatigueEvent) => {
          const isCriticalAlert = event.severity === 'critical';
          const eventTime = new Date(event.timestamp).getTime();
          const isRecent = eventTime > thirtySecondsAgo;
          const isNew = !processedFatigueAlertIds.has(event.id);
          return isCriticalAlert && isRecent && isNew;
        });

        if (newCriticalAlerts.length > 0) {
          // Play Siren
          startPortalSiren();

          // Add to active modal overlays
          setActiveFatigueAlerts(prev => {
            const merged = [...prev];
            newCriticalAlerts.forEach((ev: FatigueEvent) => {
              if (!merged.some(m => m.id === ev.id)) {
                merged.push(ev);
              }
            });
            return merged;
          });

          // Mark as processed
          setProcessedFatigueAlertIds(prev => {
            const next = new Set(prev);
            newCriticalAlerts.forEach((ev: FatigueEvent) => next.add(ev.id));
            return next;
          });
        }
      }
    } catch (e) {
      console.error("Failed to poll safety log data.", e);
    }
  };

  // Poll safety logs every 4 seconds to check for live driver drowsiness signals
  useEffect(() => {
    const timer = setInterval(() => {
      loadSafetyDataOnly();
    }, 4000);
    return () => {
      clearInterval(timer);
      stopPortalSiren();
    };
  }, [user, processedFatigueAlertIds]);

  const loadSosAlertsOnly = async () => {
    if (!user.org_id) return;
    try {
      const res = await fetch(`/api/sos-alerts?org_id=${user.org_id}`);
      const data = await res.json();
      if (data.alerts) {
        setSosAlerts(data.alerts);

        // Find if there is any active SOS (status === "SOS")
        const active = data.alerts.find((a: SosAlert) => a.status === 'SOS');
        if (active) {
          setActiveSosAlert(active);
          startSosAlarm();

          // Fire browser notification if not processed yet
          if (!processedSosAlertIds.has(active.id)) {
            if (Notification.permission === 'granted') {
              new Notification("🚨 EMERGENCY SOS ALERT!", {
                body: `Driver ${active.driver_name} in truck ${active.truck_number} needs urgent help!`,
                icon: '/favicon.ico'
              });
            }
            setProcessedSosAlertIds(prev => new Set([...prev, active.id]));
          }
        } else {
          setActiveSosAlert(null);
          stopSosAlarm();
        }
      }
    } catch (e) {
      console.error("Failed to poll SOS alerts.", e);
    }
  };

  const handleResolveSos = async (alertId: string) => {
    try {
      const res = await fetch(`/api/sos-alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        setActiveSosAlert(null);
        stopSosAlarm();
        setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: "RESOLVED" } : a));
      } else {
        alert("Failed to resolve SOS alert.");
      }
    } catch (err) {
      console.error("Error resolving SOS", err);
      alert("Error resolving SOS alert due to connection issue.");
    }
  };

  // Request browser notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Poll SOS alerts every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadSosAlertsOnly();
    }, 3000);
    return () => {
      clearInterval(timer);
      stopSosAlarm();
    };
  }, [user, processedSosAlertIds]);

  // Filters & Selected Items
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [vehicleSearch, setVehicleSearch] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<FaultReport | null>(null);

  // Modals / Form State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  
  const [newVehicle, setNewVehicle] = useState({
    registration_number: '',
    make: 'Tata' as 'Tata' | 'Ashok Leyland' | 'Mahindra',
    model: '',
    year: 2024,
    mileage: 60000,
    assigned_driver_id: ''
  });

  // -----------------------------------------------------
  // DATA LOAD ON BOOT
  // -----------------------------------------------------
  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user.org_id) return;
    setIsRefreshing(true);
    try {
      const [vRes, dRes, rRes, aRes, wRes, sRes, sosRes] = await Promise.all([
        fetch(`/api/vehicles?org_id=${user.org_id}`),
        fetch(`/api/drivers?org_id=${user.org_id}`),
        fetch(`/api/fault-reports?org_id=${user.org_id}`),
        fetch(`/api/fleet-alerts?org_id=${user.org_id}`),
        fetch('/api/service-centers'),
        fetch(`/api/fatigue-events?org_id=${user.org_id}`),
        fetch(`/api/sos-alerts?org_id=${user.org_id}`)
      ]);

      const [vData, dData, rData, aData, wData, sData, sosData] = await Promise.all([
        vRes.json(), dRes.json(), rRes.json(), aRes.json(), wRes.json(), sRes.json(), sosRes.json()
      ]);

      if (vData.vehicles) setVehicles(vData.vehicles);
      if (dData.drivers) setDrivers(dData.drivers);
      if (rData.reports) setReports(rData.reports);
      if (aData.alerts) setAlerts(aData.alerts);
      if (wData.centers) setWorkshops(wData.centers);
      if (servData && servData.services) setScheduledServices(servData.services);
      if (sData.events) {
        setSafetyLogs(sData.events);
        // Initialize processed set with existing IDs so only NEW ones trigger the alarm!
        setProcessedFatigueAlertIds(new Set(sData.events.map((e: FatigueEvent) => e.id)));
      }
      if (sosData.alerts) {
        setSosAlerts(sosData.alerts);
        const active = sosData.alerts.find((a: SosAlert) => a.status === 'SOS');
        if (active) {
          setActiveSosAlert(active);
          startSosAlarm();
          setProcessedSosAlertIds(new Set(sosData.alerts.map((a: SosAlert) => a.id)));
        }
      }

    } catch (err) {
      console.error("Failed to fetch fleet dashboard metrics.", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // -----------------------------------------------------
  // VEHICLE CRUD OPERATIONS
  // -----------------------------------------------------
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.registration_number || !newVehicle.model) return;

    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: user.org_id,
          registration_number: newVehicle.registration_number.toUpperCase(),
          make: newVehicle.make,
          model: newVehicle.model,
          year: newVehicle.year,
          assigned_driver_id: newVehicle.assigned_driver_id || null,
          mileage: newVehicle.mileage,
          last_service_date: new Date().toISOString().split('T')[0]
        })
      });
      const data = await res.json();
      if (data.vehicle) {
        setVehicles(prev => [...prev, data.vehicle]);
        setShowAddVehicleModal(false);
        // Reset form
        setNewVehicle({
          registration_number: '',
          make: 'Tata',
          model: '',
          year: 2024,
          mileage: 60000,
          assigned_driver_id: ''
        });
        alert("Vehicle added successfully!");
      }
    } catch (err) {
      console.error("Error adding vehicle", err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this vehicle from your fleet? This is irreversible.")) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVehicles(prev => prev.filter(v => v.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete vehicle", err);
    }
  };

  const handleUpdateVehicleDriver = async (vehicleId: string, driverId: string) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_driver_id: driverId || null })
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(prev => prev.map(v => v.id === vehicleId ? data.vehicle : v));
        alert("Driver assignment updated!");
      }
    } catch (err) {
      console.error("Error assigning driver", err);
    }
  };

  // -----------------------------------------------------
  // DRIVER INVITE GENERATION
  // -----------------------------------------------------
  const generateInviteCode = () => {
    // Dynamically generate code matching fleet owner's organization, with legacy fallbacks for seed orgs
    const prefix = (user.name || "VAHN").substring(0, 4).toUpperCase();
    if (user.org_id === 'org_rajpath') {
      setInviteCode('RAJP-INV-1234');
    } else if (user.org_id === 'org_kedar') {
      setInviteCode('KEDA-INV-5678');
    } else {
      // Stripping org_ prefix if present to keep it slick, or keeping it for direct parsing
      const cleanOrgId = user.org_id ? user.org_id.replace('org_', '') : 'dynamic';
      setInviteCode(`${prefix}-INV-${cleanOrgId}`);
    }
    setShowInviteModal(true);
  };

  // -----------------------------------------------------
  // PATTERN ALERT RESOLUTION
  // -----------------------------------------------------
  const handleResolveAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/fleet-alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      }
    } catch (err) {
      console.error("Error resolving alert", err);
    }
  };

  // -----------------------------------------------------
  // ANALYTICS CALCULATIONS & CHARTS
  // -----------------------------------------------------
  const getSeverityBreakdown = () => {
    const counts = { stop_immediately: 0, caution: 0, drive: 0 };
    reports.forEach(r => {
      if (r.severity === 'stop_immediately') counts.stop_immediately++;
      else if (r.severity === 'caution') counts.caution++;
      else if (r.severity === 'drive') counts.drive++;
    });
    return [
      { name: 'Critical Stop', value: counts.stop_immediately, color: '#ef4444' },
      { name: 'Caution Advised', value: counts.caution, color: '#f59e0b' },
      { name: 'Safe to Drive', value: counts.drive, color: '#10b981' }
    ];
  };

  const getMakeBreakdown = () => {
    const counts: { [key: string]: number } = { Tata: 0, 'Ashok Leyland': 0, Mahindra: 0, Other: 0 };
    vehicles.forEach(v => {
      if (counts[v.make] !== undefined) counts[v.make]++;
      else counts.Other++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getFaultTrends = () => {
    // Generate simple counts for last 5 dates
    const dateCounts: { [key: string]: { stop: number, caution: number, drive: number } } = {};
    
    // Default values to populate chart if empty
    const last5Days = Array(5).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last5Days.forEach(day => {
      dateCounts[day] = { stop: 0, caution: 0, drive: 0 };
    });

    reports.forEach(r => {
      const day = r.timestamp.split('T')[0];
      if (dateCounts[day]) {
        if (r.severity === 'stop_immediately') dateCounts[day].stop++;
        else if (r.severity === 'caution') dateCounts[day].caution++;
        else dateCounts[day].drive++;
      }
    });

    return Object.entries(dateCounts).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Critical: val.stop,
      Caution: val.caution,
      Routine: val.drive
    }));
  };

  // Notification badges
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;
  const criticalReportsCount = reports.filter(r => r.severity === 'stop_immediately').length;

  // Filter reports
  const filteredReports = reports.filter(r => {
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
    const matchesSearch = !vehicleSearch || (r.vehicle_reg && r.vehicle_reg.toLowerCase().includes(vehicleSearch.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "Unassigned";
    const d = drivers.find(item => item.id === driverId);
    return d ? d.name : "Unassigned";
  };

  return (
    <div className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-800/80 bg-gradient-to-tr from-slate-100 via-slate-50 to-slate-200 dark:bg-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black text-slate-800 dark:text-slate-200 dark:text-slate-100 flex flex-col font-sans relative">
      
      {/* Real-time Emergency Fatigue Alert Overlay Panel */}
      <AnimatePresence>
        {activeFatigueAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-3xl mx-auto bg-red-600 text-white rounded-2xl shadow-2xl p-6 border-4 border-red-800 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="p-3 bg-red-800 rounded-full text-white shrink-0 animate-bounce">
                <AlertOctagon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-wider uppercase flex items-center gap-2 justify-center sm:justify-start">
                  ⚠️ EMERGENCY: Driver Drowsiness Alert!
                </h3>
                <p className="text-sm font-semibold mt-1">
                  Driver <span className="underline font-bold text-yellow-300">{activeFatigueAlerts[0].driver_name || "Unknown Driver"}</span> is showing CRITICAL fatigue/drowsiness in vehicle <span className="font-mono bg-red-800 px-1.5 py-0.5 rounded text-xs text-yellow-300">{activeFatigueAlerts[0].vehicle_reg || "MH-12"}</span> (EAR: {activeFatigueAlerts[0].ear_value}).
                </p>
                <p className="text-xs text-red-100 mt-1">
                  Logged at: {new Date(activeFatigueAlerts[0].timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
              <button 
                onClick={() => {
                  stopPortalSiren();
                  setActiveFatigueAlerts([]);
                }}
                className="bg-white hover:bg-slate-100 dark:bg-slate-700/60 text-red-700 font-black px-4 py-2 rounded-xl text-xs uppercase shadow transition-colors w-full text-center"
              >
                Acknowledge &amp; Mute
              </button>
              <a 
                href={`tel:${drivers.find(d => d.id === activeFatigueAlerts[0].driver_id)?.phone || '9876543210'}`}
                className="bg-red-800 hover:bg-red-900 text-white border border-red-500 font-bold px-4 py-2 rounded-xl text-xs uppercase shadow transition-colors text-center w-full flex items-center justify-center gap-1"
              >
                📞 Call Driver
              </a>
              <a 
                href={`https://wa.me/91${drivers.find(d => d.id === activeFatigueAlerts[0].driver_id)?.phone || '9876543210'}?text=${encodeURIComponent(`सावधान! वाहन चालक भाई, आप नींद में लग रहे हैं। तुरंत गाड़ी साइड में लगाकर विश्राम करें।`)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase shadow transition-colors text-center w-full flex items-center justify-center gap-1"
              >
                💬 WhatsApp Warning
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Emergency SOS Alert Overlay Panel */}
      <AnimatePresence>
        {activeSosAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#D32F2F] text-white flex flex-col items-center justify-center p-6 text-center animate-pulse"
            style={{ animationDuration: '3s' }}
          >
            <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-ping" style={{ animationDuration: '1.5s' }} />

            <div className="max-w-2xl w-full bg-red-950/90 backdrop-blur-md border border-red-500/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center z-10 space-y-6">
              <div className="p-4 bg-white rounded-full text-[#D32F2F] animate-bounce shadow-xl">
                <AlertOctagon className="h-16 w-16" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-black tracking-wider text-yellow-400 uppercase">
                  🚨 YOUR DRIVER NEEDS URGENT HELP!
                </h2>
                <span className="inline-block bg-white text-[#D32F2F] text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-md">
                  ACTIVE EMERGENCY
                </span>
              </div>

              <div className="w-full border-t border-b border-red-500/20 py-4 grid grid-cols-2 gap-4 text-left text-sm">
                <div>
                  <p className="text-[10px] text-red-300 font-bold uppercase">Driver Name</p>
                  <p className="font-extrabold text-lg text-white">{activeSosAlert.driver_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-red-300 font-bold uppercase">Truck Registration</p>
                  <p className="font-mono font-extrabold text-lg text-white">{activeSosAlert.truck_number}</p>
                </div>
                <div>
                  <p className="text-[10px] text-red-300 font-bold uppercase">Current Route</p>
                  <p className="font-extrabold text-white">{activeSosAlert.current_route}</p>
                </div>
                <div>
                  <p className="text-[10px] text-red-300 font-bold uppercase">Time of Alert</p>
                  <p className="font-extrabold text-white">{new Date(activeSosAlert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-red-300 font-bold uppercase">GPS Coordinates</p>
                  <p className="font-mono text-xs font-extrabold text-white">
                    Lat: {activeSosAlert.latitude.toFixed(6)}, Lng: {activeSosAlert.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <a
                  href={`https://www.google.com/maps?q=${activeSosAlert.latitude},${activeSosAlert.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-white hover:bg-slate-100 text-[#D32F2F] font-black py-4 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2 animate-none"
                >
                  <span>🗺 Open in Google Maps</span>
                </a>
                <button
                  onClick={() => handleResolveSos(activeSosAlert.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <span>✅ Mark as Resolved</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Main Navigation Header - Glassy Dark */}
      <header className="bg-slate-950/90 backdrop-blur-xl border-b border-white/10 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-lg shrink-0 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg font-black tracking-wider flex items-center gap-1.5 shadow-md">
            <Truck className="h-6 w-6 text-slate-950" />
            <span className="text-lg">VahanAI</span>
          </div>
          <div className="hidden md:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Fleet Management Portal</span>
            <span className="text-base font-black text-white tracking-tight">
              {/* @ts-ignore */}
              {user.org_name || (user.org_id === 'org_rajpath' ? "Rajpath Roadways Logistics" : "My Fleet Organization")}
            </span>
          </div>
        </div>

        {/* Real-time dashboard badging and user settings */}
        <div className="flex items-center gap-5">
          {/* Theme Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Toggle Light/Dark Mode"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-300" />}
          </button>
          {/* Notification Indicators */}
          <div className="hidden sm:flex gap-3">
            {activeAlertsCount > 0 && (
              <span className="bg-red-500/15 border border-red-500/30 text-red-400 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                {activeAlertsCount} Active Patterns
              </span>
            )}
            {criticalReportsCount > 0 && (
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                {criticalReportsCount} Stop Warnings
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-700 pl-3 sm:pl-5">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-semibold">Logged in as Owner</p>
              <p className="text-sm font-bold text-slate-100">{user.name}</p>
            </div>
            <button 
              onClick={loadAllData} 
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Sync Data"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onLogout}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 glass-dark text-slate-300 border-r border-white/10 p-5 flex flex-col justify-between shrink-0 hidden lg:flex z-10 relative shadow-2xl">
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'overview' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5" /> Fleet Dashboard
              </span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>

            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'vehicles' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Truck className="h-4.5 w-4.5" /> Trucks &amp; Vehicles
              </span>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full group-hover:bg-slate-700">
                {vehicles.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('drivers')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'drivers' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5" /> Driver Roster
              </span>
              <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                {drivers.length}
              </span>
            </button>

            <button 
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'reports' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5" /> Fault Diagnoses
              </span>
              {criticalReportsCount > 0 ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                  {criticalReportsCount} CRIT
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('safety')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'safety' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Eye className="h-4.5 w-4.5" /> Fatigue Safety log
              </span>
              {safetyLogs.length > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {safetyLogs.length} events
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('workshops')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'workshops' ? 'bg-amber-500 text-slate-950 font-black' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4.5 w-4.5" /> Service Centers Map
              </span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </button>
          </nav>

          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 text-[11px] leading-relaxed text-slate-400 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <p className="font-bold text-slate-200">System Status: All Systems Operational</p>
            </div>
            <div className="bg-slate-850 p-2 rounded border border-slate-750 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span>AI Diagnostics Engine</span>
                <span className="text-emerald-400">Online</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span>Fleet Data Sync</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Small screen mobile header switcher tabs */}
        <div className="lg:hidden bg-slate-800 text-white flex overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 border-b border-slate-700">
          {(['overview', 'vehicles', 'drivers', 'reports', 'safety', 'workshops'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-grow min-w-[95px] py-2.5 text-[11px] font-bold text-center border-b-2 uppercase tracking-tight transition-colors ${
                activeTab === tab ? 'border-amber-500 text-amber-500 bg-slate-850' : 'border-transparent text-slate-400'
              }`}
            >
              {tab === 'overview' ? 'Dashboard' : tab === 'safety' ? 'Safety' : tab === 'workshops' ? 'Service Map' : tab === 'reports' ? 'Faults' : tab}
            </button>
          ))}
        </div>

        {/* Main Content scrollable panel */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Active Fleet Pattern Alerts (Cross-vehicle Federated Fault Learning mock-real) */}
          {activeAlertsCount > 0 && activeTab === 'overview' && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" /> Urgent Cross-Vehicle Pattern Alerts
              </h3>
              
              {/* Macro Intelligence Map visualization */}
              <div className="w-full h-64 bg-slate-900 rounded-xl relative overflow-hidden border border-slate-700 shadow-inner mb-4 flex items-center justify-center">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 
                 {/* Fake Map Elements */}
                 <div className="absolute top-10 left-10 text-slate-700 text-[10px] font-mono">NH-44 Corridor</div>
                 <div className="absolute bottom-12 right-20 text-slate-700 text-[10px] font-mono">Pune-Mumbai Expressway</div>
                 
                 <div className="text-center z-10 pointer-events-none">
                   <Map className="h-12 w-12 text-slate-500 mx-auto mb-2 opacity-50" />
                   <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm">Macro-Intelligence Map</h3>
                 </div>
                 {alerts.filter(a => !a.resolved).map((a, i) => {
                    const top = 20 + Math.random() * 60;
                    const left = 20 + Math.random() * 60;
                    return (
                    <div key={i} className="absolute flex flex-col items-center animate-bounce" style={{ top: `${top}%`, left: `${left}%` }}>
                       <div className="h-6 w-6 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500 relative">
                         <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                         <div className="h-2 w-2 rounded-full bg-red-500"></div>
                       </div>
                       <span className="text-[8px] bg-slate-950 text-red-400 mt-1 px-1 rounded shadow border border-red-500/30 font-bold max-w-[100px] truncate">{a.id.includes('sos') ? 'SOS Alert' : 'Federated Fault Hotspot'}</span>
                    </div>
                 )})}
              </div>

              <div className="space-y-2">
                {alerts.filter(a => !a.resolved).map((alert, idx) => (
                  <div key={idx} className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-950">Active Federated Breakdown Pattern Detected</h4>
                        <p className="text-xs text-red-800 leading-relaxed mt-1">{alert.pattern_description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Federated Fault Matching
                          </span>
                          <span className="text-[10px] text-red-600 font-mono">
                            Alert ID: {alert.id} • {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors self-start md:self-center shrink-0"
                    >
                      Acknowledge &amp; Dispatch Fleet Advisory
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Dense Info Numbers grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 sm:p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 sm:gap-4">
                  <div className="bg-amber-500/10 text-amber-600 p-2 sm:p-3 rounded-xl">
                    <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block uppercase leading-tight">Total Trucks</span>
                    <span className="text-lg sm:text-2xl font-black">{vehicles.length} Active</span>
                  </div>
                </div>

                <div className="glass p-4 sm:p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 sm:gap-4">
                  <div className="bg-emerald-500/10 text-emerald-600 p-2 sm:p-3 rounded-xl">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block uppercase leading-tight">Drivers Roster</span>
                    <span className="text-lg sm:text-2xl font-black">{drivers.length} Enlisted</span>
                  </div>
                </div>

                <div className="glass p-4 sm:p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 sm:gap-4">
                  <div className="bg-red-500/10 text-red-600 p-2 sm:p-3 rounded-xl">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block uppercase leading-tight">Active Patterns</span>
                    <span className="text-lg sm:text-2xl font-black text-red-600">{activeAlertsCount} Unresolved</span>
                  </div>
                </div>

                <div className="glass p-4 sm:p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3 sm:gap-4">
                  <div className="bg-indigo-500/10 text-indigo-600 p-2 sm:p-3 rounded-xl">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block uppercase leading-tight">Diagnostic Reports</span>
                    <span className="text-lg sm:text-2xl font-black">{reports.length} Total</span>
                  </div>
                </div>
              </div>

              {/* Grid of charts */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Recharts dynamic line/bar trends */}
                <div className="glass p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 xl:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Breakdown Severity Trends (Last 5 Days)</h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">Real-time DB query</span>
                  </div>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getFaultTrends()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Critical" fill="#ef4444" stackId="a" />
                        <Bar dataKey="Caution" fill="#f59e0b" stackId="a" />
                        <Bar dataKey="Routine" fill="#10b981" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Charts */}
                <div className="glass p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Severity Breakdown</h3>
                  </div>

                  <div className="h-44 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSeverityBreakdown()}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getSeverityBreakdown().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black">{reports.length}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Reports</span>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {getSeverityBreakdown().map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{item.value} reports</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Grid: Recent Faults + Low EAR warnings */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Recent Fault table list */}
                <div className="glass p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent AI Breakdown Alerts</h3>
                    <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-amber-600 hover:underline">View All</button>
                  </div>

                  <div className="space-y-3">
                    {reports.slice(0, 4).map((report, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded font-mono">
                              {report.vehicle_reg || "MH-12"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(report.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">"{report.symptom_text_hindi}"</p>
                          <p className="text-xs text-amber-600 font-bold">{report.diagnosis}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          report.severity === 'stop_immediately' 
                            ? 'bg-red-50 text-red-600 border border-red-200' 
                            : report.severity === 'caution' 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>
                          {report.severity === 'stop_immediately' ? "Stop" : report.severity === 'caution' ? "Caution" : "Drive"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fatigue events tracker */}
                <div className="glass p-5 rounded-3xl border border-white/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Active Fatigue Logs</h3>
                    <button onClick={() => setActiveTab('safety')} className="text-xs font-bold text-amber-600 hover:underline">View All</button>
                  </div>

                  <div className="space-y-3">
                    {safetyLogs.slice(0, 4).map((log, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${log.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            <Eye className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{log.driver_name || "Driver"}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleString()} • {log.vehicle_reg || "MH-12"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            log.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.severity} ({log.ear_value} EAR)
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">{log.duration_seconds}s closure</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enlisted Trucks &amp; Containers</h3>
                  <p className="text-xs text-slate-500">Monitor health status, mileage, and driver assignments across your fleet.</p>
                </div>
                <button
                  onClick={() => setShowAddVehicleModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 transition-all shadow-md self-start sm:self-center shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" /> Add New Vehicle
                </button>
              </div>

              {/* Grid of Vehicles */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vehicles.map((v, idx) => (
                  <div key={idx} className="glass dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-600 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-5 space-y-4 relative overflow-hidden flex flex-col justify-between">
                    
                    {/* Make background logo SVG */}
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none w-32 h-32">
                      {v.make === 'Tata' && (
                        <svg viewBox="0 0 100 100" fill="currentColor" className="text-slate-900 dark:text-white dark:text-white"><path d="M50 10c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm0 15c13.8 0 25 11.2 25 25S63.8 75 50 75 25 63.8 25 50 36.2 25 50 25zm0 10c-8.3 0-15 6.7-15 15s6.7 15 15 15 15-6.7 15-15-6.7-15-15-15zm0 8c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7z"/></svg>
                      )}
                      {v.make === 'Ashok Leyland' && (
                        <svg viewBox="0 0 100 100" fill="currentColor" className="text-slate-900 dark:text-white dark:text-white"><path d="M50 5L15 25v50l35 20 35-20V25L50 5zm0 15l22 13v25L50 71 28 58V33l22-13zm0 10L35 38v15l15 9 15-9V38L50 30z"/></svg>
                      )}
                      {v.make === 'Mahindra' && (
                        <svg viewBox="0 0 100 100" fill="currentColor" className="text-slate-900 dark:text-white dark:text-white"><path d="M20 20h60v20H20V20zm0 40h60v20H20V60zM40 20v60h20V20H40z"/></svg>
                      )}
                      {(!['Tata', 'Ashok Leyland', 'Mahindra'].includes(v.make)) && (
                        <Truck className="w-full h-full text-slate-900 dark:text-white dark:text-white" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight font-mono border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 rounded">
                          {v.registration_number}
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold">{v.make} {v.model}</span>
                      </div>
                      <p className="text-[11px] text-slate-450 font-medium">Model Year: {v.year} • Last Service: {v.last_service_date}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-y border-slate-100 py-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase text-[10px]">Odometer Reading</span>
                        <span className="font-bold text-slate-900 dark:text-white">{(v.mileage || 0).toLocaleString()} KM</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase text-[10px]">Health status</span>
                        {reports.some(r => r.vehicle_id === v.id && r.severity === 'stop_immediately') ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">🔴 Stop Safety Alert</span>
                        ) : reports.some(r => r.vehicle_id === v.id && r.severity === 'caution') ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">🟡 Caution Advisory</span>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">🟢 Normal Idle</span>
                        )}
                      </div>
                    </div>

                    {/* Driver assigner selection */}
                    <div className="space-y-1 text-xs">
                      <label className="text-slate-400 font-semibold block uppercase text-[10px]">Assigned Operator</label>
                      <select
                        value={v.assigned_driver_id || ''}
                        onChange={(e) => handleUpdateVehicleDriver(v.id, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Unassigned (Parked in yard)</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Delete Truck"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DRIVERS ROSTER TAB */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Driver Roster &amp; Operators</h3>
                  <p className="text-xs text-slate-500">Generate fleet invite links and manage driver credentials.</p>
                </div>
                <button
                  onClick={generateInviteCode}
                  className="bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md self-start sm:self-center shrink-0"
                >
                  <Link className="h-4.5 w-4.5 text-amber-500" /> Generate Onboarding Invite Code
                </button>
              </div>

              <div className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Operator name</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Phone number (ID)</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Vehicle Assigned</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Preferred Language</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Enrolled Timestamp</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Cognitive Fatigue Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver, idx) => {
                        const veh = vehicles.find(v => v.assigned_driver_id === driver.id);
                        const isDrowsy = safetyLogs.some(s => s.driver_id === driver.id && s.severity === 'critical');
                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                              <div className="h-7 w-7 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                                {driver.name.charAt(0)}
                              </div>
                              {driver.name}
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-600 whitespace-nowrap">{driver.phone}</td>
                            <td className="p-4 whitespace-nowrap">
                              {veh ? (
                                <span className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 font-bold font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                  {veh.registration_number}
                                </span>
                              ) : (
                                <span className="text-slate-450 italic">Parked / Unassigned</span>
                              )}
                            </td>
                            <td className="p-4 uppercase font-bold text-slate-500 whitespace-nowrap">{driver.preferred_language}</td>
                            <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{new Date(driver.created_at).toLocaleDateString()}</td>
                            <td className="p-4 whitespace-nowrap">
                              {isDrowsy ? (
                                <span className="text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded animate-pulse">
                                  ⚠️ Fatigue Flagged (NH-44)
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                  Safe &amp; Active
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* FAULT DIAGNOSES TAB */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Breakdown Diagnosis Records</h3>
                  <p className="text-xs text-slate-500">Analyze spoken symptoms translated and compiled by the Multi-Agent engine.</p>
                </div>
              </div>

              {/* Filters */}
              <div className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors p-4 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by vehicle registration plate..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 w-full focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-450 uppercase">Severity Filter:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-xs p-2 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  >
                    <option value="all">Show All Severities</option>
                    <option value="stop_immediately">Critical (Stop Immediately)</option>
                    <option value="caution">Caution Advised</option>
                    <option value="drive">Routine (Safe to Drive)</option>
                  </select>
                </div>
              </div>

              {/* Main table of reports */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                
                {/* Reports List table */}
                <div className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden xl:col-span-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Vehicle</th>
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Operator</th>
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Hindi Symptom</th>
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Severity</th>
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Diagnosis Overview</th>
                          <th className="p-4 border-b border-slate-800 whitespace-nowrap">Diagnostics Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReports.map((r, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => setSelectedReport(r)}
                            className={`hover:bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 transition-colors cursor-pointer ${
                              selectedReport?.id === r.id ? 'bg-amber-500/10' : ''
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-slate-950 whitespace-nowrap">{r.vehicle_reg || "MH-12"}</td>
                            <td className="p-4 font-bold text-slate-700 whitespace-nowrap">{r.driver_name || "Driver"}</td>
                            <td className="p-4 italic text-slate-600 line-clamp-1 max-w-[150px] whitespace-nowrap">"{r.symptom_text_hindi}"</td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                r.severity === 'stop_immediately' 
                                  ? 'bg-red-50 text-red-600 border border-red-200' 
                                  : r.severity === 'caution' 
                                  ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}>
                                {r.severity === 'stop_immediately' ? "Stop" : r.severity === 'caution' ? "Caution" : "Drive"}
                              </span>
                            </td>
                            <td className="p-4 text-slate-800 dark:text-slate-200 font-semibold">{r.diagnosis}</td>
                            <td className="p-4 whitespace-nowrap">
                              {r.synced_at === null ? (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700/60 text-slate-500 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded font-bold">
                                  Local Heuristic
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">
                                  Cloud LLM RAG
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Report Detail trace side-panel */}
                <div className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm p-5 space-y-4">
                  {selectedReport ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-150 pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">Diagnosis Detail</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedReport.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-450 mt-1">Vehicle Plate: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedReport.vehicle_reg}</span></p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Hindi Complaint Speech Input</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 italic">
                          "{selectedReport.symptom_text_hindi}"
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400">English Translation Subtitle</span>
                        <p className="text-xs text-slate-700 leading-normal font-medium">
                          "{selectedReport.symptom_text_english}"
                        </p>
                      </div>

                      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3.5 shadow">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">Engine Diagnosis theory</span>
                          <p className="text-sm font-bold text-white mt-0.5 leading-relaxed">{selectedReport.diagnosis}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-xs leading-normal">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">Roadside Action</span>
                            <p className="text-neutral-300 font-medium mt-0.5">{selectedReport.recommended_action}</p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">Estimate Cost</span>
                            <p className="text-white font-black text-sm mt-0.5">{selectedReport.estimated_cost_range}</p>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Trace log */}
                      <div className="space-y-2 pt-2 border-t border-slate-150">
                        <h5 className="text-[10px] font-black uppercase text-slate-450 flex items-center gap-1">
                          <Plus className="h-3.5 w-3.5 text-amber-500" /> Multi-Agent reasoning logs
                        </h5>
                        <div className="bg-slate-950 text-slate-300 rounded-lg p-3 space-y-2.5 font-mono text-[10px] max-h-60 overflow-y-auto leading-normal">
                          {(() => {
                            try {
                              const trace = JSON.parse(selectedReport.agent_trace_json);
                              return Object.entries(trace).map(([agent, text]: any) => (
                                <div key={agent} className="border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                                  <p className="font-bold text-amber-400">[{agent}]:</p>
                                  <p className="text-slate-300 mt-0.5">{text}</p>
                                </div>
                              ));
                            } catch (err) {
                              return <p className="text-red-400">Tracing logs empty or offline generated.</p>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <Info className="h-8 w-8 text-slate-300" />
                      <p className="font-bold">No Diagnosis Selected</p>
                      <p className="text-[10px]">Click on any breakdown row in the table to display full multi-agent engineering traces.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* SAFETY TAB */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Driver Cognitive Safety Logs</h3>
                <p className="text-xs text-slate-500">Review real-time dynamic EAR fatigue warnings logged during over-the-road transit.</p>
              </div>

              <div className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Timestamp</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Operator</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Vehicle</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Eye Aspect Ratio (EAR)</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Sustained Duration</th>
                        <th className="p-4 border-b border-slate-800 whitespace-nowrap">Safety Triage Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safetyLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-slate-400 italic">No fatigue alarm logs registered in the database yet.</td>
                        </tr>
                      ) : (
                        safetyLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:bg-slate-800/80 border-b border-slate-150 transition-colors">
                            <td className="p-4 text-slate-500 font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-4 font-bold text-slate-950 whitespace-nowrap">{log.driver_name || "Driver"}</td>
                            <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">{log.vehicle_reg || "MH-12"}</td>
                            <td className="p-4 font-mono font-bold text-red-600 whitespace-nowrap">{log.ear_value} EAR</td>
                            <td className="p-4 text-slate-600 font-semibold whitespace-nowrap">{log.duration_seconds} seconds</td>
                            <td className="p-4 whitespace-nowrap">
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                log.severity === 'critical' ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {log.severity} Alert
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* WORKSHOPS TAB */}
          {activeTab === 'workshops' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seeded Roadside Support Network</h3>
                <p className="text-xs text-slate-500">Provide direct suggestions to operators using the 15 pre-seeded heavy-vehicle service hubs in India.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {workshops.map((shop, idx) => (
                  <div 
                    key={idx} 
                    className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm p-5 space-y-3 flex flex-col justify-between cursor-pointer"
                    onClick={() => {
                      const service = {
                        address: `${shop.name} – ${shop.location}`
                      };
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.address)}`,
                        "_blank"
                      );
                    }}
                  >
                    <div className="space-y-2">
                      <div className="bg-amber-500/10 text-amber-600 p-2.5 rounded-xl self-start w-fit">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{shop.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 leading-normal">
                          {shop.location}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">OEM Brands Supported</span>
                      <div className="flex flex-wrap gap-1">
                        {shop.vehicle_makes_supported.map((make, mIdx) => (
                          <span key={mIdx} className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700/60 text-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            {make}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* -----------------------------------------------------
          MODALS & FORM DRAWER OVERLAYS
          ----------------------------------------------------- */}
      {/* 1. Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Truck to Fleet</h3>
              <button onClick={() => setShowAddVehicleModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Registration plate number</label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-QW-5678"
                  value={newVehicle.registration_number}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, registration_number: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Vehicle OEM Make</label>
                  <select
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, make: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="Tata">Tata</option>
                    <option value="Ashok Leyland">Ashok Leyland</option>
                    <option value="Mahindra">Mahindra</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Signa 4825"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Model Year</label>
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Odometer Reading (KM)</label>
                  <input
                    type="number"
                    value={newVehicle.mileage}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-450 block mb-1">Assign Operator</label>
                <select
                  value={newVehicle.assigned_driver_id}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, assigned_driver_id: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                >
                  <option value="">Leave Unassigned</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-colors"
                >
                  Confirm Registration
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Invite Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass dark:bg-slate-800/50 dark:border-white/10 transition-colors rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
          >
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Driver Onboarding Invite Code</h3>
              <p className="text-xs text-slate-500">Provide this code to your drivers to let them register under your organization.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 p-4 rounded-xl flex items-center justify-center gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-wider font-mono">{inviteCode}</span>
            </div>

            <p className="text-[10px] text-slate-400">
              This code automatically binds driver profiles to your enterprise ID during signup.
            </p>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 rounded-lg text-xs transition-colors"
            >
              Done &amp; Dismiss
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
