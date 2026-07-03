<p align="center">
  <img src="https://img.shields.io/badge/Edge_AI-Offline_First-f59e0b?style=for-the-badge&logo=tensorflow&logoColor=white" />
  <img src="https://img.shields.io/badge/Voice-Hindi_First-06b6d4?style=for-the-badge&logo=googletranslate&logoColor=white" />
  <img src="https://img.shields.io/badge/Stack-React_+_Express_+_MongoDB-10b981?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-Gemini_+_LangGraph-a855f7?style=for-the-badge&logo=google&logoColor=white" />
</p>

# 🚛 VahanAI — Predictive Intelligence for Indian Fleets

> **What if your truck could tell you it's breaking down?**
>
> Driver speaks Hindi into their phone. AI listens to the engine. The camera watches for fatigue. **No internet needed.**

VahanAI is an **edge-first, AI-powered predictive maintenance and driver safety platform** built specifically for the Indian commercial vehicle ecosystem. It bridges the gap between long-haul truck drivers operating in low-connectivity zones and fleet owners who need real-time safety and maintenance insights.

---

## 🎯 What Makes VahanAI Different

| Feature | What It Does | Why It Matters |
|---------|-------------|----------------|
| 🎤 **Hindi Voice RAG** | Driver says "गाड़ी से धुआं आ रहा है" → AI diagnoses the fault | 85% of Indian truck drivers speak Hindi, not English |
| 👁️ **Drowsiness Detection** | Webcam tracks Eye Aspect Ratio (EAR < 0.25 = alert) | 40% of highway accidents involve driver fatigue |
| 🔊 **Acoustic FFT Analysis** | Phone microphone captures engine sounds → frequency analysis detects knocks, bearing failures | No OBD hardware needed — works with any smartphone |
| 🧠 **Fleet Pattern AI** | 3 trucks from the same fleet report similar faults → federated alert | Cross-vehicle correlation catches systemic issues early |
| 📡 **Offline-First Edge AI** | Works at 0 bars — syncs when connectivity returns | Most breakdowns happen in remote areas |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VahanAI Platform                      │
├──────────────────────┬──────────────────────────────────────┤
│    Driver App        │         Fleet Manager Portal          │
│  (Mobile-First UI)   │      (Analytics Dashboard)           │
│                      │                                      │
│  • Hindi Voice Input │  • Real-time fleet health overview   │
│  • Engine Sound FFT  │  • Driver safety scores             │
│  • Drowsiness Camera │  • Maintenance scheduling           │
│  • Offline Diagnostics│  • Cross-fleet pattern alerts       │
├──────────────────────┴──────────────────────────────────────┤
│                    Express + Node.js Server                   │
│                                                              │
│  • Multi-Agent RAG (LangGraph + Gemini)                     │
│  • Acoustic fault classification pipeline                    │
│  • Real-time sync engine (MongoDB ↔ Local JSON cache)       │
│  • Federated fleet pattern detection                        │
├──────────────────────────────────────────────────────────────┤
│              MongoDB Atlas  /  Local JSON Fallback            │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
vahanai/
├── src/                          # Frontend (React + TailwindCSS)
│   ├── App.tsx                   # Landing page & authentication
│   ├── driver-app/
│   │   └── DriverApp.tsx         # Driver mobile-first interface
│   ├── fleet-portal/
│   │   └── FleetPortal.tsx       # Fleet manager analytics dashboard
│   ├── types.ts                  # Shared TypeScript type definitions
│   ├── index.css                 # Global styles & animations
│   └── main.tsx                  # React entry point
│
├── server.ts                     # Express API server (entry point)
├── server/                       # Backend modules
│   ├── db.ts                     # Database layer (MongoDB + JSON fallback)
│   ├── faultKnowledgeBase.ts     # RAG knowledge base for vehicle diagnostics
│   └── langgraph-agents.ts       # Multi-agent diagnostic reasoning (LangGraph)
│
├── data/
│   └── vahanai_db.json           # Local database cache (seed data)
│
├── public/                       # Static assets
├── scripts/
│   └── migrations/               # Historical migration & patch scripts
│
├── index.html                    # Vite HTML entry
├── vite.config.ts                # Vite + TailwindCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
├── .env.example                  # Environment variable template
└── metadata.json                 # App metadata & capabilities
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (optional — falls back to local JSON)
- **Gemini API Key** ([Get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Mangesh-Alange/Vahan-AI.git
cd Vahan-AI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
# Optionally add MONGODB_URI for persistent storage

# 4. Run the development server
npm run dev
```

The app will be available at **http://localhost:3000**

### Demo Accounts (Pre-seeded)

| Role | Phone | Password | Description |
|------|-------|----------|-------------|
| 🏢 Fleet Owner | `9876543210` | `password` | Mangesh Alange — Full dashboard access |
| 🚛 Driver | `9123456780` | `password` | Rajesh Kumar — Hindi voice diagnostics |
| 🚛 Driver | `9123456781` | `password` | Gurpreet Singh — Breakdown reporting |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TailwindCSS 4, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Express.js, Node.js, TypeScript |
| **AI/ML** | Google Gemini 2.0, LangGraph multi-agent framework |
| **Database** | MongoDB Atlas with local JSON fallback |
| **Build** | Vite, esbuild, TSX |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Production build (Vite + esbuild) |
| `npm start` | Run production server |
| `npm run lint` | TypeScript type checking |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for AI features |
| `MONGODB_URI` | ❌ | MongoDB connection string (falls back to local JSON) |

---

## 👥 Team

- **Mangesh Alange** — Full-stack development & AI integration

---

<p align="center">
  <sub>Built with ❤️ for Indian truck drivers and fleet operators</sub>
</p>
