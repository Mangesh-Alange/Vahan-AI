import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, Users, Key, Phone, User, ShieldAlert, Sparkles, 
  ArrowRight, Lock, Check, HelpCircle, MapPin, Play, Landmark,
  Mic, Eye, Cpu, BarChart3, Wifi, WifiOff, Volume2
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from './types.js';
import DriverApp from './driver-app/DriverApp.js';
import FleetPortal from './fleet-portal/FleetPortal.js';

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
    fetch('/api/db-status')
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
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('vahanai_session', JSON.stringify(data.user));
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

  // 1-Click login for judges
  const handleQuickLogin = async (profile: typeof demoProfiles[0]) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone,
          password: profile.password
        })
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('vahanai_session', JSON.stringify(data.user));
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

      {/* Main Content - Centered Layout */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 pb-8">
        
        {/* Hero Tagline above form */}
        <div className="text-center mb-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-5 text-[11px] text-amber-400 font-bold uppercase tracking-widest">
            <Cpu className="h-3 w-3" />
            Edge AI · Works Offline · Hindi Voice-First
          </div>
          <h1 className="text-3xl md:text-[3.2rem] font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl">
            What if your truck could
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">tell you it's breaking down?</span>
          </h1>
          <p className="text-slate-300/70 text-sm md:text-[15px] mt-4 max-w-xl mx-auto font-light leading-relaxed">
            Your driver speaks Hindi into their phone. AI listens to the engine. The camera watches for fatigue.
            <span className="text-white font-medium"> No internet needed.</span>
          </p>
          
          {/* Live Edge-AI Stats */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-2 text-[11px]">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-400 font-mono font-bold">3 AI Agents</span>
              <span className="text-slate-500">active</span>
            </div>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-2 text-[11px]">
              <WifiOff className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400 font-mono font-bold">Offline-First</span>
              <span className="text-slate-500">edge compute</span>
            </div>
            <div className="w-px h-4 bg-slate-700 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <Volume2 className="h-3 w-3 text-cyan-400" />
              <span className="text-cyan-400 font-mono font-bold">Hindi + Acoustic</span>
              <span className="text-slate-500">RAG</span>
            </div>
          </div>
        </div>

        {/* Auth Card - Floating Glassmorphic */}
        <div className="w-full max-w-[420px] bg-slate-950/70 backdrop-blur-xl rounded-3xl p-7 md:p-8 border border-white/10 shadow-2xl shadow-black/40">
          
          {/* Tab Switcher */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl mb-6 border border-white/5">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                !isSignUp ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                isSignUp ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {isSignUp && (
              <>
                {/* Role Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('fleet_manager')}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
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
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
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
                    className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                    required
                  />
                </div>

                {/* Invite Code or Org Name */}
                {role === 'driver' ? (
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Fleet Invite Code (e.g. RAJP-INV-1234)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
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
                      className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
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
                className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all font-mono"
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
                className="w-full bg-slate-900/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                required
              />
            </div>

            {errorMsg && (
              <p className="bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl text-xs font-medium text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-neutral-800 disabled:to-neutral-800 text-slate-950 disabled:text-neutral-500 font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xl hover:-translate-y-0.5 hover:shadow-amber-500/30 mt-2"
            >
              {isLoading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* What Makes Us Different - Differentiator Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 max-w-3xl w-full">
          <div className="bg-slate-950/60 backdrop-blur-sm border border-white/8 rounded-2xl p-3.5 text-center group hover:border-amber-500/30 transition-all hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-amber-500/20 transition-colors">
              <Mic className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight">Hindi Voice</p>
            <p className="text-[9px] text-slate-500 mt-0.5">"Gaadi se dhuan" → instant diagnosis</p>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-sm border border-white/8 rounded-2xl p-3.5 text-center group hover:border-cyan-500/30 transition-all hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-cyan-500/20 transition-colors">
              <Eye className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight">Drowsiness AI</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Webcam EAR detection saves lives</p>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-sm border border-white/8 rounded-2xl p-3.5 text-center group hover:border-emerald-500/30 transition-all hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-500/20 transition-colors">
              <Volume2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight">Engine Sound FFT</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Phone mic detects faults acoustically</p>
          </div>
          <div className="bg-slate-950/60 backdrop-blur-sm border border-white/8 rounded-2xl p-3.5 text-center group hover:border-purple-500/30 transition-all hover:-translate-y-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-500/20 transition-colors">
              <BarChart3 className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight">Fleet Pattern AI</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Cross-vehicle breakdown correlation</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-[10px] text-slate-500 flex items-center gap-3">
          <span>© 2027 VahanAI</span>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </div>

    </div>
  );
}

