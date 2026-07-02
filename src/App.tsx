import React, { useState, useEffect } from 'react';
import { 
  Truck, Users, Key, Phone, User, ShieldAlert, Sparkles, 
  ArrowRight, Lock, Check, HelpCircle, MapPin, Play, Landmark 
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
        <div className="text-center mb-8 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
            Predictive Intelligence for
            <span className="text-amber-400"> Indian Fleets</span>
          </h1>
          <p className="text-slate-300/80 text-sm md:text-base mt-3 max-w-lg mx-auto font-light">
            Voice-first diagnostics, real-time fatigue monitoring, and AI-powered fleet analytics — all on one platform.
          </p>
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

        {/* Feature Pills - Below Card */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8 max-w-xl">
          <div className="flex items-center gap-2 bg-slate-950/50 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2 text-[11px] text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Voice Diagnostics in Hindi</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/50 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2 text-[11px] text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            <span>Real-time Fatigue Detection</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/50 backdrop-blur-sm border border-white/8 rounded-full px-4 py-2 text-[11px] text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Fleet Pattern Alerts</span>
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

