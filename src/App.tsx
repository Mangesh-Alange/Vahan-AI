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
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col md:flex-row font-sans relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Brand & Concept Introduction Left Panel */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 z-10 relative overflow-hidden">
        
        {/* Video Background Layer */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <iframe
            src="https://www.youtube.com/embed/vqQHrnItbV0?autoplay=1&mute=1&loop=1&playlist=vqQHrnItbV0&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1"
            title="Tata Trucks Background"
            className="w-[100vw] h-[100vh] min-w-[200%] min-h-[200%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.22] pointer-events-none scale-[1.3] aspect-video object-cover"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          ></iframe>
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"></div>
        </div>

        <div className="space-y-6 max-w-lg relative z-10">
          <div className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl font-black w-fit text-xl flex items-center gap-2 shadow-lg shadow-amber-500/10">
            <Truck className="h-6 w-6" />
            VahanAI
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-black leading-tight text-white tracking-tight">
              AI at the Edge for Indian Fleet Operators
            </h1>
            <p className="text-sm md:text-lg text-slate-300 leading-relaxed font-light mt-4 max-w-md">
              A comprehensive predictive maintenance and driver safety suite. Connecting long-haul truck drivers and fleet owners on a single intelligent platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs leading-relaxed">
            <div className="glass-dark p-5 rounded-2xl border-l-2 border-l-amber-500 transition-all hover:-translate-y-1 hover:shadow-xl">
              <span className="text-amber-400 font-bold block mb-2 text-sm">📢 Driver &amp; Mechanics</span>
              <p className="text-slate-300">Hindi-first voice diagnostic RAG, FFT engine sound analyzer, and webcam driver drowsiness detection. Offline capable with local sync.</p>
            </div>
            <div className="glass-dark p-5 rounded-2xl border-l-2 border-l-emerald-500 transition-all hover:-translate-y-1 hover:shadow-xl">
              <span className="text-emerald-400 font-bold block mb-2 text-sm">📊 Fleet Managers</span>
              <p className="text-slate-300">Central analytics dashboard, automated breakdown pattern detection (federated alerts), driver roster, and real safety logs.</p>
            </div>
          </div>
        </div>

        {/* Footnote branding */}
        <div className="mt-12 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-4">
            <span>© 2027 VahanAI Inc.</span>
            <span>•</span>
            <a href="#" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-amber-500 transition-colors">Terms of Service</a>
          </div>
          {dbStatus && (
            <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded self-start sm:self-auto font-mono">
              Database: {dbStatus.usingMongo ? "MongoDB Connected" : "Local JSON Cache"}
            </span>
          )}
        </div>
      </div>

      {/* Authentication Right Panel */}
      <div className="w-full md:w-[480px] bg-neutral-950/60 backdrop-blur-2xl p-8 md:p-12 flex flex-col justify-center space-y-8 z-10 border-l border-white/5 shadow-2xl">
        
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Welcome Back</h2>
          <p className="text-sm text-slate-400">Sign in to your fleet dashboard or driver app.</p>
        </div>

        {/* Standard Form Auth */}
        <div className="space-y-6">
          <div className="flex glass-dark p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                !isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                isSignUp ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up / Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {isSignUp && (
              <>
                {/* SignUp Role Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('fleet_manager')}
                    className={`py-2 px-3.5 rounded-lg border font-bold text-center transition-colors ${
                      role === 'fleet_manager'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Fleet Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    className={`py-2 px-3.5 rounded-lg border font-bold text-center transition-colors ${
                      role === 'driver'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Truck Driver
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 ml-1">Full name</label>
                  <div className="flex items-center glass-dark border border-white/10 rounded-xl px-4 py-3 transition-all focus-within:border-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <User className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
                    <input
                      type="text"
                      placeholder="e.g. Mangesh Alange"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-transparent text-white w-full focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {role === 'driver' ? (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 ml-1">
                      Transport Invite Code (e.g. RAJP-INV-1234)
                    </label>
                    <div className="flex items-center glass-dark border border-white/10 rounded-xl px-4 py-3 transition-all focus-within:border-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <Landmark className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
                      <input
                        type="text"
                        placeholder="Provided by Fleet Owner"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="bg-transparent text-white w-full focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 ml-1">Company / Organization name</label>
                    <div className="flex items-center glass-dark border border-white/10 rounded-xl px-4 py-3 transition-all focus-within:border-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <Landmark className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
                      <input
                        type="text"
                        placeholder="e.g. Rajpath Roadways Logistics"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="bg-transparent text-white w-full focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 ml-1">10-Digit Mobile number</label>
              <div className="flex items-center glass-dark border border-white/10 rounded-xl px-4 py-3 transition-all focus-within:border-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent text-white w-full focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 ml-1">Password</label>
              <div className="flex items-center glass-dark border border-white/10 rounded-xl px-4 py-3 transition-all focus-within:border-amber-500 focus-within:shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Lock className="h-4 w-4 text-slate-400 shrink-0 mr-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent text-white w-full focus:outline-none"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <p className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded text-xs font-semibold">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-neutral-800 disabled:to-neutral-800 text-slate-950 disabled:text-neutral-500 font-black py-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xl hover:-translate-y-0.5 hover:shadow-amber-500/20"
            >
              {isLoading ? "Processing..." : isSignUp ? "Create Transport Profile" : "Authenticate & Open Portal"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}

