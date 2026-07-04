import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Users, Key, Phone, User, ShieldAlert, Sparkles, 
  ArrowRight, Lock, Check, HelpCircle, MapPin, Play, Landmark,
  Mic, Eye, Cpu, BarChart3, Wifi, WifiOff, Volume2
} from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup } from 'firebase/auth';
import { User as UserType } from './types.js';
import DriverApp from './driver-app/DriverApp.js';
import FleetPortal from './fleet-portal/FleetPortal.js';
import { API_URL } from './config.js';
import { auth, googleProvider } from '@/lib/firebase';

export default function App() {
  // Current session user
  const [user, setUser] = useState<UserType | null>(null);
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [role, setRole] = useState<'driver' | 'fleet_manager'>('fleet_manager');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; usingMongo: boolean; uriDefined: boolean } | null>(null);

  const persistSession = (sessionUser: UserType) => {
    setUser(sessionUser);
    localStorage.setItem('vahanai_session', JSON.stringify(sessionUser));
  };

  // Auto-fill Demo profiles (For instant 1-click judging)
  const demoProfiles = [
    {
      name: "Mangesh Alange (Owner)",
      role: "fleet_manager" as const,
      phone: "9876543210",
      password: "password",
      org: "Rajpath Roadways Logistics",
      desc: "Pune SME transport operator. View analytics, safety violations, and fleet pattern matching alerts."
    },
    {
      name: "Rajesh Kumar (Driver)",
      role: "driver" as const,
      phone: "9123456780",
      password: "password",
      org: "Rajpath Roadways Logistics",
      desc: "Speaking Hindi. Simulates edge RAG diagnostics, acoustic FFT analysis, and camera EAR fatigue warnings."
    },
    {
      name: "Gurpreet Singh (Driver)",
      role: "driver" as const,
      phone: "9123456781",
      password: "password",
      org: "Rajpath Roadways Logistics",
      desc: "Speaking Hindi/Punjabi. Simulate breakdown voice reports and auto-triggers WhatsApp alerting dispatch."
    }
  ];

  // Try to load user from localStorage on boot
  useEffect(() => {
    const saved = localStorage.getItem('vahanai_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Seamlessly migrate stale cached demo profiles to match official DB seeds
        if (parsed.phone === "9123456789" || parsed.id === "usr_rajesh") {
          parsed.phone = "9123456780";
          parsed.id = "driver_rajesh";
          parsed.org_id = "org_rajpath";
          localStorage.setItem('vahanai_session', JSON.stringify(parsed));
        } else if (parsed.phone === "9812345678" || parsed.id === "usr_gurpreet") {
          parsed.phone = "9123456781";
          parsed.id = "driver_gurpreet";
          parsed.org_id = "org_rajpath";
          localStorage.setItem('vahanai_session', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (err) {
        localStorage.removeItem('vahanai_session');
      }
    }
  }, []);

  // Fetch Database connection/fallback status on mount
  useEffect(() => {
    fetch(`${API_URL}/api/db-status`)
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => console.error("Failed to fetch database status", err));
  }, []);

  // Handle Custom Login API
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const url = isSignUp 
      ? (role === 'driver' ? '/api/auth/invite' : '/api/auth/signup') 
      : '/api/auth/login';
    const body: any = { phone, password };
    
    if (isSignUp) {
      body.name = name;
      body.role = role;
      body.preferred_language = 'hindi';
      if (role === 'driver') {
        body.invite_code = inviteCode;
      } else {
        body.org_name = orgName;
      }
    }

    try {
      const res = await fetch(`${API_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.user) {
        persistSession(data.user);
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch (err) {
      setErrorMsg("Network connection failed. Using local mockup session.");
      // For fallback offline demo
      const mockUser: UserType = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        org_id: role === 'driver' ? 'org_rajpath' : 'org_custom',
        role: isSignUp ? role : 'fleet_manager',
        name: name || "Demo User",
        phone,
        preferred_language: 'hindi',
        created_at: new Date().toISOString()
      };
      setUser(mockUser);
      localStorage.setItem('vahanai_session', JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      const popupResult = await signInWithPopup(auth, googleProvider);
      const firebaseUser = popupResult.user;
      const resolvedName = firebaseUser.displayName || name || "Google User";
      const resolvedPhone = firebaseUser.phoneNumber || '';

      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isSignUp ? 'signup' : 'signin',
          firebase_uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          name: resolvedName,
          phone: resolvedPhone,
          role: isSignUp ? role : undefined,
          preferred_language: 'hindi',
          invite_code: isSignUp && role === 'driver' ? inviteCode : undefined,
          org_name: isSignUp && role === 'fleet_manager' ? orgName : undefined
        })
      });

      const data = await res.json();
      if (data.user) {
        persistSession(data.user);
      } else if (data.error) {
        setErrorMsg(data.error);
      } else {
        setErrorMsg('Google sign-in failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click login for judges
  const handleQuickLogin = async (profile: typeof demoProfiles[0]) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone,
          password: profile.password
        })
      });
      const data = await res.json();
      if (data.user) {
        persistSession(data.user);
      } else {
        setErrorMsg(data.error || "Login failed");
      }
    } catch (err) {
      console.warn("Using local fallback session for demo profile.", err);
      const mockUser: UserType = {
        id: profile.role === 'fleet_manager' ? 'user_mangesh' : profile.phone === '9123456780' ? 'driver_rajesh' : 'driver_gurpreet',
        org_id: 'org_rajpath',
        role: profile.role,
        name: profile.name.split(" ")[0],
        phone: profile.phone,
        preferred_language: 'hindi',
        created_at: new Date().toISOString()
      };
      setUser(mockUser);
      localStorage.setItem('vahanai_session', JSON.stringify(mockUser));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vahanai_session');
  };

  // Route to sub-portals
  if (user) {
    if (user.role === 'driver') {
      return <DriverApp user={user} onLogout={handleLogout} />;
    } else {
      return <FleetPortal user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* FULL-SCREEN Truck Fleet Hero Background */}
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src="/tata-fleet-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.65]"
          style={{
            animation: 'kenburns 25s ease-in-out infinite alternate',
          }}
        />
        {/* Gradient overlays for depth and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-slate-950/30"></div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2 rounded-lg shadow-lg shadow-amber-500/20">
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-xl font-black text-white tracking-tight">VahanAI</span>
        </div>
        <div className="flex items-center gap-3">
          {dbStatus && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-mono hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              {dbStatus.usingMongo ? "MongoDB Live" : "Local Cache"}
            </span>
          )}
          <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">About</a>
          <a href="#" className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:block">Docs</a>
        </div>
      </nav>

      {/* Main Content - Two-Column Layout to Prevent Scrolling on Desktop */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-12 min-h-[calc(100vh-80px)] max-w-6xl mx-auto px-4 pb-8 pt-4 lg:pt-8 overflow-y-auto lg:overflow-y-visible">
        
        {/* Left Column: Hero Tagline & Differentiators */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-4 text-[11px] text-amber-400 font-bold uppercase tracking-widest">
            <Cpu className="h-3 w-3" />
            Edge AI · Works Offline · Hindi Voice-First
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl">
            What if your truck could
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">tell you it's breaking down?</span>
          </h1>
          <p className="text-slate-100 text-[15px] mt-4.5 max-w-xl mx-auto lg:mx-0 font-semibold leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            Your driver speaks Hindi into their phone. AI listens to the engine. The camera watches for fatigue.
            <span className="text-amber-400 font-black"> No internet needed.</span>
          </p>
          
          {/* Live Edge-AI Stats */}
          <div className="flex items-center justify-center lg:justify-start gap-4 mt-5 w-full drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]">
            <div className="flex items-center gap-2 text-xs md:text-[13px]">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 font-mono font-black">5 AI Agents</span>
              <span className="text-slate-200 font-semibold">active</span>
            </div>
            <div className="w-px h-4 bg-slate-500"></div>
            <div className="flex items-center gap-2 text-xs md:text-[13px]">
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-400 font-mono font-black">Offline-First</span>
              <span className="text-slate-200 font-semibold">edge compute</span>
            </div>
            <div className="w-px h-4 bg-slate-500 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-xs md:text-[13px]">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-cyan-400 font-mono font-black">Hindi + Acoustic</span>
              <span className="text-slate-200 font-semibold">RAG</span>
            </div>
          </div>

          {/* 🔥 What Makes Us Different - BOLD Differentiator Strip */}
          <div className="mt-7 w-full">
            <p className="text-center lg:text-left text-xs uppercase tracking-[0.2em] text-slate-200 font-black mb-3.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              ⚡ Not another dashboard — This is <span className="text-amber-400">Edge AI that works at 0 bars</span>
            </p>
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Hindi Voice Card */}
              <div className="relative overflow-hidden rounded-2xl p-[1px] group" style={{background: 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(245,158,11,0.05), rgba(245,158,11,0.3))'}}>
                <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-3.5 h-full relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
                  <div className="text-2xl mb-1.5">🎤</div>
                  <p className="text-xs font-black text-white">Hindi Voice RAG</p>
                  <p className="text-[10px] text-amber-400/80 font-medium mt-0.5">"गाड़ी से धुआं आ रहा है"</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Speak → AI diagnoses in seconds</p>
                </div>
              </div>
              {/* Drowsiness Card */}
              <div className="relative overflow-hidden rounded-2xl p-[1px] group" style={{background: 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(6,182,212,0.05), rgba(6,182,212,0.3))'}}>
                <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-3.5 h-full relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
                  <div className="text-2xl mb-1.5">👁️</div>
                  <p className="text-xs font-black text-white">Drowsiness Watch</p>
                  <p className="text-[10px] text-cyan-400/80 font-medium mt-0.5">EAR {"<"} 0.25 → ALERT!</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Webcam saves lives in real-time</p>
                </div>
              </div>
              {/* Engine Sound Card */}
              <div className="relative overflow-hidden rounded-2xl p-[1px] group" style={{background: 'linear-gradient(135deg, rgba(16,185,129,0.4), rgba(16,185,129,0.05), rgba(16,185,129,0.3))'}}>
                <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-3.5 h-full relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                  <div className="text-2xl mb-1.5">🔊</div>
                  <p className="text-xs font-black text-white">Acoustic FFT</p>
                  <p className="text-[10px] text-emerald-400/80 font-medium mt-0.5">Engine knock? Bearing fail?</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Phone mic → frequency analysis</p>
                </div>
              </div>
              {/* Fleet Pattern Card */}
              <div className="relative overflow-hidden rounded-2xl p-[1px] group" style={{background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(168,85,247,0.05), rgba(168,85,247,0.3))'}}>
                <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-3.5 h-full relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                  <div className="text-2xl mb-1.5">🧠</div>
                  <p className="text-xs font-black text-white">Fleet Brain</p>
                  <p className="text-[10px] text-purple-400/80 font-medium mt-0.5">3 trucks same fault = alert</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Cross-vehicle pattern detection</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Auth Card & Footer */}
        <div className="flex flex-col items-center justify-center w-full max-w-[420px] mt-4 lg:mt-0">
          
          {/* Auth Card - Floating Glassmorphic */}
          <div className="w-full bg-slate-950/70 backdrop-blur-xl rounded-3xl p-6 md:p-7 border border-white/10 shadow-2xl shadow-black/40">
            
            {/* Tab Switcher */}
            <div className="flex bg-slate-900/80 p-1 rounded-2xl mb-4 border border-white/5">
              <button
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  !isSignUp ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isSignUp ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isSignUp && (
                <>
                  {/* Role Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('fleet_manager')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        role === 'fleet_manager'
                          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/15'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" /> Fleet Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        role === 'driver'
                          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/15'
                      }`}
                    >
                      <Truck className="h-3.5 w-3.5" /> Driver
                    </button>
                  </div>

                  {/* Name Field */}
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                      required
                    />
                  </div>

                  {/* Invite Code or Org Name */}
                  {role === 'driver' ? (
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Fleet Invite Code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                        required
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Organization Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                  required
                />
              </div>

              {errorMsg && (
                <p className="bg-red-500/10 border border-red-500/25 text-red-400 p-2.5 rounded-xl text-xs font-medium text-center">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-neutral-800 disabled:to-neutral-800 text-slate-950 disabled:text-neutral-500 font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xl hover:-translate-y-0.5 hover:shadow-amber-500/30 mt-1"
              >
                {isLoading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-950/80 px-3 text-[11px] text-slate-500 font-semibold">OR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full bg-slate-900/70 border border-white/10 hover:border-white/25 hover:bg-slate-900 disabled:bg-neutral-900/70 disabled:text-neutral-500 text-white font-black py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.7C17 2.9 14.8 2 12 2 6.9 2 2.8 6.5 2.8 12s4.1 10 9.2 10c5.3 0 8.8-3.8 8.8-9.1 0-.6-.1-1.1-.2-1.7H12z" />
                  <path fill="#34A853" d="M3.7 7.3l3.2 2.3C7.8 7.5 9.7 6 12 6c1.9 0 3.2.8 3.9 1.5l2.7-2.7C17 2.9 14.8 2 12 2 8.5 2 5.4 4.1 3.7 7.3z" />
                  <path fill="#FBBC05" d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3-2.5c-.9.6-2.1 1-3.6 1-2.5 0-4.6-1.7-5.4-4l-3.3 2.6C4.9 19.8 8.1 22 12 22z" />
                  <path fill="#4285F4" d="M21 12.9c0-.6-.1-1.1-.2-1.7H12v3.9h5.5c-.3 1.7-1.3 3-2.8 3.9l3 2.5c1.8-1.7 3.3-4.3 3.3-8.6z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-4 text-[10px] text-slate-500 flex items-center gap-3">
            <span>© 2027 VahanAI</span>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>

      </div>

    </div>
  );
}
