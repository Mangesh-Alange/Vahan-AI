var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/db.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
var crypto = __toESM(require("crypto"), 1);
var import_mongodb = require("mongodb");
var IS_SERVERLESS = !!(process.env.VERCEL || process.env.FIREBASE_FUNCTIONS || process.env.LAMBDA_TASK_ROOT);
var DB_DIR = IS_SERVERLESS ? path.resolve("/tmp", "data") : path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DB_DIR, "vahanai_db.json");
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}
var Database = class {
  constructor() {
    this.mongoClient = null;
    this.mongoDb = null;
    this.isMongoConnected = false;
    this.isConnecting = false;
    this.data = {
      organizations: [],
      users: [],
      vehicles: [],
      fault_reports: [],
      fleet_alerts: [],
      service_centers: [],
      fatigue_events: [],
      sos_alerts: [],
      scheduled_services: []
    };
    this.init();
  }
  async connectMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log("MONGODB_URI environment variable is not defined. Using local file database.");
      return;
    }
    if (this.isConnecting || this.isMongoConnected) return;
    this.isConnecting = true;
    try {
      console.log("Connecting to MongoDB...");
      this.mongoClient = new import_mongodb.MongoClient(uri, {
        serverSelectionTimeoutMS: 5e3
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db("vahanai");
      this.isMongoConnected = true;
      console.log("Connected successfully to MongoDB!");
      await this.syncDataToMongo();
    } catch (err) {
      console.error("Failed to connect to MongoDB. Falling back to local file database.", err);
      this.isMongoConnected = false;
      this.mongoClient = null;
      this.mongoDb = null;
    } finally {
      this.isConnecting = false;
    }
  }
  async syncDataToMongo() {
    if (!this.mongoDb) return;
    try {
      const collections = ["organizations", "users", "vehicles", "fault_reports", "fleet_alerts", "service_centers", "fatigue_events", "sos_alerts"];
      const userCount = await this.mongoDb.collection("users").countDocuments();
      if (userCount === 0) {
        console.log("MongoDB is empty. Seeding MongoDB with local JSON database data...");
        for (const col of collections) {
          const items = this.data[col];
          if (items && items.length > 0) {
            await this.mongoDb.collection(col).insertMany(items);
          }
        }
        console.log("Successfully seeded MongoDB with local data.");
      } else {
        console.log("MongoDB has data. Pulling data from MongoDB to local cache...");
        for (const col of collections) {
          const items = await this.mongoDb.collection(col).find({}).toArray();
          const cleanedItems = items.map((item) => {
            const { _id, ...rest } = item;
            return rest;
          });
          this.data[col] = cleanedItems;
        }
        this.save();
        console.log("Successfully synchronized local cache with MongoDB data.");
      }
    } catch (err) {
      console.error("Error during MongoDB sync:", err);
    }
  }
  asyncWrite(collection, action, query, data) {
    if (!this.isMongoConnected || !this.mongoDb) return;
    (async () => {
      try {
        const col = this.mongoDb.collection(collection);
        if (action === "insert") {
          await col.insertOne(data);
        } else if (action === "update") {
          await col.updateOne(query, { $set: data });
        } else if (action === "delete") {
          await col.deleteOne(query);
        }
      } catch (err) {
        console.error(`MongoDB async write failed for collection ${collection}:`, err);
      }
    })();
  }
  getStatus() {
    return {
      connected: this.isMongoConnected,
      usingMongo: this.isMongoConnected && !!process.env.MONGODB_URI,
      uriDefined: !!process.env.MONGODB_URI
    };
  }
  init() {
    if (!fs.existsSync(DB_DIR)) {
      try {
        fs.mkdirSync(DB_DIR, { recursive: true });
      } catch (err) {
        console.error("Failed to create database directory:", err);
      }
    }
    if (IS_SERVERLESS && !fs.existsSync(DB_FILE)) {
      const bundledDbFile = path.resolve(process.cwd(), "data", "vahanai_db.json");
      if (fs.existsSync(bundledDbFile)) {
        try {
          fs.copyFileSync(bundledDbFile, DB_FILE);
          console.log("Copied bundled database file to writable /tmp path.");
        } catch (err) {
          console.error("Failed to copy bundled database file to writable path:", err);
        }
      }
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
      } catch (err) {
        console.error("Failed to parse database file. Initializing fresh.", err);
        this.seed();
      }
    } else {
      this.seed();
    }
  }
  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Local database file write ignored (normal in serverless/read-only environments):", err.message);
    }
  }
  seed() {
    console.log("Seeding database with default transport metadata...");
    const orgs = [
      { id: "org_rajpath", name: "Rajpath Roadways Logistics", plan_tier: "pro", created_at: "2026-01-10T10:00:00Z" },
      { id: "org_kedar", name: "Kedar Inter-State Logistics", plan_tier: "pro", created_at: "2026-02-15T12:00:00Z" }
    ];
    const passHash = hashPassword("password");
    const users = [
      // Fleet Managers
      { id: "user_mangesh", org_id: "org_rajpath", role: "fleet_manager", name: "Mangesh Alange", phone: "9876543210", password_hash: passHash, preferred_language: "en", created_at: "2026-01-11T09:00:00Z" },
      { id: "user_kedar_mgr", org_id: "org_kedar", role: "fleet_manager", name: "Suresh Kedar", phone: "9988776655", password_hash: passHash, preferred_language: "en", created_at: "2026-02-16T09:30:00Z" },
      // Drivers (Rajpath)
      { id: "driver_rajesh", org_id: "org_rajpath", role: "driver", name: "Rajesh Kumar", phone: "9123456780", password_hash: passHash, preferred_language: "hi", created_at: "2026-01-12T08:00:00Z" },
      { id: "driver_gurpreet", org_id: "org_rajpath", role: "driver", name: "Gurpreet Singh", phone: "9123456781", password_hash: passHash, preferred_language: "hi", created_at: "2026-01-15T08:30:00Z" },
      { id: "driver_amit", org_id: "org_rajpath", role: "driver", name: "Amit Sharma", phone: "9123456782", password_hash: passHash, preferred_language: "hi", created_at: "2026-01-20T08:15:00Z" },
      // Drivers (Kedar)
      { id: "driver_sunil", org_id: "org_kedar", role: "driver", name: "Sunil Yadav", phone: "9123456783", password_hash: passHash, preferred_language: "hi", created_at: "2026-02-17T08:45:00Z" },
      { id: "driver_harpreet", org_id: "org_kedar", role: "driver", name: "Harpreet Singh", phone: "9123456784", password_hash: passHash, preferred_language: "hi", created_at: "2026-02-20T08:00:00Z" },
      // Admin
      { id: "user_admin", org_id: null, role: "admin", name: "VahanAI Admin Support", phone: "9000000000", password_hash: passHash, preferred_language: "en", created_at: "2026-01-01T00:00:00Z" }
    ];
    const vehicles = [
      // Rajpath Roadways
      { id: "veh_1", org_id: "org_rajpath", registration_number: "MH-12-QW-5678", make: "Tata", model: "Signa 4825.T", year: 2023, assigned_driver_id: "driver_rajesh", mileage: 124500, last_service_date: "2026-05-10" },
      { id: "veh_2", org_id: "org_rajpath", registration_number: "MH-14-ER-9012", make: "Tata", model: "Prima 5530.S", year: 2024, assigned_driver_id: "driver_gurpreet", mileage: 86200, last_service_date: "2026-04-12" },
      { id: "veh_3", org_id: "org_rajpath", registration_number: "DL-01-AB-1234", make: "Ashok Leyland", model: "Dost Strong", year: 2022, assigned_driver_id: "driver_amit", mileage: 154e3, last_service_date: "2026-05-18" },
      { id: "veh_4", org_id: "org_rajpath", registration_number: "MH-12-ZY-9988", make: "Mahindra", model: "Blazo X 49", year: 2023, assigned_driver_id: null, mileage: 98e3, last_service_date: "2026-05-02" },
      { id: "veh_5", org_id: "org_rajpath", registration_number: "MH-12-PL-3344", make: "Tata", model: "Ace Gold Diesel", year: 2021, assigned_driver_id: null, mileage: 21e4, last_service_date: "2026-03-30" },
      // Kedar Inter-State
      { id: "veh_6", org_id: "org_kedar", registration_number: "HR-26-XY-9012", make: "Mahindra", model: "Bolero Maxx Pick-Up", year: 2022, assigned_driver_id: "driver_sunil", mileage: 112e3, last_service_date: "2026-05-15" },
      { id: "veh_7", org_id: "org_kedar", registration_number: "HR-55-AB-7777", make: "Ashok Leyland", model: "U-Truck 4019.T", year: 2023, assigned_driver_id: "driver_harpreet", mileage: 94500, last_service_date: "2026-05-20" },
      { id: "veh_8", org_id: "org_kedar", registration_number: "HR-26-QQ-3344", make: "Tata", model: "Signa 2823.K", year: 2023, assigned_driver_id: null, mileage: 101e3, last_service_date: "2026-04-05" }
    ];
    const service_centers = [
      { id: "sc_01", name: "Tata Motors Authorized Service Center", location: "Sanjay Gandhi National Transport Hub, Mumbai, MH", vehicle_makes_supported: ["Tata"] },
      { id: "sc_02", name: "Ashok Leyland Dost Care Workshop", location: "Okhla Industrial Area Phase-III, New Delhi, DL", vehicle_makes_supported: ["Ashok Leyland"] },
      { id: "sc_03", name: "Mahindra Truck & Bus Care Point", location: "Sriperumbudur High Road, Chennai, TN", vehicle_makes_supported: ["Mahindra"] },
      { id: "sc_04", name: "Tata Express Highway Support", location: "NH-44 Bypass, Shamshabad, Hyderabad, TS", vehicle_makes_supported: ["Tata"] },
      { id: "sc_05", name: "Ashok Leyland Highway Care Clinic", location: "NH-8, Kukas Industrial Area, Jaipur, RJ", vehicle_makes_supported: ["Ashok Leyland"] },
      { id: "sc_06", name: "Mahindra Rise Heavy Vehicle Garage", location: "Tumkur Road, Yashwantpur, Bangalore, KA", vehicle_makes_supported: ["Mahindra"] },
      { id: "sc_07", name: "Kolkata Truck Junction Workshop", location: "Dankuni Toll Plaza, NH-19, Kolkata, WB", vehicle_makes_supported: ["Tata", "Ashok Leyland"] },
      { id: "sc_08", name: "Ganga Highway Heavy Repair Depot", location: "NH-19 Bypass, Mughal Sarai, Varanasi, UP", vehicle_makes_supported: ["Tata", "Ashok Leyland"] },
      { id: "sc_09", name: "Golden Quadrilateral Logistics Service", location: "NH-16 Bypass, Vijayawada, AP", vehicle_makes_supported: ["Mahindra", "Tata"] },
      { id: "sc_10", name: "Western India Multi-Brand Garage", location: "Kalamboli Steel Market, Navi Mumbai, MH", vehicle_makes_supported: ["Tata", "Ashok Leyland", "Mahindra", "Other"] },
      { id: "sc_11", name: "Central India North-South Service Hub", location: "NH-44, Kamptee Road, Nagpur, MH", vehicle_makes_supported: ["Tata", "Ashok Leyland"] },
      { id: "sc_12", name: "East-West Corridor Crossroad Garage", location: "NH-27 Junction, Jhansi, UP", vehicle_makes_supported: ["Mahindra", "Ashok Leyland"] },
      { id: "sc_13", name: "Gujarat Commercial Truck Clinic", location: "NH-48 Bypass, Surat, GJ", vehicle_makes_supported: ["Tata", "Ashok Leyland", "Mahindra", "Other"] },
      { id: "sc_14", name: "Sher-E-Punjab Truck Maintenance", location: "NH-44 GT Road, Ludhiana, PB", vehicle_makes_supported: ["Ashok Leyland", "Tata"] },
      { id: "sc_15", name: "South Corridor Express Garage", location: "NH-544 Bypass, Kalamassery, Kochi, KL", vehicle_makes_supported: ["Mahindra", "Tata"] }
    ];
    const mockReports = [
      {
        id: "rep_hist_1",
        vehicle_id: "veh_1",
        driver_id: "driver_rajesh",
        timestamp: "2026-06-15T10:14:00Z",
        symptom_text_hindi: "Break dabaane par dhum-dhum lag raha hai aur pedal dhas raha hai",
        symptom_text_english: "Thudding when pressing brakes and the pedal is sinking",
        acoustic_signal_class: "squeal",
        severity: "stop_immediately",
        diagnosis: "Front Brake Pads completely worn down to the backing plate, caliper seals leaking fluid.",
        recommended_action: "Change front brake pads, replace caliper seal kits, bleed brake system.",
        estimated_cost_range: "\u20B94,500 - \u20B99,500",
        synced_at: "2026-06-15T10:14:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing brake failure symptom to Triage and Maintenance specialists." },
          DiagnosticAgent: { log: "Matched symptom with knowledge base kb_02 (brake squealing and pedal vibration). High confidence." },
          TriageAgent: { log: "Braking fluid pressure dropping. Setting severity to STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Estimated cost \u20B94,500 - \u20B99,500. Directing to Sanjay Gandhi Hub SC (sc_01)." }
        })
      },
      {
        id: "rep_hist_2",
        vehicle_id: "veh_1",
        driver_id: "driver_rajesh",
        timestamp: "2026-06-20T14:45:00Z",
        symptom_text_hindi: "Engine se kharkhar aawaz aa rahi hai thodi speed badhne pe",
        symptom_text_english: "Rattling noise from the engine when speed increases slightly",
        acoustic_signal_class: "knock",
        severity: "caution",
        diagnosis: "Loose heat shield clamp vibrating near exhaust manifold and turbo joint.",
        recommended_action: "Tighten heat shield clamping bolts and inspect exhaust mounting rubber.",
        estimated_cost_range: "\u20B9800 - \u20B91,800",
        synced_at: "2026-06-20T14:45:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Identified accessory rattle." },
          DiagnosticAgent: { log: "Non-critical tapping. Matches kb_36 (exhaust rattling)." },
          TriageAgent: { log: "Safe to drive to dispatch point. Severity: CAUTION." },
          MaintenanceAgent: { log: "Estimate \u20B9800. Simple bolt fastening." }
        })
      },
      {
        id: "rep_hist_3",
        vehicle_id: "veh_2",
        driver_id: "driver_gurpreet",
        timestamp: "2026-06-22T08:30:00Z",
        symptom_text_hindi: "Dashboard par check engine aur low oil lights aa gayi hai",
        symptom_text_english: "Check engine and low oil indicators are on the dashboard",
        acoustic_signal_class: "normal",
        severity: "stop_immediately",
        diagnosis: "Severe engine lubrication depletion. Oil level is below minimum marker. Possible oil sump gasket leak.",
        recommended_action: "Do not drive. Check engine oil level using dipstick. If empty, inspect sump. Top up with 15W-40 truck oil immediately.",
        estimated_cost_range: "\u20B96,000 - \u20B912,000",
        synced_at: "2026-06-22T08:30:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing critical warning dashboard light." },
          DiagnosticAgent: { log: "Engine running dry leads to catastrophic piston seizure. Matches kb_15 partially." },
          TriageAgent: { log: "Absolute safety hazard. Severity: STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Sump gaskets and fresh oil required." }
        })
      },
      {
        id: "rep_hist_4",
        vehicle_id: "veh_3",
        driver_id: "driver_amit",
        timestamp: "2026-06-25T11:20:00Z",
        symptom_text_hindi: "Gear badalne me thoda dubaav lag raha hai, clutch dheela hai",
        symptom_text_english: "Difficulty shifting gears, clutch pedal feels loose and spongy",
        acoustic_signal_class: "normal",
        severity: "caution",
        diagnosis: "Clutch master cylinder fluid leak. Air trapped in hydraulic clutch actuation loop.",
        recommended_action: "Refill clutch fluid DOT-4 reservoir, inspect secondary hose lines, bleed master cylinder.",
        estimated_cost_range: "\u20B92,500 - \u20B95,500",
        synced_at: "2026-06-25T11:20:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Symptom mapped to clutch actuation hydraulic loop." },
          DiagnosticAgent: { log: "Matches kb_06 (clutch master cylinder leak). Moderate confidence." },
          TriageAgent: { log: "Vehicle can drive with rev-matching or cautious single-gear crawl. Severity: CAUTION." },
          MaintenanceAgent: { log: "Estimate \u20B92,500. Hydraulic seal repair." }
        })
      },
      {
        id: "rep_hist_5",
        vehicle_id: "veh_6",
        driver_id: "driver_sunil",
        timestamp: "2026-06-28T16:10:00Z",
        symptom_text_hindi: "Socks aur steering me thartharahat ho rahi hai NH-44 pe daudte waqt",
        symptom_text_english: "Vibrations in suspension and steering when cruising on NH-44",
        acoustic_signal_class: "normal",
        severity: "drive",
        diagnosis: "Front wheel dynamic imbalance or slightly bent wheel rim from impact.",
        recommended_action: "Perform wheel balancing and wheel alignment. Inspect front steel rims for oval deflection.",
        estimated_cost_range: "\u20B91,200 - \u20B92,800",
        synced_at: "2026-06-28T16:10:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing steering wheel instability." },
          DiagnosticAgent: { log: "Matches kb_13 (front tire alignment/imbalance). High confidence." },
          TriageAgent: { log: "Safe to drive at moderate speed. Severity: DRIVE." },
          MaintenanceAgent: { log: "Wheel balancing. Directing to sc_09 (Vijayawada)." }
        })
      },
      // Generate some entries for cross-vehicle pattern grouping alerts!
      // Two separate vehicles under Rajpath having identical fuel injector symptoms!
      {
        id: "rep_pattern_1",
        vehicle_id: "veh_1",
        driver_id: "driver_rajesh",
        timestamp: "2026-06-29T10:00:00Z",
        symptom_text_hindi: "Gaadi ka engine band ho raha hai baar baar, thoda kaala dhua bhi aa raha hai",
        symptom_text_english: "The engine stalls repeatedly, and some black smoke is coming out",
        acoustic_signal_class: "misfire",
        severity: "stop_immediately",
        diagnosis: "Common Rail Fuel Injector solenoid failure. Blocked injector nozzle in cylinder 3.",
        recommended_action: "Inspect fuel injector nozzles, flush the common rail fuel delivery system, replace fuel filter.",
        estimated_cost_range: "\u20B99,000 - \u20B920,000",
        synced_at: "2026-06-29T10:00:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Analyzing fuel rail pressure drop." },
          DiagnosticAgent: { log: "Corresponds directly to common rail fuel injector blockage (kb_01)." },
          TriageAgent: { log: "Risk of engine cylinder damage. Severity: STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Common rail cleaning required. Estimate \u20B912,000." }
        })
      },
      {
        id: "rep_pattern_2",
        vehicle_id: "veh_2",
        driver_id: "driver_gurpreet",
        timestamp: "2026-06-29T15:30:00Z",
        symptom_text_hindi: "Engine jhatka le raha hai aur black smoke silencer se aa raha hai",
        symptom_text_english: "Engine is jerking and black smoke is coming from the silencer",
        acoustic_signal_class: "misfire",
        severity: "stop_immediately",
        diagnosis: "Fuel injector nozzle wear in cylinder 1 and 2, causing incomplete combustion.",
        recommended_action: "Change fuel filter, perform injector nozzle cleaning, test fuel common rail pressure.",
        estimated_cost_range: "\u20B98,500 - \u20B918,000",
        synced_at: "2026-06-29T15:30:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing exhaust smoke anomaly." },
          DiagnosticAgent: { log: "Matches kb_01 (injector clogging). High confidence." },
          TriageAgent: { log: "Urgent. Severity: STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Injectors require testing on Bosch calibration bench." }
        })
      }
    ];
    const fleet_alerts = [
      {
        id: "alert_1",
        org_id: "org_rajpath",
        pattern_description: "Fuel System Issues (Fuel Injector failures / Black smoke) detected on multiple Tata Signa/Prima vehicles within a 24-hour window. Possible adulterated diesel batch at NH-44 fueling hub.",
        related_fault_report_ids: ["rep_pattern_1", "rep_pattern_2"],
        created_at: "2026-06-29T16:00:00Z",
        resolved: false
      }
    ];
    const fatigue_events = [
      { id: "fe_1", driver_id: "driver_rajesh", timestamp: "2026-06-28T02:14:00Z", ear_value: 0.18, duration_seconds: 12, severity: "critical" },
      { id: "fe_2", driver_id: "driver_rajesh", timestamp: "2026-06-28T04:20:00Z", ear_value: 0.22, duration_seconds: 5, severity: "caution" },
      { id: "fe_3", driver_id: "driver_amit", timestamp: "2026-06-29T23:45:00Z", ear_value: 0.15, duration_seconds: 18, severity: "critical" }
    ];
    this.data = {
      organizations: orgs,
      users,
      vehicles,
      fault_reports: mockReports,
      fleet_alerts,
      service_centers,
      fatigue_events,
      sos_alerts: [],
      scheduled_services: []
    };
    this.save();
    console.log("Database successfully seeded.");
  }
  // Organizations API
  getOrganizations() {
    return this.data.organizations;
  }
  createOrganization(org) {
    if (!this.data.organizations.find((o) => o.id === org.id)) {
      this.data.organizations.push(org);
    }
    this.asyncWrite("organizations", "insert", null, org);
    this.save();
    return org;
  }
  // Users API
  getUsers() {
    return this.data.users;
  }
  createUser(user, passwordText) {
    const id = "user_" + Math.random().toString(36).substring(2, 9);
    const password_hash = hashPassword(passwordText);
    const created_at = (/* @__PURE__ */ new Date()).toISOString();
    const newUser = { ...user, id, password_hash, created_at };
    this.data.users.push(newUser);
    this.save();
    this.asyncWrite("users", "insert", void 0, newUser);
    return newUser;
  }
  authenticate(phone, passwordText) {
    const hash = hashPassword(passwordText);
    const user = this.data.users.find((u) => u.phone === phone && u.password_hash === hash);
    return user || null;
  }
  // Vehicles API
  getVehicles(orgId) {
    return this.data.vehicles.filter((v) => v.org_id === orgId);
  }
  addVehicle(vehicle) {
    const id = "veh_" + Math.random().toString(36).substring(2, 9);
    const newVehicle = { ...vehicle, id };
    this.data.vehicles.push(newVehicle);
    this.save();
    this.asyncWrite("vehicles", "insert", void 0, newVehicle);
    return newVehicle;
  }
  updateVehicle(id, updates) {
    const v = this.data.vehicles.find((item) => item.id === id);
    if (!v) return null;
    Object.assign(v, updates);
    this.save();
    this.asyncWrite("vehicles", "update", { id }, updates);
    return v;
  }
  deleteVehicle(id) {
    const index = this.data.vehicles.findIndex((v) => v.id === id);
    if (index === -1) return false;
    this.data.vehicles.splice(index, 1);
    this.save();
    this.asyncWrite("vehicles", "delete", { id });
    return true;
  }
  // Fault Reports API
  getFaultReports(orgId) {
    const vehicles = this.getVehicles(orgId);
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
    const userMap = new Map(this.data.users.map((u) => [u.id, u]));
    const reports = this.data.fault_reports.filter((r) => vehicleMap.has(r.vehicle_id));
    return reports.map((r) => {
      const v = vehicleMap.get(r.vehicle_id);
      const d = userMap.get(r.driver_id);
      return {
        ...r,
        vehicle_reg: v ? v.registration_number : void 0,
        driver_name: d ? d.name : void 0
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  getDriverFaultReports(driverId) {
    return this.data.fault_reports.filter((r) => r.driver_id === driverId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  addFaultReport(report) {
    const id = "rep_" + Math.random().toString(36).substring(2, 9);
    const newReport = { ...report, id };
    this.data.fault_reports.push(newReport);
    this.save();
    this.asyncWrite("fault_reports", "insert", void 0, newReport);
    this.checkAndGeneratePatternAlerts();
    return newReport;
  }
  // Fleet Alerts API
  addSosAlert(org_id, reason) {
    const newAlert = {
      id: "sos_" + Math.random().toString(36).substring(2, 9),
      org_id,
      pattern_description: "SOS EMERGENCY ALERT: " + reason,
      related_fault_report_ids: [],
      resolved: false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.fleet_alerts.unshift(newAlert);
    this.save();
    this.asyncWrite("fleet_alerts", "insert", void 0, newAlert);
    return newAlert;
  }
  getFleetAlerts(orgId) {
    return this.data.fleet_alerts.filter((a) => a.org_id === orgId);
  }
  resolveFleetAlert(id) {
    const alert = this.data.fleet_alerts.find((a) => a.id === id);
    if (!alert) return false;
    alert.resolved = true;
    this.save();
    this.asyncWrite("fleet_alerts", "update", { id }, { resolved: true });
    return true;
  }
  // Service Centers API
  getServiceCenters() {
    return this.data.service_centers;
  }
  // Fatigue Events API
  getFatigueEvents(orgId) {
    const userMap = new Map(this.data.users.map((u) => [u.id, u]));
    const vehicleMap = new Map(this.data.vehicles.map((v) => [v.assigned_driver_id, v]));
    const orgDrivers = new Set(this.data.users.filter((u) => u.org_id === orgId && u.role === "driver").map((u) => u.id));
    return this.data.fatigue_events.filter((fe) => orgDrivers.has(fe.driver_id)).map((fe) => {
      const d = userMap.get(fe.driver_id);
      const v = vehicleMap.get(fe.driver_id);
      return {
        ...fe,
        driver_name: d ? d.name : void 0,
        vehicle_reg: v ? v.registration_number : void 0
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  addFatigueEvent(event) {
    const id = "fe_" + Math.random().toString(36).substring(2, 9);
    const newEvent = { ...event, id };
    this.data.fatigue_events.push(newEvent);
    this.save();
    this.asyncWrite("fatigue_events", "insert", void 0, newEvent);
    return newEvent;
  }
  // Fleet Pattern Detection (Relational grouping logic)
  // Groups similar diagnosis texts / symptoms within a 48 hour window for vehicles of same org
  checkAndGeneratePatternAlerts() {
    console.log("Running cross-vehicle Fleet Pattern Detection algorithm...");
    const orgs = this.getOrganizations();
    for (const org of orgs) {
      const reports = this.data.fault_reports.filter((r) => {
        const v = this.data.vehicles.find((veh) => veh.id === r.vehicle_id);
        return v && v.org_id === org.id;
      });
      const now = /* @__PURE__ */ new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1e3);
      const recentReports = reports.filter((r) => new Date(r.timestamp) >= fortyEightHoursAgo);
      const keywords = ["injector", "break", "clutch", "radiator", "suspension", "power steering", "air pressure", "leak", "turbo", "battery", "smoke"];
      for (const keyword of keywords) {
        const matched = recentReports.filter(
          (r) => r.symptom_text_english.toLowerCase().includes(keyword) || r.diagnosis.toLowerCase().includes(keyword)
        );
        const distinctVehicles = new Set(matched.map((r) => r.vehicle_id));
        if (distinctVehicles.size >= 2) {
          const matchedIds = matched.map((m) => m.id).sort();
          const alertExists = this.data.fleet_alerts.some(
            (alert) => alert.org_id === org.id && alert.related_fault_report_ids.length === matchedIds.length && [...alert.related_fault_report_ids].sort().every((v, i) => v === matchedIds[i])
          );
          if (!alertExists) {
            const vehiclesList = matched.map((m) => {
              const v = this.data.vehicles.find((veh) => veh.id === m.vehicle_id);
              return v ? `${v.make} ${v.model} (${v.registration_number})` : "Vehicle";
            }).filter((v, i, self) => self.indexOf(v) === i);
            const pattern_description = `Pattern detected: Multi-vehicle issue related to "${keyword}" affecting ${vehiclesList.join(" and ")} within 48 hours. Potential localized environmental, routing, or fuel-adulteration trigger.`;
            const newAlert = {
              id: "alert_" + Math.random().toString(36).substring(2, 9),
              org_id: org.id,
              pattern_description,
              related_fault_report_ids: matched.map((m) => m.id),
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              resolved: false
            };
            this.data.fleet_alerts.push(newAlert);
            this.asyncWrite("fleet_alerts", "insert", void 0, newAlert);
            console.log(`NEW FLEET PATTERN ALERT CREATED: ${pattern_description}`);
          }
        }
      }
    }
    this.save();
  }
  // SOS Alerts API
  getSosAlerts(orgId) {
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    return this.data.sos_alerts.filter((a) => a.org_id === orgId);
  }
  addSosAlertRecord(alert) {
    const id = "sos_" + Math.random().toString(36).substring(2, 9);
    const newAlert = { ...alert, id };
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    this.data.sos_alerts.push(newAlert);
    this.save();
    this.asyncWrite("sos_alerts", "insert", void 0, newAlert);
    return newAlert;
  }
  resolveSosAlert(id) {
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    const alert = this.data.sos_alerts.find((a) => a.id === id);
    if (!alert) return false;
    alert.status = "RESOLVED";
    this.save();
    this.asyncWrite("sos_alerts", "update", { id }, { status: "RESOLVED" });
    return true;
  }
  getScheduledServices(orgId) {
    return (this.data.scheduled_services || []).filter((s) => s.org_id === orgId);
  }
  addScheduledService(service) {
    if (!this.data.scheduled_services) this.data.scheduled_services = [];
    service.id = "svc_" + Date.now();
    this.data.scheduled_services.push(service);
    this.save();
  }
};
var db = new Database();

// server/faultKnowledgeBase.ts
var faultKnowledgeBase = [
  {
    id: "kb_00",
    symptom_hindi: "\u092F\u0939 \u0935\u093E\u0939\u0928 \u0915\u0940 \u0916\u0930\u093E\u092C\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948, \u092F\u0939 \u090F\u0915 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092A\u094D\u0930\u0936\u094D\u0928 \u0939\u0948 (\u0938\u094D\u0925\u093E\u0928, \u0905\u092D\u093F\u0935\u093E\u0926\u0928, \u0906\u0926\u093F)\u0964",
    symptom_english: "This is not a vehicle fault, it is a general question (locations, greetings, etc.).",
    likely_causes: ["General inquiry", "Location search", "Chat"],
    severity: "drive",
    typical_cost_range: "N/A",
    vehicle_types: ["All"],
    recommended_action: "\u0907\u0938 \u0938\u0935\u093E\u0932 \u0915\u093E \u091C\u0935\u093E\u092C \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u0943\u092A\u092F\u093E \u0915\u094B-\u092A\u093E\u092F\u0932\u091F \u091A\u0948\u091F \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964 (Please use the Copilot chat to answer this question.)",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_01",
    symptom_hindi: "Gaadi ka engine band ho raha hai baar baar, thoda kaala dhua bhi aa raha hai",
    symptom_english: "The engine stalls repeatedly, and some black smoke is coming out",
    likely_causes: ["Fuel Injector clogging", "Fuel pump calibration issue", "EGR valve stuck open", "Clogged Air Filter"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B98,000 - \u20B922,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Immediately park the vehicle safely. Do not restart the engine. Check the fuel lines, injector nozzles, and air intake. A technician needs to inspect the common rail injection pressure.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_02",
    symptom_hindi: "Break dabaane par cheekhney ki tez aawaz aa rahi hai aur pedal kaanp raha hai",
    symptom_english: "High-pitched squealing noise when applying brakes, and the brake pedal vibrates",
    likely_causes: ["Worn brake pads (metal-on-metal)", "Warped brake rotors", "Caliper pin seizure"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B93,500 - \u20B99,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Brake system integrity compromised. Replace brake pads and inspect/resurface brake discs immediately. Driving with worn pads can lead to complete braking failure.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_03",
    symptom_hindi: "Engine se lagatar khat-khat ki aawaz aa rahi hai, speed badhne par aawaz tez hoti hai",
    symptom_english: "Continuous metallic knocking noise from engine, getting louder as speed increases",
    likely_causes: ["Connecting rod bearing wear", "Piston slap", "Low oil pressure causing valve tapping"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B925,000 - \u20B965,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Turn off engine immediately. Internal mechanical damage in progress. Inspect oil level; if oil is low, fill and check if noise persists. Do not tow or drive; call a recovery crane.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_04",
    symptom_hindi: "Silencer se neela dhua nikal raha hai aur engine thoda thoda jhatka le raha hai",
    symptom_english: "Blue smoke coming from exhaust, and the engine is misfiring or sputtering",
    likely_causes: ["Piston ring wear leading to oil burning", "Valve stem seal failure", "Turbocharger seal leak"],
    severity: "caution",
    typical_cost_range: "\u20B915,000 - \u20B940,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Engine is burning engine oil. Monitor the oil level closely. Avoid high speeds and heavy payloads. Schedule an engine head compression test and turbo charger inspection.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_05",
    symptom_hindi: "Engine temperature gauge poora laal pe chala gaya hai, bonnet se bhaap nikal rahi hai",
    symptom_english: "Engine temperature gauge has reached the red line, steam is coming from the hood",
    likely_causes: ["Coolant leak / radiator puncture", "Thermostat valve failure", "Radiator fan belt broken", "Water pump failure"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,500 - \u20B912,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Pull over immediately. Do not open the radiator cap while hot (risk of severe burns). Wait for engine to cool (30 mins), check coolant reservoir, refill with clean water/coolant, check for visible hose leaks.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_06",
    symptom_hindi: "Gear badalne me bohot dikkat ho rahi hai, clutch dabaane par bhi gear fas raha hai",
    symptom_english: "Difficult to shift gears, gear gets stuck even when clutch pedal is fully pressed",
    likely_causes: ["Clutch master or slave cylinder leak", "Worn clutch pressure plate", "Gearbox synchronizer ring wear"],
    severity: "caution",
    typical_cost_range: "\u20B96,000 - \u20B918,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Check clutch fluid level in the reservoir. If empty, refill and pump clutch. Drive cautiously in a single gear to the nearest service center. Gearbox internal wear may occur if gears are forced.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_07",
    symptom_hindi: "Steering wheel bohot bhari ho gaya hai, dhumane par cheen-cheen ki aawaz aati hai",
    symptom_english: "Steering wheel feels extremely heavy, squeals when turning fully",
    likely_causes: ["Power steering fluid leak", "Power steering pump failure", "Serpentine belt loose or broken"],
    severity: "caution",
    typical_cost_range: "\u20B91,800 - \u20B97,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Inspect power steering oil reservoir. Top up immediately. Inspect the auxiliary drive belt for cracks or tension. Drive slowly as steering effort is high, especially at slow turns.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_08",
    symptom_hindi: "Acceleration dabaane par gurgur ki aawaz aati hai aur power nahi mil rahi hai",
    symptom_english: "Sputtering/gurgling noise on acceleration, accompanied by severe loss of power",
    likely_causes: ["Turbocharger hose pipe loose/cracked", "Intercooler leak", "Mass Air Flow (MAF) sensor fault"],
    severity: "caution",
    typical_cost_range: "\u20B93,000 - \u20B915,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Check the large black rubber hoses connected to the turbocharger and intercooler. Secure any loose clamps. Avoid hard acceleration to prevent further turbo damage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_09",
    symptom_hindi: "Subah ke time gaadi start nahi ho rahi, self lene par thik-thik-thik aawaz aati hai",
    symptom_english: "Vehicle won't start in the morning, makes rapid clicking sound when turning key",
    likely_causes: ["Discharged or dead battery", "Corroded battery terminals", "Alternator failing to charge battery"],
    severity: "drive",
    typical_cost_range: "\u20B91,000 - \u20B98,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Battery charge is too low to crank. Check terminal connections for white powder/rust, clean with warm water. Try jump-starting from another vehicle or recharge battery. Check alternator voltage when started.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_10",
    symptom_hindi: "Cabin me bohot tez vibration ho raha hai jab gaadi idle khadi hoti hai",
    symptom_english: "Severe cabin vibration when the vehicle is idling at a standstill",
    likely_causes: ["Worn or broken engine mounting rubber", "Engine misfiring at low RPM", "Damaged balancer shaft"],
    severity: "caution",
    typical_cost_range: "\u20B94,000 - \u20B912,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Drive to the nearest depot. Avoid idling for long periods. Inspect the main engine mounting bolts and rubber pads. Replace worn mountings to prevent exhaust and drive-shaft misalignment.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_11",
    symptom_hindi: "Daudne me piche se dhum-dhum ki tez aawaz aa rahi hai aur piche ka axle garam ho raha hai",
    symptom_english: "Loud humming noise from rear axle while driving, and differential housing is hot",
    likely_causes: ["Lack of differential gear oil", "Worn crown wheel or pinion bearing", "Differential gear damage"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B98,000 - \u20B928,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Stop and inspect rear differential housing for active oil leaks. Running dry will seize the rear axle, locking the wheels at high speed. Add differential oil (EP-90) immediately or call a mobile mechanic.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_12",
    symptom_hindi: "Engine se seeti jaisi tez aawaz aa rahi hai jab turbo badhta hai",
    symptom_english: "Loud high-pitched whistling/screeching noise from engine when turbo boosts",
    likely_causes: ["Turbocharger rotor bearing failure", "Manifold gasket leak", "Cracked exhaust pipe before turbo"],
    severity: "caution",
    typical_cost_range: "\u20B912,000 - \u20B935,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Mahindra Blazo"],
    recommended_action: "Inspect the turbocharger inlet compressor wheel for play or damage. Avoid high engine RPM. Do not let debris enter the air intake. Plan a turbocharger replacement/repair soon.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_13",
    symptom_hindi: "Gaadi ek taraf khinch rahi hai aur front tyre ek side se jaldi ghis raha hai",
    symptom_english: "Vehicle pulls strongly to one side, and front tyre is wearing unevenly on one edge",
    likely_causes: ["Incorrect wheel alignment (Toe-in/Toe-out)", "Worn tie rod ends or ball joints", "Unequal tyre pressure"],
    severity: "drive",
    typical_cost_range: "\u20B91,500 - \u20B95,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Correct tyre inflation pressures. Check for play in steering linkages. Take the vehicle for dynamic wheel alignment and balance at the next terminal stop. Replacing steering linkages may be required.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_14",
    symptom_hindi: "Dashboard par Air Pressure low alarm baj raha hai aur brake lagane me zyada time lag raha hai",
    symptom_english: "Low Air Pressure alarm buzzing on dashboard, brakes responding slowly",
    likely_causes: ["Air compressor line leak", "Punctured air reservoir or dual brake valve leak", "Unloader valve stuck open"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B94,500 - \u20B916,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "CRITICAL SAFETY RISK. Air brake pressure must be above 6 bar for brakes to function safely. Stop vehicle immediately. Listen for active air leaks (hissing sound) near the chassis and pneumatic tanks. Call emergency service.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_15",
    symptom_hindi: "Engine ka oil check karne par oil safed chipchipa dahi jaisa dikh raha hai",
    symptom_english: "Engine oil looks milky white, thick, like curd when checked on the dipstick",
    likely_causes: ["Blown head gasket", "Cracked engine block or cylinder head", "Oil cooler core leakage"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B918,000 - \u20B945,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Do not start or run the engine. Coolant is mixing with engine oil, which destroys the lubrication properties and will ruin bearings instantly. Tow the vehicle to a major repair shop immediately.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_16",
    symptom_hindi: "Fuel tank ke paas se diesel tapak raha hai aur cabin me smell aa rahi hai",
    symptom_english: "Diesel is dripping from near the fuel tank, strong diesel smell inside the cabin",
    likely_causes: ["Fuel tank puncture/rust", "Cracked fuel return line", "Loose fuel filter casing"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,000 - \u20B912,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Extremely high fire hazard. Stop the engine. Clean spilled fuel. Trace leakage near the primary fuel filter or return hose. Tighten filter cap or temporarily patch tank puncture with soap/chemical sealant before repair.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_17",
    symptom_hindi: "Clutch dabaane par lagatar ghargharat ki tez aawaz aa rahi hai",
    symptom_english: "Grinding/squealing noise when pressing the clutch pedal, goes away when released",
    likely_causes: ["Worn clutch release bearing (throw-out bearing)", "Pilot bearing failure", "Bent clutch release fork"],
    severity: "caution",
    typical_cost_range: "\u20B94,500 - \u20B911,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "The clutch release bearing is failing. Avoid holding the clutch pedal pressed at traffic lights or during stops (shift to neutral). Plan to replace the clutch kit (bearing, pressure plate, and friction disc) soon.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_18",
    symptom_hindi: "Engine start hone par alternator warning light jal rahi hai aur headlight bohot dheemi hai",
    symptom_english: "Alternator warning light stays on when engine runs, headlights are dim",
    likely_causes: ["Alternator drive belt slipped/broken", "Worn alternator carbon brushes or internal regulator fault", "Loose wiring harness connector"],
    severity: "caution",
    typical_cost_range: "\u20B93,000 - \u20B910,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "The battery is not charging. Minimize electrical load (turn off cabin fans, extra lights). Drive straight to an auto electrician. If the alternator belt is broken, it might also run the water pump - check temperature gauge!",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_19",
    symptom_hindi: "Gaadi dhumane par tyre ke side se khat-khat ki aawaz aati hai",
    symptom_english: "Knocking/clicking sound from wheels when making sharp turns",
    likely_causes: ["Worn CV joint (for front wheel drives)", "Damaged kingpin / steering knuckle bearing", "Loose wheel nuts"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,500 - \u20B98,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost"],
    recommended_action: "Check wheel nuts immediately to ensure the wheel is secure. If wheel nuts are tight, inspect steering knuckle and joint boots. Worn joints can break and cause wheel detachment.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_20",
    symptom_hindi: "Exhaust se bohot tez safed dhua nikal raha hai jisme mithi sweet smell hai",
    symptom_english: "Thick white smoke with a sweet smell coming from the exhaust pipe",
    likely_causes: ["Coolant entering combustion chamber", "Head gasket failure", "EGR cooler internal leak"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B912,000 - \u20B935,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Coolant is leaking into cylinders. Do not drive as it can cause hydrostatic lock (hydrolock), which completely destroys the engine block. Check coolant levels and tow the truck to a service center.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_21",
    symptom_hindi: "Gear lever bohot dheela hai aur gear engage karne par bhi neutral ho jata hai",
    symptom_english: "Gear lever feels extremely loose, jumps back into neutral on its own",
    likely_causes: ["Broken gear shifting cable or linkage bushing", "Synchro mesh teeth worn out", "Weak detent spring in gearbox"],
    severity: "caution",
    typical_cost_range: "\u20B92,500 - \u20B912,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Inspect gear shifter linkages under the cabin. bushings can easily be replaced. Avoid holding the gear lever in place forcibly while driving as it wears out shift forks rapidly.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_22",
    symptom_hindi: "Suspension se dhum-dhum aawaz aati hai jab gaadi gaddho me jati hai",
    symptom_english: "Thudding noise from suspension when going over potholes/bumps",
    likely_causes: ["Leaf spring bush wear", "Damaged shock absorbers", "Broken center bolt of leaf spring pack"],
    severity: "caution",
    typical_cost_range: "\u20B93,500 - \u20B914,000",
    vehicle_types: ["Tata Signa", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Ace"],
    recommended_action: "Inspect the leaf spring assemblies on both axles for broken plates or dislodged center bolts. Do not overload the vehicle. Drive slowly over bumps to prevent structural frame damage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_23",
    symptom_hindi: "Engine start hone me bohot lamba self le raha hai aur acceleration dheemi hai",
    symptom_english: "Engine takes a very long time to start (long crank), sluggish acceleration",
    likely_causes: ["Low rail pressure in CRDI system", "Clogged fuel filter", "Glow plug failure (cold start only)", "Weak starter motor"],
    severity: "caution",
    typical_cost_range: "\u20B94,000 - \u20B918,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Replace fuel filters (both primary sedimenter and secondary paper filter). Bleed the fuel system to remove any trapped air. Check starting battery cranking voltage.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_24",
    symptom_hindi: "Exhaust pipe se teekhi aawaz aa rahi hai jaise hawa leak ho rahi ho",
    symptom_english: "Hissing or leaking air sound from the exhaust manifold area",
    likely_causes: ["Exhaust manifold gasket leak", "Cracked exhaust manifold", "Loose turbo outlet pipe flange"],
    severity: "drive",
    typical_cost_range: "\u20B91,500 - \u20B96,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Exhaust gases are escaping before the muffler. Can cause high cabin soot/CO levels. Drive with windows cracked open. Schedule manifold bolt tightening and gasket replacement.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_25",
    symptom_hindi: "Tyre ke paas se grease tapak raha hai aur drum bohot garam ho gaya hai",
    symptom_english: "Grease leaking from wheel hub, and brake drum is extremely hot to touch",
    likely_causes: ["Wheel bearing grease seal failure", "Worn wheel bearings", "Brake shoe lining binding (stuck brake)"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,500 - \u20B98,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Stop immediately. The wheel bearing is dry and running hot, or the brakes are jammed. Continuing to drive will lead to weld-seizure of the hub, which can shear the wheel spindle off the axle. Call recovery.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_26",
    symptom_hindi: "DPF/AdBlue filter dashboard light blink kar rahi hai aur speed limit lag gayi hai",
    symptom_english: "DPF warning light is blinking, and engine is in limp/de-rated mode with speed limit",
    likely_causes: ["DPF soot accumulation", "AdBlue (DEF) injector failure", "Quality of diesel exhaust fluid is poor"],
    severity: "caution",
    typical_cost_range: "\u20B95,000 - \u20B925,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Exhaust system needs soot regeneration. If possible, run the vehicle at a high speed (above 50 km/h) for 30 minutes to trigger passive regeneration, or perform parked DPF manual regeneration via diagnostic tool.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_27",
    symptom_hindi: "Engine start karte hi kharkharahat ki aawaz aati hai aur key chhodne par bhi aawaz rehti hai",
    symptom_english: "Loud rattling/grinding noise immediately upon starter crank, persists after key release",
    likely_causes: ["Starter motor starter gear pinion sticking", "Damaged flywheel ring gear teeth", "Starter solenoid failure"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B93,500 - \u20B911,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Turn off battery isolator key immediately. The starter pinion is staying engaged with the rotating flywheel, which will spin the starter to destruction and can cause starter motor wiring fire. Tap starter or call auto electrician.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_28",
    symptom_hindi: "Cabin me thanda hawa nahi aa rahi, AC compressor se lagatar cheekhney ki aawaz hai",
    symptom_english: "AC cabin vents blowing warm air, screeching sound from AC compressor area",
    likely_causes: ["AC compressor clutch bearing failure", "Low refrigerant charge causing compressor drag", "Drive belt slipping"],
    severity: "drive",
    typical_cost_range: "\u20B92,000 - \u20B915,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Mahindra Blazo"],
    recommended_action: "Turn off the AC switch in the cabin. The compressor bearing or belt is seizing. Turning the AC off disengages the pulley, allowing you to drive safely without snapping the main auxiliary belt.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_29",
    symptom_hindi: "Gaadi upar chadhte samay dhum-dhum karke dhas rahi hai aur cluth slip ho raha hai",
    symptom_english: "Truck struggles to climb inclines, engine revs up but speed doesn't increase (clutch slip)",
    likely_causes: ["Worn out clutch plate friction material", "Oil on clutch lining from rear main seal leak", "Weak pressure plate springs"],
    severity: "caution",
    typical_cost_range: "\u20B98,500 - \u20B924,000",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa", "Tata Prima"],
    recommended_action: "Avoid loading additional weight. Shifting to lower gears earlier on climbs to minimize slip. Avoid half-clutch operations. Plan clutch kit replacement at the nearest transit hub.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_30",
    symptom_hindi: "Air brake pipe se lagatar phis-phis ki aawaz aa rahi hai piche ke tyre ke pass",
    symptom_english: "Continuous air leakage sound (hissing) near rear wheels",
    likely_causes: ["Damaged air brake chamber diaphragm", "Loose hose connection to spring brake valve", "Failed brake chamber seal"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,800 - \u20B97,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Rear spring brakes might lock up unexpectedly while driving. Stop the vehicle safely. Inspect the rubber air hose feeding the rear cylinders. Do not attempt to bypass air brake safety lines.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_31",
    symptom_hindi: "Accelerator chhodne par gaadi me bohot tez jhatka lag raha hai",
    symptom_english: "Severe jerking of vehicle immediately when releasing accelerator pedal",
    likely_causes: ["Worn universal joints (U-joints) in propeller shaft", "Loose engine mountings", "Backlash in differential gears"],
    severity: "caution",
    typical_cost_range: "\u20B93,000 - \u20B99,500",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Crawl under vehicle (with wheels chocked) and shake propeller shaft to feel for play in U-joints. If loose, replace cross pins immediately. Pin failure at high speeds will drop propeller shaft, causing catastrophic rollover.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_32",
    symptom_hindi: "Headlight blink kar rahi hai aur dashboard par sari lights up-down ho rahi hai",
    symptom_english: "Headlights flickering and dashboard instrument cluster dials fluctuating",
    likely_causes: ["Loose or corroded primary chassis ground cable", "Failed voltage regulator on alternator", "Ignition switch wear"],
    severity: "caution",
    typical_cost_range: "\u20B91,200 - \u20B94,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Locate main battery ground strap connected to frame/gearbox. Clean and tighten battery terminals. Check alternator charging output - if voltage spikes above 15V, it can fry electronic control modules (ECUs).",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_33",
    symptom_hindi: "Radiator reserve bottle se coolant ubal kar bahar aa raha hai aur temperature normal hai",
    symptom_english: "Coolant boiling out of reservoir tank but temperature gauge reads normal",
    likely_causes: ["Failed radiator pressure cap", "Blockage in radiator bypass core", "Combustion gases leaking into coolant (head gasket)"],
    severity: "caution",
    typical_cost_range: "\u20B9800 - \u20B914,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Allow engine to cool. Replace radiator cap with correct rating. Check reservoir overflow lines. If coolant bubbles aggressively even when engine is warm but not hot, check for head gasket seal leaks.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_34",
    symptom_hindi: "Front wheels se cheekhney ki lagatar aawaz aa rahi hai jo speed ke sath badhti hai",
    symptom_english: "Continuous squealing/howling noise from front wheels, pitch rises with speed",
    likely_causes: ["Worn wheel hubs / dry bearings", "Brake pad indicator touching rotor", "Warped splash guard scratching rotor"],
    severity: "caution",
    typical_cost_range: "\u20B92,500 - \u20B98,000",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa", "Tata Prima"],
    recommended_action: "Drive to nearest station. Jack up axle and rotate wheel by hand, feeling for roughness or grinding. Dismantle hub, pack with fresh high-temperature grease or replace damaged bearings.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_35",
    symptom_hindi: "Clutch dabaane par pedal floor se chipak gaya hai aur upar nahi aa raha",
    symptom_english: "Clutch pedal feels completely spongy and sticks to the floor, won't return",
    likely_causes: ["Friction seal blow-by in master cylinder", "Clutch fluid lines burst", "Helper spring broken"],
    severity: "stop_immediately",
    typical_cost_range: "\u20B92,000 - \u20B96,500",
    vehicle_types: ["Tata Ace", "Ashok Leyland Dost", "Mahindra Bolero Maxx", "Tata Signa"],
    recommended_action: "Do not attempt to shift gears forcibly. Turn off engine. Check reservoir, check for fluid leak under the transmission. Bleed hydraulic cylinder after replacing seals/hoses. Towing may be necessary.",
    acoustic_signal_class: "normal"
  },
  {
    id: "kb_36",
    symptom_hindi: "Engine chalne par silencer se tej tik-tik ki aawaz aa rahi hai jaise chote pathar takra rahe ho",
    symptom_english: "Tapping/clicking noise from exhaust, sounds like small stones hitting metal",
    likely_causes: ["Broken ceramic honeycomb in catalytic converter/DPF", "Loose exhaust heat shield clamping", "Broken internal muffler baffles"],
    severity: "drive",
    typical_cost_range: "\u20B91,500 - \u20B918,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Inspect the mechanical condition of exhaust pipes, catalytic housing, and brackets. If internal catalyst matrix is broken, exhaust back-pressure may build up, lowering fuel mileage.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_37",
    symptom_hindi: "Fuel injection pump ke paas se tez khat-khat ki aawaz aa rahi hai aur idle unsteady hai",
    symptom_english: "Loud clicking/metallic rattling noise from fuel injection pump, uneven idling",
    likely_causes: ["FIP plunger wear", "Internal fuel distributor timing misalignment", "Air lock in fuel rail"],
    severity: "caution",
    typical_cost_range: "\u20B912,000 - \u20B938,000",
    vehicle_types: ["Tata Prima", "Tata Signa", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Diesel fuel injection pressure is highly critical. Do not open fuel pipes while started (high-pressure skin penetration hazard). Run engine timing diagnostics at workshop.",
    acoustic_signal_class: "knock"
  },
  {
    id: "kb_38",
    symptom_hindi: "Chassis ke niche se ghun-ghun ki aawaz aa rahi hai jab overdrive me daudte hai",
    symptom_english: "Whining/droning noise from center of chassis when driving at high gears",
    likely_causes: ["Propeller shaft center support bearing worn/dry", "Misaligned transmission tail-shaft", "Universal joint dry of grease"],
    severity: "caution",
    typical_cost_range: "\u20B92,200 - \u20B97,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "Center bearing rubber cushion may have disintegrated. Plan to replace the propeller shaft center bearing. Grease all cross joints with chassis grease.",
    acoustic_signal_class: "squeal"
  },
  {
    id: "kb_39",
    symptom_hindi: "Power brake exhaust valve se dhum-dhum karke jhatke lag rahe hai aur pressure nahi badh raha",
    symptom_english: "Brake system compressor cycling too frequently with rapid exhaust spurts",
    likely_causes: ["Clogged air dryer cartridge", "Unloader valve assembly gummed up/faulty", "Severe leakage down-circuit"],
    severity: "caution",
    typical_cost_range: "\u20B92,500 - \u20B98,000",
    vehicle_types: ["Tata Signa", "Tata Prima", "Ashok Leyland U-Truck", "Mahindra Blazo"],
    recommended_action: "The air dryer system is overloaded or leaking. Drain moisture manually from reservoir tanks using drain valves (pull cables). Replace desiccant dryer filter cartridge soon.",
    acoustic_signal_class: "misfire"
  },
  {
    id: "kb_40",
    symptom_hindi: "Gaadi jab thandi rehti hai tab start hone me bohot jhatka khati hai, safed smoke ata hai",
    symptom_english: "Engine shakes heavily and releases white smoke only when cold starting",
    likely_causes: ["Defective cylinder glow plugs", "Incorrect fuel injection cold-start timing", "Low cylinder head compression"],
    severity: "drive",
    typical_cost_range: "\u20B92,000 - \u20B99,500",
    vehicle_types: ["Tata Ace", "Mahindra Bolero Maxx", "Ashok Leyland Dost", "Tata Signa"],
    recommended_action: "Verify that the glow plug pre-heater light on dashboard turns off before cranking. Replace any non-functional heater plugs. If issue persists, check starter motor rotation speed.",
    acoustic_signal_class: "misfire"
  }
];

// server.ts
var import_genai = require("@google/genai");

// server/langgraph-agents.ts
var import_langgraph = require("@langchain/langgraph");
var import_google_genai = require("@langchain/google-genai");
var import_messages = require("@langchain/core/messages");
var GraphState = import_langgraph.Annotation.Root({
  symptom_hindi: (0, import_langgraph.Annotation)(),
  acoustic_signal: (0, import_langgraph.Annotation)(),
  kb_matches: (0, import_langgraph.Annotation)(),
  image_base64: (0, import_langgraph.Annotation)(),
  // Populated by agents
  symptom_english: (0, import_langgraph.Annotation)(),
  diagnosis: (0, import_langgraph.Annotation)(),
  severity: (0, import_langgraph.Annotation)(),
  recommended_action: (0, import_langgraph.Annotation)(),
  estimated_cost_range: (0, import_langgraph.Annotation)(),
  agent_trace: (0, import_langgraph.Annotation)({
    reducer: (state, update) => ({ ...state, ...update }),
    default: () => ({})
  })
});
var parseJSON = (text) => {
  try {
    return JSON.parse(text.replace(/```json|```/gi, "").trim());
  } catch (e) {
    console.error("Failed to parse JSON from LLM:", text);
    return {};
  }
};
var supervisorAgent = async (state) => {
  const model = new import_google_genai.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 500
  });
  const res = await model.invoke([
    new import_messages.SystemMessage(`You are the Supervisor Agent of VahanAI. 
      Translate the driver's Hindi symptom to English and outline the diagnostic strategy. 
      Return ONLY a JSON object: { "english_translation": "string", "strategy_notes": "string" }`),
    new import_messages.HumanMessage(`Hindi Symptom: ${state.symptom_hindi}`)
  ]);
  const parsed = parseJSON(res.content.toString());
  return {
    symptom_english: parsed.english_translation || "Translation failed",
    agent_trace: { SupervisorAgent: parsed.strategy_notes || "Routing handled." }
  };
};
var diagnosticAgent = async (state) => {
  const model = new import_google_genai.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 800
  });
  const kbCtx = JSON.stringify(state.kb_matches);
  const prompt = `You are the Diagnostic Agent. 
    Based on the symptom: "${state.symptom_hindi}", acoustic signal: "${state.acoustic_signal}", and local RAG context: ${kbCtx}. 
    Provide a precise engineering diagnosis strictly in Devanagari Hindi. 
    IMPORTANT: If the symptom is a general query (like asking for locations, service centers, greetings) and NOT a vehicle fault, set diagnosis to '\u092F\u0939 \u090F\u0915 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092A\u094D\u0930\u0936\u094D\u0928 \u0939\u0948, \u0935\u093E\u0939\u0928 \u0915\u0940 \u0916\u0930\u093E\u092C\u0940 \u0928\u0939\u0940\u0902' (This is a general question, not a vehicle fault).
    Return ONLY a JSON object: { "diagnosis": "string", "reasoning": "string" }`;
  let contentMsg = prompt;
  if (state.image_base64) {
    contentMsg = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: state.image_base64 }
    ];
  }
  const res = await model.invoke([new import_messages.HumanMessage({ content: contentMsg })]);
  const parsed = parseJSON(res.content.toString());
  return {
    diagnosis: parsed.diagnosis || "\u0905\u091C\u094D\u091E\u093E\u0924 \u0924\u0915\u0928\u0940\u0915\u0940 \u0938\u092E\u0938\u094D\u092F\u093E\u0964 (Unknown technical issue.)",
    agent_trace: { DiagnosticAgent: parsed.reasoning || "Diagnostic theory applied." }
  };
};
var triageAgent = async (state) => {
  const model = new import_google_genai.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 400
  });
  const prompt = `You are the Triage Agent. 
    Given the diagnosis: "${state.diagnosis}". 
    Establish road safety severity. Must be exactly one of: "drive", "caution", or "stop_immediately". 
    IMPORTANT: If the diagnosis indicates it is not a vehicle fault, ALWAYS return "drive".
    Return ONLY a JSON object: { "severity": "string", "reasoning": "string" }`;
  const res = await model.invoke([new import_messages.HumanMessage(prompt)]);
  const parsed = parseJSON(res.content.toString());
  const sev = ["drive", "caution", "stop_immediately"].includes(parsed.severity) ? parsed.severity : "caution";
  return {
    severity: sev,
    agent_trace: { TriageAgent: parsed.reasoning || `Severity assessed as ${sev}` }
  };
};
var maintenanceAgent = async (state) => {
  const model = new import_google_genai.ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    maxOutputTokens: 800
  });
  const prompt = `You are the Maintenance Agent. 
    Given diagnosis: "${state.diagnosis}". 
    Outline actionable roadside instructions strictly in Devanagari Hindi. 
    IMPORTANT: If the diagnosis indicates it is a general question or not a vehicle fault, just reply conversationally to their question in Devanagari Hindi instead of giving maintenance steps, and set cost to "N/A".
    Also estimate repair cost in Indian Rupees (e.g. \u20B95,000 - \u20B910,000) or "N/A".
    Return ONLY a JSON object: { "recommended_action": "string", "estimated_cost_range": "string", "reasoning": "string" }`;
  const res = await model.invoke([new import_messages.HumanMessage(prompt)]);
  const parsed = parseJSON(res.content.toString());
  return {
    recommended_action: parsed.recommended_action || "\u0915\u0943\u092A\u092F\u093E \u0928\u091C\u0926\u0940\u0915\u0940 \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964",
    estimated_cost_range: parsed.estimated_cost_range || "N/A",
    agent_trace: { MaintenanceAgent: parsed.reasoning || "Maintenance protocol drafted." }
  };
};
var reportAgent = async (state) => {
  return {
    agent_trace: { ReportAgent: "Compiled structured diagnostic workflow from LangGraph agents successfully." }
  };
};
var builder = new import_langgraph.StateGraph(GraphState).addNode("supervisor", supervisorAgent).addNode("diagnostic", diagnosticAgent).addNode("triage", triageAgent).addNode("maintenance", maintenanceAgent).addNode("report", reportAgent).addEdge(import_langgraph.START, "supervisor").addEdge("supervisor", "diagnostic").addEdge("diagnostic", "triage").addEdge("triage", "maintenance").addEdge("maintenance", "report").addEdge("report", import_langgraph.END);
var diagnosticGraph = builder.compile();

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "10mb" }));
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not set or using placeholder. AI features will fallback to local RAG heuristic.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var STOP_WORDS = /* @__PURE__ */ new Set([
  "hai",
  "aur",
  "ko",
  "ka",
  "se",
  "mein",
  "ki",
  "bhi",
  "ho",
  "raha",
  "rah",
  "ke",
  "par",
  "hi",
  "yaar",
  "bhai",
  "na",
  "ne",
  "kar",
  "kya",
  "is",
  "the",
  "and",
  "to",
  "for",
  "with",
  "from",
  "in",
  "on",
  "at",
  "it",
  "this",
  "that",
  "of",
  "an",
  "are",
  "was",
  "were",
  "be",
  "been",
  "\u0939\u0948",
  "\u0914\u0930",
  "\u0915\u094B",
  "\u0915\u093E",
  "\u0938\u0947",
  "\u092E\u0947\u0902",
  "\u0915\u0940",
  "\u092D\u0940",
  "\u0939\u094B",
  "\u0930\u0939\u093E",
  "\u0915\u0947",
  "\u092A\u0930",
  "\u0939\u0940",
  "\u0915\u094D\u092F\u093E",
  "\u0915\u0930"
]);
function expandDevanagariQuery(queryHindi) {
  let expanded = queryHindi.toLowerCase();
  const devanagariMap = {
    "\u0907\u0902\u091C\u0928": "engine",
    "\u0927\u0941\u0906\u0902": "dhua smoke",
    "\u0927\u0941\u0901\u0906": "dhua smoke",
    "\u0927\u0941\u0906": "dhua smoke",
    "\u0917\u0930\u094D\u092E": "garam hot heat temperature",
    "\u0917\u0930\u092E": "garam hot heat temperature",
    "\u0924\u093E\u092A\u092E\u093E\u0928": "temperature",
    "\u0906\u0935\u093E\u091C": "aawaz noise sound",
    "\u0906\u0935\u093E\u091C\u093C": "aawaz noise sound",
    "\u0906\u0935\u093E\u095B": "aawaz noise sound",
    "\u092C\u094D\u0930\u0947\u0915": "break brake",
    "\u0938\u092B\u0947\u0926": "safed white",
    "\u0938\u092B\u093C\u0947\u0926": "safed white",
    "\u0915\u093E\u0932\u093E": "kaala black",
    "\u0928\u0940\u0932\u093E": "neela blue",
    "\u092A\u093E\u0928\u0940": "coolant water paani",
    "\u0924\u0947\u0932": "oil mobil",
    "\u0932\u0940\u0915": "leak",
    "\u091F\u092A\u0915": "tapak dripping leak",
    "\u0915\u094D\u0932\u091A": "clutch",
    "\u0917\u093F\u092F\u0930": "gear",
    "\u091D\u091F\u0915\u093E": "jhatka misfire",
    "\u0916\u091F": "khat knocking knock",
    "\u0938\u0940\u091F\u0940": "seeti whistling squeal",
    "\u0938\u094D\u091F\u093E\u0930\u094D\u091F": "start",
    "\u092C\u0948\u091F\u0930\u0940": "battery",
    "\u0935\u093E\u0907\u092C\u094D\u0930\u0947\u0936\u0928": "vibration"
  };
  Object.entries(devanagariMap).forEach(([dev, eng]) => {
    if (queryHindi.includes(dev)) {
      expanded += " " + eng;
    }
  });
  return expanded;
}
function performRAGLookup(queryHindi, queryEnglish) {
  const expandedHindi = expandDevanagariQuery(queryHindi);
  const query = `${expandedHindi} ${queryEnglish.toLowerCase()}`;
  const keywords = query.split(/[\s,.\-!?]+/).map((w) => w.trim().toLowerCase()).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  if (keywords.length === 0) return [faultKnowledgeBase.find((f) => f.id === "kb_00")];
  const scored = faultKnowledgeBase.map((entry) => {
    let score = 0;
    const targets = [
      entry.symptom_hindi.toLowerCase(),
      entry.symptom_english.toLowerCase(),
      entry.recommended_action.toLowerCase(),
      ...entry.likely_causes.map((c) => c.toLowerCase())
    ];
    keywords.forEach((kw) => {
      targets.forEach((target) => {
        try {
          if (new RegExp("\\\\b" + kw + "\\\\b", "i").test(target)) {
            score += 1;
          }
        } catch (e) {
          if (target.includes(kw)) score += 1;
        }
      });
    });
    return { entry, score };
  });
  const sorted = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.entry);
  return sorted.length > 0 ? sorted.slice(0, 3) : [faultKnowledgeBase.find((f) => f.id === "kb_00")];
}
function translateKnowledgeBaseToHindi(id, defaultDiag, defaultAction) {
  const translations = {
    "kb_01": {
      diagnosis: "\u0915\u0949\u092E\u0928 \u0930\u0947\u0932 \u0907\u0902\u091C\u0947\u0915\u094D\u091F\u0930 \u091C\u093E\u092E \u0939\u094B\u0928\u093E \u092F\u093E \u090F\u092F\u0930 \u092B\u093C\u093F\u0932\u094D\u091F\u0930 \u092C\u094D\u0932\u0949\u0915 \u0939\u094B\u0928\u093E (Common Rail Fuel Injector clogging / Clogged Air Filter)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u0924\u0941\u0930\u0902\u0924 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u091C\u0917\u0939 \u0916\u0921\u093C\u0940 \u0915\u0930\u0947\u0902\u0964\n2. \u090F\u092F\u0930 \u092B\u093F\u0932\u094D\u091F\u0930 \u091A\u0947\u0915 \u0915\u0930\u0947\u0902 \u0915\u093F \u0915\u0939\u0940\u0902 \u092E\u093F\u091F\u094D\u091F\u0940 \u0924\u094B \u0928\u0939\u0940\u0902 \u091C\u092E\u0940 \u0939\u0948\u0964\n3. \u0907\u0902\u091C\u0928 \u0915\u094B \u092C\u093E\u0930-\u092C\u093E\u0930 \u091A\u093E\u0932\u0942 \u0928 \u0915\u0930\u0947\u0902\u0964 \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u092C\u0941\u0932\u093E\u0915\u0930 \u0915\u0949\u092E\u0928 \u0930\u0947\u0932 \u092B\u094D\u092F\u0942\u0932 \u092A\u094D\u0930\u0947\u0936\u0930 \u091A\u0947\u0915 \u0915\u0930\u093E\u090F\u0902\u0964",
      cost: "\u20B98,000 - \u20B922,000"
    },
    "kb_02": {
      diagnosis: "\u092C\u094D\u0930\u0947\u0915 \u092A\u0948\u0921 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0918\u093F\u0938 \u0917\u090F \u0939\u0948\u0902 \u092F\u093E \u092C\u094D\u0930\u0947\u0915 \u0921\u093F\u0938\u094D\u0915 \u0916\u0930\u093E\u092C \u0939\u0948 (Worn brake pads / Warped brake rotors)",
      action: "1. \u092C\u094D\u0930\u0947\u0915 \u0938\u093F\u0938\u094D\u091F\u092E \u0915\u092E\u091C\u094B\u0930 \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964\n2. \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u0917\u0924\u093F \u0915\u092E \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 \u0930\u094B\u0915\u0947\u0902\u0964\n3. \u092C\u094D\u0930\u0947\u0915 \u092A\u0948\u0921 \u0915\u094B \u0924\u0941\u0930\u0902\u0924 \u092C\u0926\u0932\u0935\u093E\u090F\u0902, \u0935\u0930\u0928\u093E \u092C\u094D\u0930\u0947\u0915 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u092B\u0947\u0932 \u0939\u094B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964",
      cost: "\u20B93,500 - \u20B99,000"
    },
    "kb_03": {
      diagnosis: "\u0907\u0902\u091C\u0928 \u0915\u0947 \u0905\u0902\u0926\u0930\u0942\u0928\u0940 \u0939\u093F\u0938\u094D\u0938\u094B\u0902 (Connecting Rod bearing) \u0915\u093E \u0917\u0902\u092D\u0940\u0930 \u0930\u0942\u092A \u0938\u0947 \u0918\u093F\u0938 \u091C\u093E\u0928\u093E",
      action: "1. \u0907\u0902\u091C\u0928 \u0915\u094B \u0924\u0941\u0930\u0902\u0924 \u092C\u0902\u0926 \u0915\u0930\u0947\u0902\u0964\n2. \u092E\u094B\u092C\u093E\u0907\u0932 \u0911\u092F\u0932 \u0932\u0947\u0935\u0932 \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964 \u0905\u0917\u0930 \u0911\u092F\u0932 \u092C\u0939\u0941\u0924 \u0915\u092E \u0939\u0948 \u0924\u094B \u0928\u092F\u093E \u0911\u092F\u0932 \u0921\u093E\u0932\u0947\u0902\u0964\n3. \u0907\u0938\u0947 \u091A\u0932\u093E\u0915\u0930 \u0935\u0930\u094D\u0915\u0936\u0949\u092A \u0928 \u0932\u0947 \u091C\u093E\u090F\u0902, \u0935\u0930\u0928\u093E \u0907\u0902\u091C\u0928 \u0938\u0940\u091C \u0939\u094B \u091C\u093E\u090F\u0917\u093E\u0964 \u091F\u094B \u0915\u094D\u0930\u0947\u0928 (Tow Crane) \u092C\u0941\u0932\u093E\u090F\u0902\u0964",
      cost: "\u20B925,000 - \u20B965,000"
    },
    "kb_04": {
      diagnosis: "\u0907\u0902\u091C\u0928 \u0911\u092F\u0932 \u091C\u0932\u0928\u093E \u092F\u093E \u092A\u093F\u0938\u094D\u091F\u0928 \u0930\u093F\u0902\u0917 \u0918\u093F\u0938\u0928\u093E (Piston Ring wear / Oil burning)",
      action: "1. \u0938\u092E\u092F-\u0938\u092E\u092F \u092A\u0930 \u0907\u0902\u091C\u0928 \u0911\u092F\u0932 \u0915\u093E \u0932\u0947\u0935\u0932 \u0928\u093E\u092A\u0924\u0947 \u0930\u0939\u0947\u0902\u0964\n2. \u091A\u0922\u093C\u093E\u0908 \u092A\u0930 \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u0928 \u0916\u0940\u0902\u091A\u0947 \u0914\u0930 \u0917\u0924\u093F \u0927\u0940\u092E\u0940 \u0930\u0916\u0947\u0902\u0964\n3. \u091C\u0932\u094D\u0926 \u0938\u0947 \u091C\u0932\u094D\u0926 \u0935\u0930\u094D\u0915\u0936\u0949\u092A \u092E\u0947\u0902 \u0907\u0902\u091C\u0928 \u0915\u0902\u092A\u094D\u0930\u0947\u0936\u0928 \u091F\u0947\u0938\u094D\u091F \u0915\u0930\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B915,000 - \u20B940,000"
    },
    "kb_05": {
      diagnosis: "\u0907\u0902\u091C\u0928 \u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0917\u0930\u094D\u092E (Overheat) \u0939\u094B\u0928\u093E - \u0930\u0947\u0921\u093F\u090F\u091F\u0930 \u0932\u0940\u0915 \u092F\u093E \u0925\u0930\u094D\u092E\u093E\u0938\u094D\u091F\u0947\u091F \u0935\u093E\u0932\u094D\u0935 \u091C\u093E\u092E (Radiator leak / Thermostat failure)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0924\u0941\u0930\u0902\u0924 \u0915\u093F\u0928\u093E\u0930\u0947 \u0932\u0917\u093E\u090F\u0902\u0964\n2. \u0917\u0930\u092E \u0930\u0947\u0921\u093F\u090F\u091F\u0930 \u0915\u0948\u092A \u0915\u094B \u0915\u092D\u0940 \u092D\u0940 \u0928 \u0916\u094B\u0932\u0947\u0902 (\u0917\u0902\u092D\u0940\u0930 \u0930\u0942\u092A \u0938\u0947 \u091C\u0932\u0928\u0947 \u0915\u093E \u0916\u0924\u0930\u093E)\u0964\n3. \u0907\u0902\u091C\u0928 \u0915\u094B 30 \u092E\u093F\u0928\u091F \u0920\u0902\u0921\u093E \u0939\u094B\u0928\u0947 \u0926\u0947\u0902, \u092B\u093F\u0930 \u0938\u093E\u092B\u093C \u092A\u093E\u0928\u0940 \u092F\u093E \u0915\u0942\u0932\u0947\u0902\u091F \u0921\u093E\u0932\u0947\u0902 \u0914\u0930 \u0932\u0940\u0915 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964",
      cost: "\u20B92,500 - \u20B912,000"
    },
    "kb_06": {
      diagnosis: "\u0917\u093F\u092F\u0930 \u0936\u093F\u092B\u094D\u091F\u0930 \u0932\u093F\u0902\u0915\u0947\u091C \u092F\u093E \u0915\u094D\u0932\u091A \u0938\u093F\u0932\u0947\u0902\u0921\u0930 \u0932\u0940\u0915 \u0939\u094B\u0928\u093E (Clutch cylinder leak / Gearbox synchronizer wear)",
      action: "1. \u0915\u094D\u0932\u091A \u0911\u092F\u0932 \u0930\u093F\u091C\u093C\u0930\u094D\u0935\u094B\u0907\u0930 (clutch oil reservoir) \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964\n2. \u092F\u0926\u093F \u0916\u093E\u0932\u0940 \u0939\u0948, \u0924\u094B \u092C\u094D\u0930\u0947\u0915/\u0915\u094D\u0932\u091A \u0911\u092F\u0932 \u0921\u093E\u0932\u0947\u0902 \u0914\u0930 \u0915\u094D\u0932\u091A \u092A\u0947\u0921\u0932 \u0915\u094B \u0926\u092C\u093E\u090F\u0902\u0964\n3. \u0927\u0940\u0930\u0947-\u0927\u0940\u0930\u0947 \u092C\u093F\u0928\u093E \u092C\u093E\u0930-\u092C\u093E\u0930 \u0917\u093F\u092F\u0930 \u092C\u0926\u0932\u0947 \u092A\u093E\u0938 \u0915\u0947 \u0917\u0948\u0930\u0947\u091C \u092E\u0947\u0902 \u092A\u0939\u0941\u0902\u091A\u0947\u0902\u0964",
      cost: "\u20B96,000 - \u20B918,000"
    },
    "kb_07": {
      diagnosis: "\u092A\u093E\u0935\u0930 \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0911\u092F\u0932 \u0932\u0940\u0915 \u092F\u093E \u092A\u093E\u0935\u0930 \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u092A\u0902\u092A \u0916\u0930\u093E\u092C (Power steering oil leak / Pump failure)",
      action: "1. \u092A\u093E\u0935\u0930 \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0911\u092F\u0932 \u091F\u0948\u0902\u0915 \u091A\u0947\u0915 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0924\u0941\u0930\u0902\u0924 \u0928\u092F\u093E \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0911\u092F\u0932 \u0921\u093E\u0932\u0947\u0902\u0964\n2. \u092C\u0947\u0932\u094D\u091F \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902 \u0915\u093F \u0935\u0939 \u091F\u0942\u091F\u0940 \u0924\u094B \u0928\u0939\u0940\u0902 \u0939\u0948\u0964\n3. \u0917\u093E\u0921\u093C\u0940 \u092E\u094B\u095C\u0924\u0947 \u0938\u092E\u092F \u0927\u094D\u092F\u093E\u0928 \u0926\u0947\u0902 \u0915\u094D\u092F\u094B\u0902\u0915\u093F \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u092C\u0939\u0941\u0924 \u092D\u093E\u0930\u0940 \u0915\u093E\u092E \u0915\u0930\u0947\u0917\u093E\u0964",
      cost: "\u20B91,800 - \u20B97,500"
    },
    "kb_08": {
      diagnosis: "\u091F\u0930\u094D\u092C\u094B\u091A\u093E\u0930\u094D\u091C\u0930\u0939\u094B\u0938 \u092A\u093E\u0907\u092A \u0922\u0940\u0932\u093E \u0939\u094B\u0928\u093E \u092F\u093E \u0932\u0940\u0915 \u0939\u094B\u0928\u093E (Turbocharger hose pipe leak / Intercooler leak)",
      action: "1. \u091F\u0930\u094D\u092C\u094B\u091A\u093E\u0930\u094D\u091C\u0930 \u0914\u0930 \u0907\u0902\u091F\u0930\u0915\u0942\u0932\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u0947 \u092C\u0921\u093C\u0947 \u0915\u093E\u0932\u0947 \u0930\u092C\u0930 \u092A\u093E\u0907\u092A\u094B\u0902 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964\n2. \u092F\u0926\u093F \u0915\u094B\u0908 \u0915\u094D\u0932\u093F\u092A \u0922\u0940\u0932\u0940 \u0939\u0948, \u0924\u094B \u0909\u0938\u0947 \u092A\u0947\u091A\u0915\u0936 \u0938\u0947 \u091F\u093E\u0907\u091F \u0915\u0930\u0947\u0902\u0964\n3. \u0917\u0924\u093F \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0930\u0916\u0947\u0902 \u0924\u093E\u0915\u093F \u091F\u0930\u094D\u092C\u094B \u092A\u0930 \u0905\u0927\u093F\u0915 \u0926\u092C\u093E\u0935 \u0928 \u092A\u0921\u093C\u0947\u0964",
      cost: "\u20B93,000 - \u20B915,000"
    },
    "kb_09": {
      diagnosis: "\u092C\u0948\u091F\u0930\u0940 \u0921\u093F\u0938\u094D\u091A\u093E\u0930\u094D\u091C \u0939\u094B\u0928\u093E \u092F\u093E \u091F\u0930\u094D\u092E\u093F\u0928\u0932\u094D\u0938 \u092E\u0947\u0902 \u0915\u093E\u0930\u094D\u092C\u0928 \u091C\u092E\u0928\u093E (Discharged battery / Corroded terminals)",
      action: "1. \u092C\u0948\u091F\u0930\u0940 \u0915\u0947 \u0924\u093E\u0930\u094B\u0902 (terminals) \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964 \u092F\u0926\u093F \u0938\u092B\u0947\u0926 \u092A\u093E\u0909\u0921\u0930 \u092F\u093E \u091C\u0902\u0917 \u0939\u0948, \u0924\u094B \u0909\u0938\u0947 \u0917\u0930\u092E \u092A\u093E\u0928\u0940 \u0938\u0947 \u0938\u093E\u092B \u0915\u0930\u0947\u0902\u0964\n2. \u0926\u0942\u0938\u0930\u0940 \u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u092C\u0948\u091F\u0930\u0940 \u0938\u0947 \u091C\u0902\u092A-\u0938\u094D\u091F\u093E\u0930\u094D\u091F (Jump start) \u0915\u0930\u0947\u0902\u0964\n3. \u0938\u094D\u091F\u093E\u0930\u094D\u091F \u0939\u094B\u0928\u0947 \u0915\u0947 \u092C\u093E\u0926 \u0905\u0932\u094D\u091F\u0930\u0928\u0947\u091F\u0930 \u0915\u0940 \u091A\u093E\u0930\u094D\u091C\u093F\u0902\u0917 \u091A\u0947\u0915 \u0915\u0930\u093E\u090F\u0902\u0964",
      cost: "\u20B91,000 - \u20B98,500"
    },
    "kb_10": {
      diagnosis: "\u0907\u0902\u091C\u0928 \u092E\u093E\u0909\u0902\u091F\u093F\u0902\u0917 \u0930\u092C\u0930 \u091F\u0942\u091F\u0928\u093E \u092F\u093E \u0918\u093F\u0938\u0928\u093E (Worn engine mounting rubber)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0917\u0924\u093F \u0938\u0947 \u0928\u093F\u0915\u091F\u0924\u092E \u0917\u0948\u0930\u0947\u091C \u0924\u0915 \u0932\u0947 \u091C\u093E\u090F\u0902\u0964\n2. \u0932\u0902\u092C\u0947 \u0938\u092E\u092F \u0924\u0915 \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u091A\u093E\u0932\u0942 (idle) \u0916\u0921\u093C\u093E \u0928 \u0930\u0916\u0947\u0902\u0964\n3. \u0907\u0902\u091C\u0928 \u092E\u093E\u0909\u0902\u091F\u093F\u0902\u0917 \u092C\u094B\u0932\u094D\u0921 \u0914\u0930 \u0930\u092C\u0930 \u092A\u0948\u0921 \u0915\u094B \u092C\u0926\u0932\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B94,000 - \u20B912,000"
    },
    "kb_11": {
      diagnosis: "\u0921\u093F\u092B\u0930\u0947\u0902\u0936\u093F\u092F\u0932 \u0917\u093F\u092F\u0930 \u0911\u092F\u0932 \u0915\u0940 \u0915\u092E\u0940 \u092F\u093E \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0918\u093F\u0938\u0928\u093E (Rear differential oil leak / Pinion bearing wear)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0930\u094B\u0915\u0915\u0930 \u092A\u0940\u091B\u0947 \u0915\u0947 \u090F\u0915\u094D\u0938\u0947\u0932 (axle) \u0938\u0947 \u0924\u0947\u0932 \u0930\u093F\u0938\u0928\u0947 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964\n2. \u092C\u093F\u0928\u093E \u0924\u0947\u0932 \u0915\u0947 \u091A\u0932\u0928\u0947 \u092A\u0930 \u090F\u0915\u094D\u0938\u0947\u0932 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u091C\u093E\u092E \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948, \u091C\u093F\u0938\u0938\u0947 \u0917\u093E\u0921\u093C\u0940 \u092A\u0932\u091F \u0938\u0915\u0924\u0940 \u0939\u0948\u0964\n3. \u0924\u0941\u0930\u0902\u0924 \u0928\u092F\u093E \u0921\u093F\u092B\u0930\u0947\u0902\u0936\u093F\u092F\u0932 \u0911\u092F\u0932 (EP-90) \u0921\u0932\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B98,000 - \u20B928,000"
    },
    "kb_12": {
      diagnosis: "\u091F\u0930\u094D\u092C\u094B\u091A\u093E\u0930\u094D\u091C\u0930 \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u093E \u092F\u093E \u092E\u0948\u0928\u093F\u092B\u094B\u0932\u094D\u0921 \u0932\u0940\u0915 (Turbocharger rotor bearing failure)",
      action: "1. \u091F\u0930\u094D\u092C\u094B\u091A\u093E\u0930\u094D\u091C\u0930 \u0915\u0947 \u0905\u0902\u0926\u0930\u0942\u0928\u0940 \u092A\u0939\u093F\u092F\u0947 \u092E\u0947\u0902 \u092A\u094D\u0932\u0947 \u092F\u093E \u0915\u092C\u093E\u0921\u093C \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964\n2. \u0907\u0902\u091C\u0928 \u0915\u0940 \u0906\u0930\u092A\u0940\u090F\u092E (RPM) \u092C\u0939\u0941\u0924 \u0905\u0927\u093F\u0915 \u0928 \u092C\u0922\u093C\u093E\u090F\u0902\u0964\n3. \u091C\u0932\u094D\u0926 \u0939\u0940 \u091F\u0930\u094D\u092C\u094B \u092C\u0926\u0932\u0947\u0902 \u092F\u093E \u0930\u093F\u092A\u0947\u092F\u0930 \u0915\u0930\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B912,000 - \u20B935,000"
    },
    "kb_13": {
      diagnosis: "\u0935\u094D\u0939\u0940\u0932 \u090F\u0932\u093E\u0907\u0928\u092E\u0947\u0902\u091F \u0906\u0909\u091F \u0939\u094B\u0928\u093E \u092F\u093E \u091F\u093E\u0908 \u0930\u0949\u0921 \u090F\u0902\u0921 \u0918\u093F\u0938\u0928\u093E (Incorrect wheel alignment / Worn tie rod ends)",
      action: "1. \u091F\u093E\u092F\u0930 \u0915\u093E \u092A\u094D\u0930\u0947\u0936\u0930 \u0938\u092E\u093E\u0928 \u0930\u0916\u0947\u0902\u0964\n2. \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0932\u093F\u0902\u0915\u0947\u091C \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902 \u0915\u093F \u0915\u094B\u0908 \u092A\u093E\u0930\u094D\u091F \u0922\u0940\u0932\u093E \u0924\u094B \u0928\u0939\u0940\u0902 \u0939\u0948\u0964\n3. \u0905\u0917\u0932\u0947 \u092C\u0921\u093C\u0947 \u0938\u094D\u091F\u0949\u092A \u092A\u0930 \u0935\u094D\u0939\u0940\u0932 \u090F\u0932\u093E\u0907\u0928\u092E\u0947\u0902\u091F (Wheel Alignment) \u0915\u0930\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B91,500 - \u20B95,000"
    },
    "kb_14": {
      diagnosis: "\u090F\u092F\u0930 \u0915\u0902\u092A\u094D\u0930\u0947\u0938\u0930 \u092A\u093E\u0907\u092A \u0932\u0940\u0915 \u092F\u093E \u090F\u092F\u0930 \u091F\u0948\u0902\u0915 \u092E\u0947\u0902 \u092A\u0902\u091A\u0930 (Critical Low Air Pressure / Brake chamber leak)",
      action: "1. \u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0916\u0924\u0930\u093E! \u0917\u093E\u0921\u093C\u0940 \u0924\u0941\u0930\u0902\u0924 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0930\u094B\u0915\u0947\u0902\u0964\n2. \u092A\u094D\u0930\u0947\u0936\u0930 6 \u092C\u093E\u0930 \u0938\u0947 \u090A\u092A\u0930 \u0939\u094B\u0928\u0947 \u0924\u0915 \u0917\u093E\u0921\u093C\u0940 \u0906\u0917\u0947 \u0928 \u092C\u0922\u093C\u093E\u090F\u0902, \u0935\u0930\u0928\u093E \u092C\u094D\u0930\u0947\u0915 \u0928\u0939\u0940\u0902 \u0932\u0917\u0947\u0902\u0917\u0947\u0964\n3. \u091A\u0947\u0938\u093F\u0938 \u0914\u0930 \u0939\u0935\u093E \u0915\u0947 \u091F\u0948\u0902\u0915\u094B\u0902 \u0915\u0947 \u092A\u093E\u0938 \u0939\u0935\u093E \u0932\u0940\u0915 \u0939\u094B\u0928\u0947 \u0915\u0940 \u0938\u0930\u0938\u0930\u093E\u0939\u091F \u0915\u0940 \u0906\u0935\u093E\u091C\u093C \u0938\u0941\u0928\u0947\u0902\u0964 \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u092C\u0941\u0932\u093E\u090F\u0902\u0964",
      cost: "\u20B94,500 - \u20B916,000"
    },
    "kb_15": {
      diagnosis: "\u0939\u0947\u0921 \u0917\u0948\u0938\u094D\u0915\u0947\u091F \u092B\u091F\u0928\u093E \u092F\u093E \u0907\u0902\u091C\u0928 \u092C\u094D\u0932\u0949\u0915 \u092E\u0947\u0902 \u0915\u094D\u0930\u0948\u0915 (Blown head gasket / Coolant mixing with engine oil)",
      action: "1. \u0907\u0902\u091C\u0928 \u0915\u094B \u092D\u0942\u0932\u0915\u0930 \u092D\u0940 \u0938\u094D\u091F\u093E\u0930\u094D\u091F \u0928 \u0915\u0930\u0947\u0902\u0964\n2. \u0915\u0942\u0932\u0947\u0902\u091F \u0914\u0930 \u0907\u0902\u091C\u0928 \u0911\u092F\u0932 \u0906\u092A\u0938 \u092E\u0947\u0902 \u092E\u093F\u0932 \u0930\u0939\u0947 \u0939\u0948\u0902, \u091C\u093F\u0938\u0938\u0947 \u0907\u0902\u091C\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0940\u091C \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964\n3. \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u091F\u094B \u0915\u0930\u0915\u0947 \u0938\u0940\u0927\u0947 \u0917\u0948\u0930\u0947\u091C \u0932\u0947 \u091C\u093E\u090F\u0902\u0964",
      cost: "\u20B918,000 - \u20B945,000"
    },
    "kb_16": {
      diagnosis: "\u092B\u094D\u092F\u0942\u0932 \u091F\u0948\u0902\u0915 \u092A\u0902\u091A\u0930 \u0939\u094B\u0928\u093E \u092F\u093E \u092B\u094D\u092F\u0942\u0932 \u092A\u093E\u0907\u092A\u0932\u093E\u0907\u0928 \u0932\u0940\u0915 (Fuel tank puncture / Fuel line leakage)",
      action: "1. \u0906\u0917 \u0932\u0917\u0928\u0947 \u0915\u093E \u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0916\u0924\u0930\u093E! \u0907\u0902\u091C\u0928 \u0924\u0941\u0930\u0902\u0924 \u092C\u0902\u0926 \u0915\u0930\u0947\u0902\u0964\n2. \u092B\u094D\u092F\u0942\u0932 \u092B\u093F\u0932\u094D\u091F\u0930 \u092F\u093E \u0930\u093F\u091F\u0930\u094D\u0928 \u0939\u094B\u091C\u093C \u0915\u0947 \u092A\u093E\u0938 \u0930\u093F\u0938\u093E\u0935 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964\n3. \u092A\u0902\u091A\u0930 \u0935\u093E\u0932\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 \u0938\u093E\u092C\u0941\u0928 \u092F\u093E \u090F\u092E-\u0938\u0940\u0932 (M-Seal) \u0938\u0947 \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u092A\u0948\u091A \u0932\u0917\u093E\u090F\u0902, \u092B\u093F\u0930 \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u0915\u094B \u0926\u093F\u0916\u093E\u090F\u0902\u0964",
      cost: "\u20B92,000 - \u20B912,000"
    },
    "kb_17": {
      diagnosis: "\u0915\u094D\u0932\u091A \u0930\u093F\u0932\u0940\u091C \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u093E (Worn clutch release bearing)",
      action: "1. \u0932\u093E\u0932 \u092C\u0924\u094D\u0924\u0940 \u092F\u093E \u0938\u094D\u091F\u0949\u092A \u092A\u0930 \u0915\u094D\u0932\u091A \u092A\u0947\u0921\u0932 \u0915\u094B \u0926\u092C\u093E\u0915\u0930 \u0928 \u0930\u0916\u0947\u0902 (\u0917\u093E\u0921\u093C\u0940 \u0928\u094D\u092F\u0942\u091F\u094D\u0930\u0932 \u092E\u0947\u0902 \u0930\u0916\u0947\u0902)\u0964\n2. \u091C\u0932\u094D\u0926 \u0939\u0940 \u092A\u0942\u0930\u093E \u0915\u094D\u0932\u091A \u0915\u093F\u091F (\u092A\u094D\u0930\u0947\u0936\u0930 \u092A\u094D\u0932\u0947\u091F, \u0915\u094D\u0932\u091A \u092A\u094D\u0932\u0947\u091F \u0914\u0930 \u0930\u093F\u0932\u0940\u091C \u092C\u0947\u092F\u0930\u093F\u0902\u0917) \u092C\u0926\u0932\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B94,500 - \u20B911,000"
    },
    "kb_18": {
      diagnosis: "\u0905\u0932\u094D\u091F\u0930\u0928\u0947\u091F\u0930 \u092C\u0947\u0932\u094D\u091F \u091F\u0942\u091F\u0928\u093E \u092F\u093E \u0930\u0947\u0917\u0941\u0932\u0947\u091F\u0930 \u0916\u0930\u093E\u092C (Alternator failure / Broken drive belt)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u092A\u0930 \u092C\u093F\u091C\u0932\u0940 \u0915\u093E \u0932\u094B\u0921 \u0915\u092E \u0915\u0930\u0947\u0902 (\u0915\u0947\u092C\u093F\u0928 \u092A\u0902\u0916\u093E, \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0932\u093E\u0907\u091F \u092C\u0902\u0926 \u0915\u0930\u0947\u0902)\u0964\n2. \u0938\u0940\u0927\u0947 \u092A\u093E\u0938 \u0915\u0947 \u0911\u091F\u094B \u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928 \u0915\u0947 \u092A\u093E\u0938 \u091C\u093E\u090F\u0902\u0964\n3. \u092F\u0926\u093F \u092C\u0947\u0932\u094D\u091F \u092A\u093E\u0928\u0940 \u0915\u0947 \u092A\u0902\u092A \u0915\u094B \u092D\u0940 \u091A\u0932\u093E\u0924\u0940 \u0939\u0948, \u0924\u094B \u0907\u0902\u091C\u0928 \u0924\u093E\u092A\u092E\u093E\u0928 \u092A\u0930 \u0928\u091C\u093C\u0930 \u0930\u0916\u0947\u0902\u0964",
      cost: "\u20B93,000 - \u20B910,000"
    },
    "kb_19": {
      diagnosis: "\u0935\u094D\u0939\u0940\u0932 \u0928\u091F \u0922\u0940\u0932\u0947 \u0939\u094B\u0928\u093E \u092F\u093E \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0928\u0915\u0932 \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0916\u0930\u093E\u092C (Worn CV joint / Loose wheel nuts)",
      action: "1. \u0924\u0941\u0930\u0902\u0924 \u0917\u093E\u0921\u093C\u0940 \u0930\u094B\u0915\u0915\u0930 \u092A\u0939\u093F\u092F\u094B\u0902 \u0915\u0947 \u0928\u091F \u091A\u0947\u0915 \u0914\u0930 \u091F\u093E\u0907\u091F \u0915\u0930\u0947\u0902\u0964\n2. \u092F\u0926\u093F \u0928\u091F \u091F\u093E\u0907\u091F \u0939\u0948\u0902, \u0924\u094B \u0938\u094D\u091F\u0940\u092F\u0930\u093F\u0902\u0917 \u0928\u0915\u0932 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964 \u0922\u0940\u0932\u093E \u092A\u0939\u093F\u092F\u093E \u091A\u0932\u0928\u0947 \u092E\u0947\u0902 \u092C\u093E\u0939\u0930 \u0928\u093F\u0915\u0932 \u0938\u0915\u0924\u093E \u0939\u0948\u0964",
      cost: "\u20B92,500 - \u20B98,000"
    },
    "kb_20": {
      diagnosis: "\u0915\u0942\u0932\u0947\u0902\u091F \u0915\u093E \u0907\u0902\u091C\u0928 \u0938\u093F\u0932\u0947\u0902\u0921\u0930 \u092E\u0947\u0902 \u091C\u093E\u0928\u093E / \u0939\u0947\u0921 \u0917\u0948\u0938\u094D\u0915\u0947\u091F \u0932\u0940\u0915 (Coolant leak into combustion chamber / Hydrolock risk)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0928 \u091A\u0932\u093E\u090F\u0902\u0964 \u0907\u0938\u0938\u0947 \u0907\u0902\u091C\u0928 \u092C\u094D\u0932\u0949\u0915 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0947 \u091F\u0942\u091F \u0938\u0915\u0924\u093E \u0939\u0948\u0964\n2. \u0915\u0942\u0932\u0947\u0902\u091F \u0915\u093E \u0938\u094D\u0924\u0930 \u091A\u0947\u0915 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u0915\u0947 \u092A\u093E\u0938 \u091F\u094B \u0915\u0930\u0947\u0902\u0964",
      cost: "\u20B912,000 - \u20B935,000"
    },
    "kb_21": {
      diagnosis: "\u0917\u093F\u092F\u0930 \u0915\u0947\u092C\u0932 \u091F\u0942\u091F\u0928\u093E \u092F\u093E \u0932\u093F\u0902\u0915\u0947\u091C \u092C\u0941\u0936 \u0918\u093F\u0938\u0928\u093E (Broken gear shifting cable or linkage bushing)",
      action: "1. \u0915\u0947\u092C\u093F\u0928 \u0915\u0947 \u0928\u0940\u091A\u0947 \u0917\u093F\u092F\u0930 \u0936\u093F\u092B\u094D\u091F\u0930 \u0932\u093F\u0902\u0915\u0947\u091C \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964\n2. \u092C\u0941\u0936 \u0906\u0938\u093E\u0928\u0940 \u0938\u0947 \u092C\u0926\u0932\u0947 \u091C\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u0917\u093F\u092F\u0930 \u0915\u094B \u091C\u092C\u0930\u0926\u0938\u094D\u0924\u0940 \u0928 \u0932\u0917\u093E\u090F\u0902\u0964",
      cost: "\u20B92,500 - \u20B912,000"
    },
    "kb_22": {
      diagnosis: "\u0915\u092E\u093E\u0928\u0940 \u092A\u0924\u094D\u0924\u093E (Leaf spring) \u092C\u0941\u0936 \u0918\u093F\u0938\u0928\u093E \u092F\u093E \u0938\u0947\u0902\u091F\u0930 \u092C\u094B\u0932\u094D\u091F \u091F\u0942\u091F\u0928\u093E",
      action: "1. \u0915\u092E\u093E\u0928\u0940 \u0938\u0947\u091F \u0915\u0947 \u091F\u0942\u091F\u0947 \u092A\u0924\u094D\u0924\u094B\u0902 \u092F\u093E \u0916\u093F\u0938\u0915\u0947 \u0939\u0941\u090F \u0938\u0947\u0902\u091F\u0930 \u092C\u094B\u0932\u094D\u091F \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964\n2. \u0917\u093E\u0921\u093C\u0940 \u092E\u0947\u0902 \u0913\u0935\u0930\u0932\u094B\u0921\u093F\u0902\u0917 \u0928 \u0915\u0930\u0947\u0902\u0964\n3. \u0917\u0921\u094D\u0922\u094B\u0902 \u0938\u0947 \u0917\u093E\u0921\u093C\u0940 \u0927\u0940\u0930\u0947 \u0928\u093F\u0915\u093E\u0932\u0947\u0902 \u0924\u093E\u0915\u093F \u091A\u0947\u0938\u093F\u0938 \u0915\u094B \u0928\u0941\u0915\u0938\u093E\u0928 \u0928 \u092A\u0939\u0941\u0902\u091A\u0947\u0964",
      cost: "\u20B93,500 - \u20B914,000"
    },
    "kb_23": {
      diagnosis: "\u092B\u094D\u092F\u0942\u0932 \u092B\u093F\u0932\u094D\u091F\u0930 \u091A\u094B\u0915 \u0939\u094B\u0928\u093E \u092F\u093E \u0930\u0947\u0932 \u092A\u094D\u0930\u0947\u0936\u0930 \u0915\u092E \u0939\u094B\u0928\u093E (Clogged fuel filter / CRDI system low rail pressure)",
      action: "1. \u0926\u094B\u0928\u094B\u0902 \u092B\u094D\u092F\u0942\u0932 \u092B\u093F\u0932\u094D\u091F\u0930 (\u092A\u094D\u0930\u093E\u0907\u092E\u0930\u0940 \u0914\u0930 \u0938\u0947\u0915\u0947\u0902\u0921\u0930\u0940) \u092C\u0926\u0932\u0947\u0902\u0964\n2. \u092B\u094D\u092F\u0942\u0932 \u092A\u093E\u0907\u092A\u0932\u093E\u0907\u0928 \u0915\u0940 \u0939\u0935\u093E (bleed) \u0928\u093F\u0915\u093E\u0932\u0947\u0902\u0964\n3. \u092C\u0948\u091F\u0930\u0940 \u0915\u093E \u0935\u094B\u0932\u094D\u091F\u0947\u091C \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964",
      cost: "\u20B94,000 - \u20B918,000"
    },
    "kb_24": {
      diagnosis: "\u0938\u093E\u0907\u0932\u0947\u0902\u0938\u0930 \u092F\u093E \u090F\u0915\u094D\u091C\u0949\u0938\u094D\u091F \u092E\u0948\u0928\u093F\u092B\u094B\u0932\u094D\u0921 \u0938\u0947 \u0939\u0935\u093E \u0932\u0940\u0915 \u0939\u094B\u0928\u093E (Exhaust manifold gasket leak)",
      action: "1. \u090F\u0915\u094D\u091C\u0949\u0938\u094D\u091F \u0917\u0948\u0938 \u0915\u0947\u092C\u093F\u0928 \u092E\u0947\u0902 \u0906 \u0938\u0915\u0924\u0940 \u0939\u0948\u0964\n2. \u0915\u0947\u092C\u093F\u0928 \u0915\u0947 \u0936\u0940\u0936\u0947 \u0925\u094B\u0921\u093C\u0947 \u0916\u0941\u0932\u0947 \u0930\u0916\u0915\u0930 \u0917\u093E\u0921\u093C\u0940 \u091A\u0932\u093E\u090F\u0902\u0964\n3. \u092E\u0948\u0928\u093F\u092B\u094B\u0932\u094D\u0921 \u0915\u0947 \u092C\u094B\u0932\u094D\u091F \u091F\u093E\u0907\u091F \u0915\u0930\u0935\u093E\u090F\u0902 \u0914\u0930 \u0917\u0948\u0938\u0915\u0947\u091F \u092C\u0926\u0932\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B91,500 - \u20B96,500"
    },
    "kb_25": {
      diagnosis: "\u0935\u094D\u0939\u0940\u0932 \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0938\u0942\u0916 \u091C\u093E\u0928\u093E \u092F\u093E \u092C\u094D\u0930\u0947\u0915 \u0921\u094D\u0930\u092E \u091C\u093E\u092E \u0939\u094B\u0928\u093E (Wheel bearing grease seal failure / Jammed brakes)",
      action: "1. \u0924\u0941\u0930\u0902\u0924 \u0917\u093E\u0921\u093C\u0940 \u0930\u094B\u0915\u0947\u0902! \u092A\u0939\u093F\u092F\u093E \u092C\u0939\u0941\u0924 \u0917\u0930\u092E \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948\u0964\n2. \u0917\u093E\u0921\u093C\u0940 \u0906\u0917\u0947 \u091A\u0932\u093E\u0928\u0947 \u092A\u0930 \u090F\u0915\u094D\u0938\u0947\u0932 \u091F\u0942\u091F\u0915\u0930 \u092A\u0939\u093F\u092F\u093E \u0905\u0932\u0917 \u0939\u094B \u0938\u0915\u0924\u093E \u0939\u0948\u0964\n3. \u0924\u0941\u0930\u0902\u0924 \u091F\u094B \u0915\u094D\u0930\u0947\u0928 \u092F\u093E \u092E\u094B\u092C\u093E\u0907\u0932 \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u092C\u0941\u0932\u093E\u090F\u0902\u0964",
      cost: "\u20B92,500 - \u20B98,500"
    },
    "kb_26": {
      diagnosis: "DPF \u0938\u093E\u0907\u0932\u0947\u0902\u0938\u0930 \u091A\u094B\u0915 \u0939\u094B\u0928\u093E \u092F\u093E AdBlue \u092F\u0942\u0930\u093F\u092F\u093E \u0915\u0940 \u0915\u092E\u0940 (DPF soot accumulation / DEF low)",
      action: "1. \u092F\u0942\u0930\u093F\u092F\u093E (AdBlue) \u0915\u093E \u0932\u0947\u0935\u0932 \u091A\u0947\u0915 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0930\u0940\u092B\u093F\u0932 \u0915\u0930\u0947\u0902\u0964\n2. \u0917\u093E\u0921\u093C\u0940 \u0915\u094B 30 \u092E\u093F\u0928\u091F \u0924\u0915 50 \u0915\u093F\u092E\u0940/\u0918\u0902\u091F\u093E \u0938\u0947 \u0905\u0927\u093F\u0915 \u0915\u0940 \u0938\u094D\u092A\u0940\u0921 \u092A\u0930 \u091A\u0932\u093E\u090F\u0902 \u0924\u093E\u0915\u093F \u0938\u093E\u0907\u0932\u0947\u0902\u0938\u0930 \u0905\u092A\u0928\u0947 \u0906\u092A \u0938\u093E\u092B (Regeneration) \u0939\u094B \u0938\u0915\u0947\u0964",
      cost: "\u20B95,000 - \u20B925,000"
    },
    "kb_27": {
      diagnosis: "\u0938\u0947\u0932\u094D\u092B \u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0930 \u092E\u094B\u091F\u0930 \u092A\u093F\u0928\u093F\u092F\u0928 \u0905\u091F\u0915\u0928\u093E (Starter motor gear pinion sticking)",
      action: "1. \u092C\u0948\u091F\u0930\u0940 \u0906\u0907\u0938\u094B\u0932\u0947\u091F\u0930 \u091A\u093E\u092C\u0940 \u0924\u0941\u0930\u0902\u0924 \u092C\u0902\u0926 \u0915\u0930\u0947\u0902\u0964\n2. \u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0930 \u092E\u094B\u091F\u0930 \u092A\u0930 \u0915\u093F\u0938\u0940 \u0932\u0915\u0921\u093C\u0940 \u092F\u093E \u0930\u093F\u0902\u091A \u0938\u0947 \u0939\u0932\u094D\u0915\u093E \u0925\u092A\u0925\u092A\u093E\u090F\u0902 \u0924\u093E\u0915\u093F \u092A\u093F\u0928\u093F\u092F\u0928 \u0905\u092A\u0928\u0940 \u091C\u0917\u0939 \u0935\u093E\u092A\u0938 \u0906 \u0938\u0915\u0947\u0964\n3. \u092A\u093E\u0938 \u0915\u0947 \u0911\u091F\u094B \u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928 \u0915\u094B \u0926\u093F\u0916\u093E\u090F\u0902\u0964",
      cost: "\u20B93,500 - \u20B911,000"
    },
    "kb_28": {
      diagnosis: "AC \u0915\u0902\u092A\u094D\u0930\u0947\u0938\u0930 \u0915\u094D\u0932\u091A \u092C\u0947\u092F\u0930\u093F\u0902\u0917 \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u093E (AC compressor clutch bearing failure)",
      action: "1. \u0915\u0947\u092C\u093F\u0928 \u092E\u0947\u0902 \u0924\u0941\u0930\u0902\u0924 AC \u0915\u093E \u0938\u094D\u0935\u093F\u091A \u092C\u0902\u0926 \u0915\u0930 \u0926\u0947\u0902\u0964\n2. AC \u092C\u0902\u0926 \u0939\u094B\u0928\u0947 \u0938\u0947 \u092C\u0947\u0932\u094D\u091F \u092B\u094D\u0930\u0940 \u0939\u094B \u091C\u093E\u090F\u0917\u0940 \u0914\u0930 \u0906\u092A \u092C\u0947\u0932\u094D\u091F \u091F\u0942\u091F\u0928\u0947 \u0915\u0947 \u0921\u0930 \u0915\u0947 \u092C\u093F\u0928\u093E \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0917\u093E\u0921\u093C\u0940 \u091A\u0932\u093E \u0938\u0915\u0947\u0902\u0917\u0947\u0964",
      cost: "\u20B92,000 - \u20B915,000"
    },
    "kb_29": {
      diagnosis: "\u0915\u094D\u0932\u091A \u092A\u094D\u0932\u0947\u091F \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0918\u093F\u0938\u0928\u093E (Worn out clutch plate friction material / Clutch slipping)",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u092A\u0930 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0935\u091C\u0928 \u0928 \u0932\u093E\u0926\u0947\u0902\u0964\n2. \u091A\u0922\u093C\u093E\u0908 \u0906\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0939\u0940 \u091B\u094B\u091F\u0947 \u0917\u093F\u092F\u0930 \u092E\u0947\u0902 \u0917\u093E\u0921\u093C\u0940 \u0921\u093E\u0932\u0947\u0902\u0964 \u0906\u0927\u093E-\u0915\u094D\u0932\u091A (half-clutch) \u0926\u092C\u093E\u0915\u0930 \u0928 \u091A\u0932\u093E\u090F\u0902\u0964\n3. \u0905\u0917\u0932\u0947 \u092C\u0921\u093C\u0947 \u0936\u0939\u0930 \u092E\u0947\u0902 \u0915\u094D\u0932\u091A \u092C\u0926\u0932\u0935\u093E\u090F\u0902\u0964",
      cost: "\u20B98,500 - \u20B924,000"
    },
    "kb_30": {
      diagnosis: "\u0930\u093F\u092F\u0930 \u092C\u094D\u0930\u0947\u0915 \u091A\u0948\u0902\u092C\u0930 \u0921\u093E\u092F\u093E\u092B\u094D\u0930\u093E\u092E \u0916\u0930\u093E\u092C \u092F\u093E \u0932\u0940\u0915 (Damaged rear brake chamber diaphragm)",
      action: "1. \u0905\u091A\u093E\u0928\u0915 \u0930\u093F\u092F\u0930 \u092C\u094D\u0930\u0947\u0915 \u091C\u093E\u092E \u0939\u094B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964\n2. \u0917\u093E\u0921\u093C\u0940 \u0915\u094B \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0915\u093F\u0928\u093E\u0930\u0947 \u0932\u0917\u093E\u090F\u0902\u0964\n3. \u0930\u093F\u092F\u0930 \u0935\u094D\u0939\u0940\u0932 \u0915\u0947 \u092A\u0940\u091B\u0947 \u091C\u093E\u0928\u0947 \u0935\u093E\u0932\u0947 \u090F\u092F\u0930 \u0939\u094B\u091C\u093C \u092A\u093E\u0907\u092A \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902\u0964 \u092C\u094D\u0930\u0947\u0915 \u090F\u092F\u0930 \u092C\u093E\u0908\u092A\u093E\u0938 \u0928 \u0915\u0930\u0947\u0902\u0964",
      cost: "\u20B92,800 - \u20B97,500"
    },
    "kb_31": {
      diagnosis: "\u092A\u094D\u0930\u094B\u092A\u0947\u0932\u0930 \u0936\u093E\u092B\u094D\u091F (Propeller Shaft) \u0915\u093E \u092F\u0942\u0928\u093F\u0935\u0930\u094D\u0938\u0932 \u0915\u094D\u0930\u0949\u0938 \u091C\u094D\u0935\u093E\u0907\u0902\u091F \u0918\u093F\u0938\u0928\u093E",
      action: "1. \u0917\u093E\u0921\u093C\u0940 \u0915\u0947 \u0928\u0940\u091A\u0947 \u0932\u0947\u091F\u0915\u0930 \u092A\u094D\u0930\u094B\u092A\u0947\u0932\u0930 \u0936\u093E\u092B\u094D\u091F \u0915\u094B \u0939\u093E\u0925 \u0938\u0947 \u0939\u093F\u0932\u093E\u0915\u0930 \u0926\u0947\u0916\u0947\u0902 \u0915\u093F \u0915\u094D\u0930\u0949\u0938 \u091C\u094D\u0935\u093E\u0907\u0902\u091F \u092E\u0947\u0902 \u092A\u094D\u0932\u0947 \u0924\u094B \u0928\u0939\u0940\u0902 \u0939\u0948\u0964\n2. \u092F\u0926\u093F \u091C\u094D\u0935\u093E\u0907\u0902\u091F \u0922\u0940\u0932\u093E \u0939\u0948, \u0924\u094B \u0917\u093E\u0921\u093C\u0940 \u0924\u0941\u0930\u0902\u0924 \u0930\u094B\u0915\u0947\u0902\u0964 \u0936\u093E\u092B\u094D\u091F \u091F\u0942\u091F\u0928\u0947 \u0938\u0947 \u0917\u0902\u092D\u0940\u0930 \u0926\u0941\u0930\u094D\u0918\u091F\u0928\u093E \u0939\u094B \u0938\u0915\u0924\u0940 \u0939\u0948\u0964",
      cost: "\u20B93,000 - \u20B99,500"
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
    diagnosis: "\u0938\u0902\u092D\u093E\u0935\u093F\u0924 \u0916\u0930\u093E\u092C\u0940: " + defaultDiag,
    recommended_action: "\u0938\u0941\u091D\u093E\u0935: " + defaultAction,
    estimated_cost_range: "\u20B92,500 - \u20B915,000"
  };
}
app.post("/api/auth/login", (req, res) => {
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
app.post("/api/auth/signup", (req, res) => {
  const { name, phone, password, role, preferred_language, org_name } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  const existing = db.getUsers().find((u) => u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "Phone number already registered." });
  }
  let orgId = null;
  if (role === "fleet_manager") {
    const newOrgName = org_name || `${name}'s Transport Fleet`;
    const newOrgId = "org_" + Math.random().toString(36).substring(2, 9);
    db.createOrganization({
      id: newOrgId,
      name: newOrgName,
      plan_tier: "free",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    orgId = newOrgId;
  }
  const newUser = db.createUser({
    org_id: orgId,
    role,
    name,
    phone,
    preferred_language: preferred_language || "hi"
  }, password);
  res.json({ user: newUser });
});
app.post("/api/auth/invite", (req, res) => {
  const { invite_code, name, phone, password, preferred_language } = req.body;
  if (!invite_code || !name || !phone || !password) {
    return res.status(400).json({ error: "Missing required details." });
  }
  let org_id = "";
  const codeUpper = invite_code.toUpperCase().trim();
  if (codeUpper === "RAJP-INV-1234" || codeUpper.startsWith("RAJP-INV")) {
    org_id = "org_rajpath";
  } else if (codeUpper === "KEDA-INV-5678" || codeUpper.startsWith("KEDA-INV")) {
    org_id = "org_kedar";
  } else {
    const parts = codeUpper.split("-INV-");
    if (parts.length === 2) {
      const suffix = parts[1].trim();
      const candidate1 = suffix;
      const candidate2 = "org_" + suffix;
      const matchedOrg = db.getOrganizations().find((o) => o.id.toLowerCase() === candidate1.toLowerCase() || o.id.toLowerCase() === candidate2.toLowerCase());
      if (matchedOrg) {
        org_id = matchedOrg.id;
      } else {
        const matchedManager = db.getUsers().find((u) => u.role === "fleet_manager" && u.org_id && (u.org_id.toLowerCase() === candidate1.toLowerCase() || u.org_id.toLowerCase() === candidate2.toLowerCase()));
        if (matchedManager && matchedManager.org_id) {
          org_id = matchedManager.org_id;
          db.createOrganization({
            id: org_id,
            name: `${matchedManager.name}'s Transport Fleet`,
            plan_tier: "free",
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    }
  }
  if (!org_id) {
    return res.status(400).json({ error: "Invalid invite code. Please check with your fleet manager." });
  }
  const existing = db.getUsers().find((u) => u.phone === phone);
  if (existing) {
    return res.status(400).json({ error: "Phone number already registered." });
  }
  const newUser = db.createUser({
    org_id,
    role: "driver",
    name,
    phone,
    preferred_language: preferred_language || "hi"
  }, password);
  res.json({ user: newUser });
});
app.get("/api/db-status", (req, res) => {
  res.json(db.getStatus());
});
app.get("/api/scheduled-services", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  const services = db.getScheduledServices(org_id);
  res.json({ services });
});
app.post("/api/schedule-service", (req, res) => {
  const data = req.body;
  if (!data.org_id || !data.vehicle_id) {
    return res.status(400).json({ error: "org_id and vehicle_id are required." });
  }
  db.addScheduledService(data);
  res.json({ success: true });
});
app.get("/api/vehicles", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ vehicles: db.getVehicles(org_id) });
});
app.post("/api/vehicles", (req, res) => {
  const { org_id, registration_number, make, model, year, assigned_driver_id, mileage, last_service_date } = req.body;
  if (!org_id || !registration_number || !make || !model) {
    return res.status(400).json({ error: "Missing required vehicle parameters." });
  }
  const newVehicle = db.addVehicle({
    org_id,
    registration_number,
    make,
    model,
    year: parseInt(year) || (/* @__PURE__ */ new Date()).getFullYear(),
    assigned_driver_id: assigned_driver_id || null,
    mileage: parseInt(mileage) || 0,
    last_service_date: last_service_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  });
  res.json({ vehicle: newVehicle });
});
app.put("/api/vehicles/:id", (req, res) => {
  const updated = db.updateVehicle(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Vehicle not found." });
  res.json({ vehicle: updated });
});
app.delete("/api/vehicles/:id", (req, res) => {
  const deleted = db.deleteVehicle(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Vehicle not found." });
  res.json({ success: true });
});
app.get("/api/drivers", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  const drivers = db.getUsers().filter((u) => u.org_id === org_id && u.role === "driver");
  res.json({ drivers });
});
app.post("/api/fault-reports", async (req, res) => {
  const { vehicle_id, driver_id, symptom_text_hindi, symptom_text_english, acoustic_signal_class, image_base64 } = req.body;
  if (!driver_id || !symptom_text_hindi) {
    return res.status(400).json({ error: "Driver ID and symptom text are required." });
  }
  let targetVehicleId = vehicle_id;
  if (!targetVehicleId) {
    const driver = db.getUsers().find((u) => u.id === driver_id);
    if (driver && driver.org_id) {
      const orgVehs = db.getVehicles(driver.org_id);
      const assignedVeh = orgVehs.find((v) => v.assigned_driver_id === driver_id);
      targetVehicleId = assignedVeh ? assignedVeh.id : orgVehs[0] ? orgVehs[0].id : "veh_unknown";
    } else {
      targetVehicleId = "veh_unknown";
    }
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const kbMatches = performRAGLookup(symptom_text_hindi, symptom_text_english || "");
  console.log(`RAG matched ${kbMatches.length} faults from database for diagnosis.`);
  const topMatch = kbMatches[0];
  let finalSymptomEnglish = symptom_text_english || "The engine stalls and is releasing black smoke.";
  if (acoustic_signal_class && acoustic_signal_class !== "normal") {
    if (!finalSymptomEnglish.includes("ENGINE IS NOT IN GOOD CONDITION")) {
      finalSymptomEnglish += " ENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.";
    }
  }
  const fallbackResult = {
    symptom_text_english: finalSymptomEnglish,
    diagnosis: topMatch.symptom_english + ". " + topMatch.likely_causes.join(", ") + " suspected.",
    severity: topMatch.severity,
    recommended_action: topMatch.recommended_action,
    estimated_cost_range: topMatch.typical_cost_range,
    agent_trace: {
      SupervisorAgent: "Local RAG Supervisor routed to heavy drivetrain diagnostics.",
      DiagnosticAgent: `Identified match with fault model ${topMatch.id} based on keywords and acoustical pattern of "${acoustic_signal_class || "none"}".`,
      TriageAgent: `Matched severity category: ${topMatch.severity.toUpperCase()}. Driver action advised.`,
      MaintenanceAgent: `Recommended immediate inspection of ${topMatch.likely_causes[0]}. Cost estimate standard: ${topMatch.typical_cost_range}.`,
      ReportAgent: "Compiled standard offline diagnostic report row successfully."
    }
  };
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    console.log("INFO: Resolving via server-side Local RAG heuristic (Gemini API Key not set/using placeholder).");
    const hTranslation = translateKnowledgeBaseToHindi(topMatch.id, fallbackResult.diagnosis, fallbackResult.recommended_action);
    let finalDiagnosis = hTranslation.diagnosis;
    if (acoustic_signal_class && acoustic_signal_class !== "normal") {
      if (!finalDiagnosis.includes("ENGINE IS NOT IN GOOD CONDITION")) {
        finalDiagnosis += "\n\nENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.";
      }
    }
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: fallbackResult.symptom_text_english,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: fallbackResult.severity,
      diagnosis: finalDiagnosis,
      recommended_action: hTranslation.recommended_action,
      estimated_cost_range: hTranslation.estimated_cost_range,
      synced_at: timestamp,
      // Mark synced since it hit server successfully
      agent_trace_json: JSON.stringify(fallbackResult.agent_trace)
    });
    return res.json({
      report: saved,
      warning: "Diagnostic pipeline resolved via server-side Local RAG heuristic (Gemini API was offline/unavailable)."
    });
  }
  try {
    console.log("Invoking True LangGraph 5-Agent Pipeline...");
    const parsed = await diagnosticGraph.invoke({
      symptom_hindi: symptom_text_hindi,
      image_base64,
      acoustic_signal: acoustic_signal_class || "normal",
      kb_matches: kbMatches
    });
    let finalDiagnosis = parsed.diagnosis;
    let finalSymptomEng = parsed.symptom_english || "";
    if (acoustic_signal_class && acoustic_signal_class !== "normal") {
      if (!finalDiagnosis.includes("ENGINE IS NOT IN GOOD CONDITION")) {
        finalDiagnosis += "\n\nENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.";
      }
      if (!finalSymptomEng.includes("ENGINE IS NOT IN GOOD CONDITION")) {
        finalSymptomEng += " ENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.";
      }
    }
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: finalSymptomEng,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: parsed.severity,
      diagnosis: finalDiagnosis,
      recommended_action: parsed.recommended_action,
      estimated_cost_range: parsed.estimated_cost_range,
      synced_at: timestamp,
      agent_trace_json: JSON.stringify(parsed.agent_trace)
    });
    return res.json({ report: saved });
  } catch (error) {
    console.warn("Gemini Multi-Agent API failed at runtime. Saving using local RAG fallback.", error.message);
    const hTranslation = translateKnowledgeBaseToHindi(topMatch.id, fallbackResult.diagnosis, fallbackResult.recommended_action);
    let finalDiagnosis = hTranslation.diagnosis;
    if (acoustic_signal_class && acoustic_signal_class !== "normal") {
      if (!finalDiagnosis.includes("ENGINE IS NOT IN GOOD CONDITION")) {
        finalDiagnosis += "\n\nENGINE IS NOT IN GOOD CONDITION. POSSIBLE ABNORMAL ENGINE SOUND DETECTED. PLEASE VISIT THE NEAREST SERVICE CENTER.";
      }
    }
    const saved = db.addFaultReport({
      vehicle_id: targetVehicleId,
      driver_id,
      timestamp,
      symptom_text_hindi,
      symptom_text_english: fallbackResult.symptom_text_english,
      acoustic_signal_class: acoustic_signal_class || null,
      severity: fallbackResult.severity,
      diagnosis: finalDiagnosis,
      recommended_action: hTranslation.recommended_action,
      estimated_cost_range: hTranslation.estimated_cost_range,
      synced_at: timestamp,
      // Mark synced since it hit server successfully
      agent_trace_json: JSON.stringify(fallbackResult.agent_trace)
    });
    return res.json({
      report: saved,
      warning: "Diagnostic pipeline resolved via server-side Local RAG fallback due to a transient API issue."
    });
  }
});
app.post("/api/fault-reports/sync", (req, res) => {
  const { reports } = req.body;
  if (!reports || !Array.isArray(reports)) {
    return res.status(400).json({ error: "Invalid sync package." });
  }
  console.log(`Syncing ${reports.length} pending offline fault reports from driver device...`);
  const syncedReports = [];
  for (const rep of reports) {
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
      synced_at: (/* @__PURE__ */ new Date()).toISOString(),
      agent_trace_json: rep.agent_trace_json
    });
    syncedReports.push(saved);
  }
  res.json({ success: true, syncedCount: syncedReports.length });
});
app.get("/api/fault-reports", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ reports: db.getFaultReports(org_id) });
});
app.get("/api/fault-reports/driver/:driverId", (req, res) => {
  res.json({ reports: db.getDriverFaultReports(req.params.driverId) });
});
app.post("/api/transcribe-audio", async (req, res) => {
  const { audio_base64, mime_type } = req.body;
  if (!audio_base64) {
    return res.status(400).json({ error: "Audio base64 data is required." });
  }
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      return res.json({
        hindi: "\u0907\u0902\u091C\u0928 \u092C\u093E\u0930 \u092C\u093E\u0930 \u092C\u0902\u0926 \u0939\u094B \u0930\u0939\u093E \u0939\u0948 \u0914\u0930 \u0927\u0941\u0906\u0902 \u0906 \u0930\u0939\u093E \u0939\u0948",
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
          type: import_genai.Type.OBJECT,
          properties: {
            hindi: { type: import_genai.Type.STRING, description: "Transcription of the driver symptom in Devanagari Hindi" },
            english: { type: import_genai.Type.STRING, description: "Direct English translation of the driver symptom" }
          },
          required: ["hindi", "english"]
        }
      }
    });
    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (error) {
    console.error("Audio transcription via Gemini failed:", error.message);
    res.status(500).json({ error: "Failed to transcribe audio. Please type the symptom manually." });
  }
});
app.post("/api/driver-copilot", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      return res.json({ reply: "\u0939\u093E\u0901 \u092D\u093E\u0908, \u0932\u0917\u0924\u093E \u0939\u0948 \u0917\u093E\u0921\u093C\u0940 \u0915\u093E \u092A\u093E\u0935\u0930 \u0915\u092E \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u090F\u092F\u0930 \u092B\u093C\u093F\u0932\u094D\u091F\u0930 \u0914\u0930 \u092A\u093E\u0907\u092A \u0915\u0947 \u0915\u094D\u0932\u0948\u0902\u092A \u091A\u0947\u0915 \u0915\u0930\u0947\u0902\u0964 \u092E\u0948\u0902 \u0905\u092D\u0940 \u0911\u092B\u0932\u093E\u0907\u0928 \u0932\u094B\u0915\u0932 \u092E\u094B\u0921 \u092E\u0947\u0902 \u0939\u0942\u0901\u0964" });
    }
    const ai = getGeminiClient();
    const systemInstruction = `
      You are VahanAI's Senior Fleet Diagnostic Copilot, an expert mechanic and technical support assistant for Indian commercial vehicles (Tata, Ashok Leyland, Mahindra trucks & buses).
      Answer the driver's questions or comments in a friendly, reassuring, simple, and mechanical expert manner.
      Respond strictly in clear, simple Hindi (written in Devanagari script) so that the truck driver can easily read and understand. Do not use complex English terms or Latin script unless absolutely necessary (like name of parts: 'radiator', 'injector' which can be written in Hindi like '\u0930\u0947\u0921\u093F\u090F\u091F\u0930' or '\u0907\u0902\u091C\u0947\u0915\u094D\u091F\u0930').
      Keep answers concise (max 3-4 sentences), highly practical, safety-first, and realistic for Indian highway breakdown scenarios.
    `;
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.content }]
        });
      }
    }
    contents.push({
      role: "user",
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
                type: import_genai.Type.OBJECT,
                properties: {
                  reason: { type: import_genai.Type.STRING, description: "Reason for the SOS alert" }
                },
                required: ["reason"]
              }
            },
            {
              name: "find_service_station",
              description: "Finds the nearest authorized service station. Use this when the driver asks for a nearby mechanic or service center.",
              parameters: {
                type: import_genai.Type.OBJECT,
                properties: {
                  location: { type: import_genai.Type.STRING, description: "Approximate location or 'current'" }
                }
              }
            },
            {
              name: "log_maintenance_request",
              description: "Logs a routine maintenance request. Use this when the driver asks to schedule a service, oil change, or non-urgent repair.",
              parameters: {
                type: import_genai.Type.OBJECT,
                properties: {
                  issue: { type: import_genai.Type.STRING, description: "The maintenance issue" }
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
        db.addSosAlert("org_rajpath", reason);
        toolResponseStr = "[\u{1F6A8} SOS ALERT SENT] \u0906\u092A\u0915\u0940 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 \u0938\u094D\u0925\u093F\u0924\u093F \u092B\u094D\u0932\u0940\u091F \u092E\u0948\u0928\u0947\u091C\u0930 \u0915\u094B \u092D\u0947\u091C \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 \u0930\u0939\u0947\u0902, \u092E\u0926\u0926 \u091C\u0932\u094D\u0926 \u0939\u0940 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964";
      } else if (call.name === "find_service_station") {
        toolResponseStr = "[\u{1F4CD} SERVICE STATION FOUND] \u092E\u0948\u0902\u0928\u0947 \u0906\u092A\u0915\u0947 \u0906\u0938-\u092A\u093E\u0938 3 Tata Motors \u0911\u0925\u0930\u093E\u0907\u091C\u094D\u0921 \u0938\u0930\u094D\u0935\u093F\u0938 \u0938\u094D\u091F\u0947\u0936\u0928 \u0916\u094B\u091C\u0947 \u0939\u0948\u0902\u0964 \u0906\u092A\u0915\u0940 \u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u092A\u0930 \u0928\u0947\u0935\u093F\u0917\u0947\u0936\u0928 \u0932\u093F\u0902\u0915 \u092D\u0947\u091C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948\u0964";
        actionObj = { type: "OPEN_MAPS", url: "https://www.google.com/maps/search/Tata+Motors+Authorized+Service+Station" };
      } else if (call.name === "log_maintenance_request") {
        const issue = call.args && call.args.issue ? call.args.issue : "\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0938\u0930\u094D\u0935\u093F\u0938";
        toolResponseStr = `[\u2699\uFE0F MAINTENANCE LOGGED] \u0906\u092A\u0915\u093E \u0938\u0930\u094D\u0935\u093F\u0938 \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F ("${issue}") \u092B\u094D\u0932\u0940\u091F \u092E\u0948\u0928\u0947\u091C\u0930 \u0915\u094B \u092D\u0947\u091C \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0907\u0938\u0947 \u0905\u0917\u0932\u0940 \u091F\u094D\u0930\u093F\u092A \u0915\u0947 \u092C\u093E\u0926 \u0936\u0947\u0921\u094D\u092F\u0942\u0932 \u0915\u093F\u092F\u093E \u091C\u093E\u090F\u0917\u093E\u0964`;
      }
      return res.json({ reply: toolResponseStr, action: actionObj });
    }
    res.json({ reply: response.text });
  } catch (error) {
    console.error("Driver copilot AI failed:", error.message);
    res.json({ reply: "\u092E\u093E\u092B\u093C \u0915\u0940\u091C\u093F\u092F\u0947 \u092D\u093E\u0908, \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u092E\u0947\u0902 \u0915\u0941\u091B \u0926\u093F\u0915\u094D\u0915\u0924 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u091A\u0947\u0915 \u0915\u0930\u0947\u0902 \u0915\u093F \u0907\u0902\u091C\u0928 \u0911\u092F\u0932 \u0915\u093E \u0932\u0947\u0935\u0932 \u0938\u0939\u0940 \u0939\u0948 \u0914\u0930 \u0915\u094B\u0908 \u0915\u0942\u0932\u0947\u0902\u091F \u0932\u0940\u0915 \u0924\u094B \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u0964" });
  }
});
app.get("/api/fleet-alerts", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ alerts: db.getFleetAlerts(org_id) });
});
app.post("/api/fleet-alerts/:id/resolve", (req, res) => {
  const resolved = db.resolveFleetAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: "Alert not found." });
  res.json({ success: true });
});
app.get("/api/fatigue-events", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ events: db.getFatigueEvents(org_id) });
});
app.post("/api/fatigue-events", (req, res) => {
  const { driver_id, ear_value, duration_seconds, severity } = req.body;
  if (!driver_id || ear_value === void 0) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  const newEvent = db.addFatigueEvent({
    driver_id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ear_value: parseFloat(ear_value),
    duration_seconds: parseInt(duration_seconds) || 5,
    severity: severity || "caution"
  });
  res.json({ event: newEvent });
});
app.get("/api/service-centers", (req, res) => {
  res.json({ centers: db.getServiceCenters() });
});
app.post("/api/whatsapp/webhook", async (req, res) => {
  const { From, Body } = req.body;
  if (!From || !Body) {
    return res.status(400).json({ error: "Missing standard From/Body parameters." });
  }
  console.log(`Received Twilio WhatsApp message from ${From}: "${Body}"`);
  const driver = db.getUsers().find((u) => From.includes(u.phone)) || { id: "driver_anon", name: "Anonymous Driver" };
  const vehicle = db.getVehicles("org_rajpath")[0];
  const kbMatches = performRAGLookup(Body, "");
  const topMatch = kbMatches[0];
  let diagnosisText = "";
  let severityText = "";
  let actions = "";
  const key = process.env.GEMINI_API_KEY;
  if (key && key !== "MY_GEMINI_API_KEY") {
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
    } catch (err) {
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
  res.set("Content-Type", "text/xml");
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
app.get("/api/sos-alerts", (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  res.json({ alerts: db.getSosAlerts(org_id) });
});
app.post("/api/sos-alerts", (req, res) => {
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
    timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    status: status || "SOS"
  });
  res.json({ alert: newAlert });
});
app.post("/api/sos-alerts/:id/resolve", (req, res) => {
  const resolved = db.resolveSosAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: "SOS alert not found." });
  res.json({ success: true });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  db.connectMongo().catch((err) => {
    console.error("Error initializing MongoDB connection:", err);
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VahanAI Server running at http://0.0.0.0:${PORT}`);
  });
}
if (!process.env.FIREBASE_FUNCTIONS) {
  startServer();
} else {
  db.connectMongo().catch((err) => {
    console.error("Error initializing MongoDB connection in function:", err);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
