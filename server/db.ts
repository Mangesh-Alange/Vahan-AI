import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { faultKnowledgeBase } from './faultKnowledgeBase.js';
import { MongoClient, Db } from 'mongodb';

// Schemas
export interface Organization {
  id: string;
  name: string;
  plan_tier: "free" | "pro" | "enterprise";
  created_at: string;
}

export interface User {
  id: string;
  org_id: string | null;
  role: "driver" | "fleet_manager" | "admin";
  name: string;
  phone: string;
  password_hash: string;
  preferred_language: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  org_id: string;
  registration_number: string;
  make: "Tata" | "Ashok Leyland" | "Mahindra" | "Other";
  model: string;
  year: number;
  assigned_driver_id: string | null;
  mileage: number;
  last_service_date: string;
}

export interface FaultReport {
  id: string;
  vehicle_id: string;
  driver_id: string;
  timestamp: string;
  symptom_text_hindi: string;
  symptom_text_english: string;
  acoustic_signal_class: "normal" | "knock" | "squeal" | "misfire" | null;
  severity: "drive" | "caution" | "stop_immediately";
  diagnosis: string;
  recommended_action: string;
  estimated_cost_range: string;
  synced_at: string | null; // null means pending local sync
  agent_trace_json: string; // JSON string representing the multi-agent trace
}

export interface FleetAlert {
  id: string;
  org_id: string;
  pattern_description: string;
  related_fault_report_ids: string[];
  created_at: string;
  resolved: boolean;
}

export interface ServiceCenter {
  id: string;
  name: string;
  location: string;
  vehicle_makes_supported: string[];
}

export interface FatigueEvent {
  id: string;
  driver_id: string;
  timestamp: string;
  ear_value: number;
  duration_seconds: number;
  severity: "caution" | "critical";
}

export interface SosAlert {
  id: string;
  org_id: string;
  driver_id: string;
  driver_name: string;
  truck_number: string;
  current_route: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: "SOS" | "RESOLVED";
}

export interface ScheduledService {
  id: string;
  org_id: string;
  vehicle_id: string;
  driver_id: string;
  scheduled_date: string;
  reason: string;
  status: "scheduled" | "completed";
}

interface DatabaseSchema {
  organizations: Organization[];
  users: User[];
  vehicles: Vehicle[];
  fault_reports: FaultReport[];
  fleet_alerts: FleetAlert[];
  service_centers: ServiceCenter[];
  fatigue_events: FatigueEvent[];
  sos_alerts: SosAlert[];
  scheduled_services: ScheduledService[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'vahanai_db.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class Database {
  private data: DatabaseSchema;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected: boolean = false;
  private isConnecting: boolean = false;

  constructor() {
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

  public async connectMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log("MONGODB_URI environment variable is not defined. Using local file database.");
      return;
    }

    if (this.isConnecting || this.isMongoConnected) return;

    this.isConnecting = true;
    try {
      console.log("Connecting to MongoDB...");
      this.mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db('vahanai');
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

  private async syncDataToMongo() {
    if (!this.mongoDb) return;

    try {
      const collections = ['organizations', 'users', 'vehicles', 'fault_reports', 'fleet_alerts', 'service_centers', 'fatigue_events', 'sos_alerts'];
      const userCount = await this.mongoDb.collection('users').countDocuments();
      
      if (userCount === 0) {
        console.log("MongoDB is empty. Seeding MongoDB with local JSON database data...");
        for (const col of collections) {
          const items = (this.data as any)[col];
          if (items && items.length > 0) {
            await this.mongoDb.collection(col).insertMany(items);
          }
        }
        console.log("Successfully seeded MongoDB with local data.");
      } else {
        console.log("MongoDB has data. Pulling data from MongoDB to local cache...");
        for (const col of collections) {
          const items = await this.mongoDb.collection(col).find({}).toArray();
          const cleanedItems = items.map(item => {
            const { _id, ...rest } = item;
            return rest;
          });
          (this.data as any)[col] = cleanedItems;
        }
        this.save();
        console.log("Successfully synchronized local cache with MongoDB data.");
      }
    } catch (err) {
      console.error("Error during MongoDB sync:", err);
    }
  }

  private asyncWrite(collection: string, action: 'insert' | 'update' | 'delete', query?: any, data?: any) {
    if (!this.isMongoConnected || !this.mongoDb) return;
    
    (async () => {
      try {
        const col = this.mongoDb!.collection(collection);
        if (action === 'insert') {
          await col.insertOne(data);
        } else if (action === 'update') {
          await col.updateOne(query, { $set: data });
        } else if (action === 'delete') {
          await col.deleteOne(query);
        }
      } catch (err) {
        console.error(`MongoDB async write failed for collection ${collection}:`, err);
      }
    })();
  }

  public getStatus() {
    return {
      connected: this.isMongoConnected,
      usingMongo: this.isMongoConnected && !!process.env.MONGODB_URI,
      uriDefined: !!process.env.MONGODB_URI,
    };
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } catch (err) {
        console.error("Failed to parse database file. Initializing fresh.", err);
        this.seed();
      }
    } else {
      this.seed();
    }
  }

  private save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public seed() {
    console.log("Seeding database with default transport metadata...");

    const orgs: Organization[] = [
      { id: "org_rajpath", name: "Rajpath Roadways Logistics", plan_tier: "pro", created_at: "2026-01-10T10:00:00Z" },
      { id: "org_kedar", name: "Kedar Inter-State Logistics", plan_tier: "pro", created_at: "2026-02-15T12:00:00Z" }
    ];

    const passHash = hashPassword("password");

    const users: User[] = [
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

    const vehicles: Vehicle[] = [
      // Rajpath Roadways
      { id: "veh_1", org_id: "org_rajpath", registration_number: "MH-12-QW-5678", make: "Tata", model: "Signa 4825.T", year: 2023, assigned_driver_id: "driver_rajesh", mileage: 124500, last_service_date: "2026-05-10" },
      { id: "veh_2", org_id: "org_rajpath", registration_number: "MH-14-ER-9012", make: "Tata", model: "Prima 5530.S", year: 2024, assigned_driver_id: "driver_gurpreet", mileage: 86200, last_service_date: "2026-04-12" },
      { id: "veh_3", org_id: "org_rajpath", registration_number: "DL-01-AB-1234", make: "Ashok Leyland", model: "Dost Strong", year: 2022, assigned_driver_id: "driver_amit", mileage: 154000, last_service_date: "2026-05-18" },
      { id: "veh_4", org_id: "org_rajpath", registration_number: "MH-12-ZY-9988", make: "Mahindra", model: "Blazo X 49", year: 2023, assigned_driver_id: null, mileage: 98000, last_service_date: "2026-05-02" },
      { id: "veh_5", org_id: "org_rajpath", registration_number: "MH-12-PL-3344", make: "Tata", model: "Ace Gold Diesel", year: 2021, assigned_driver_id: null, mileage: 210000, last_service_date: "2026-03-30" },

      // Kedar Inter-State
      { id: "veh_6", org_id: "org_kedar", registration_number: "HR-26-XY-9012", make: "Mahindra", model: "Bolero Maxx Pick-Up", year: 2022, assigned_driver_id: "driver_sunil", mileage: 112000, last_service_date: "2026-05-15" },
      { id: "veh_7", org_id: "org_kedar", registration_number: "HR-55-AB-7777", make: "Ashok Leyland", model: "U-Truck 4019.T", year: 2023, assigned_driver_id: "driver_harpreet", mileage: 94500, last_service_date: "2026-05-20" },
      { id: "veh_8", org_id: "org_kedar", registration_number: "HR-26-QQ-3344", make: "Tata", model: "Signa 2823.K", year: 2023, assigned_driver_id: null, mileage: 101000, last_service_date: "2026-04-05" }
    ];

    // Seed realistic service centers in India
    const service_centers: ServiceCenter[] = [
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

    // Seed realistic historical fault reports
    const mockReports: FaultReport[] = [
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
        estimated_cost_range: "₹4,500 - ₹9,500",
        synced_at: "2026-06-15T10:14:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing brake failure symptom to Triage and Maintenance specialists." },
          DiagnosticAgent: { log: "Matched symptom with knowledge base kb_02 (brake squealing and pedal vibration). High confidence." },
          TriageAgent: { log: "Braking fluid pressure dropping. Setting severity to STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Estimated cost ₹4,500 - ₹9,500. Directing to Sanjay Gandhi Hub SC (sc_01)." }
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
        estimated_cost_range: "₹800 - ₹1,800",
        synced_at: "2026-06-20T14:45:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Identified accessory rattle." },
          DiagnosticAgent: { log: "Non-critical tapping. Matches kb_36 (exhaust rattling)." },
          TriageAgent: { log: "Safe to drive to dispatch point. Severity: CAUTION." },
          MaintenanceAgent: { log: "Estimate ₹800. Simple bolt fastening." }
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
        estimated_cost_range: "₹6,000 - ₹12,000",
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
        estimated_cost_range: "₹2,500 - ₹5,500",
        synced_at: "2026-06-25T11:20:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Symptom mapped to clutch actuation hydraulic loop." },
          DiagnosticAgent: { log: "Matches kb_06 (clutch master cylinder leak). Moderate confidence." },
          TriageAgent: { log: "Vehicle can drive with rev-matching or cautious single-gear crawl. Severity: CAUTION." },
          MaintenanceAgent: { log: "Estimate ₹2,500. Hydraulic seal repair." }
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
        estimated_cost_range: "₹1,200 - ₹2,800",
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
        estimated_cost_range: "₹9,000 - ₹20,000",
        synced_at: "2026-06-29T10:00:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Analyzing fuel rail pressure drop." },
          DiagnosticAgent: { log: "Corresponds directly to common rail fuel injector blockage (kb_01)." },
          TriageAgent: { log: "Risk of engine cylinder damage. Severity: STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Common rail cleaning required. Estimate ₹12,000." }
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
        estimated_cost_range: "₹8,500 - ₹18,000",
        synced_at: "2026-06-29T15:30:00Z",
        agent_trace_json: JSON.stringify({
          SupervisorAgent: { log: "Routing exhaust smoke anomaly." },
          DiagnosticAgent: { log: "Matches kb_01 (injector clogging). High confidence." },
          TriageAgent: { log: "Urgent. Severity: STOP_IMMEDIATELY." },
          MaintenanceAgent: { log: "Injectors require testing on Bosch calibration bench." }
        })
      }
    ];

    // Seed fleet alerts
    const fleet_alerts: FleetAlert[] = [
      {
        id: "alert_1",
        org_id: "org_rajpath",
        pattern_description: "Fuel System Issues (Fuel Injector failures / Black smoke) detected on multiple Tata Signa/Prima vehicles within a 24-hour window. Possible adulterated diesel batch at NH-44 fueling hub.",
        related_fault_report_ids: ["rep_pattern_1", "rep_pattern_2"],
        created_at: "2026-06-29T16:00:00Z",
        resolved: false
      }
    ];

    // Seed fatigue events
    const fatigue_events: FatigueEvent[] = [
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
      sos_alerts: []
    };

    this.save();
    console.log("Database successfully seeded.");
  }

  // Organizations API
  public getOrganizations(): Organization[] {
    return this.data.organizations;
  }

  // Users API
  public getUsers(): User[] {
    return this.data.users;
  }

  public createUser(user: Omit<User, "id" | "password_hash" | "created_at">, passwordText: string): User {
    const id = "user_" + Math.random().toString(36).substring(2, 9);
    const password_hash = hashPassword(passwordText);
    const created_at = new Date().toISOString();
    const newUser: User = { ...user, id, password_hash, created_at };
    this.data.users.push(newUser);
    this.save();
    this.asyncWrite('users', 'insert', undefined, newUser);
    return newUser;
  }

  public authenticate(phone: string, passwordText: string): User | null {
    const hash = hashPassword(passwordText);
    const user = this.data.users.find(u => u.phone === phone && u.password_hash === hash);
    return user || null;
  }

  // Vehicles API
  public getVehicles(orgId: string): Vehicle[] {
    return this.data.vehicles.filter(v => v.org_id === orgId);
  }

  public addVehicle(vehicle: Omit<Vehicle, "id">): Vehicle {
    const id = "veh_" + Math.random().toString(36).substring(2, 9);
    const newVehicle = { ...vehicle, id };
    this.data.vehicles.push(newVehicle);
    this.save();
    this.asyncWrite('vehicles', 'insert', undefined, newVehicle);
    return newVehicle;
  }

  public updateVehicle(id: string, updates: Partial<Omit<Vehicle, "id">>): Vehicle | null {
    const v = this.data.vehicles.find(item => item.id === id);
    if (!v) return null;
    Object.assign(v, updates);
    this.save();
    this.asyncWrite('vehicles', 'update', { id }, updates);
    return v;
  }

  public deleteVehicle(id: string): boolean {
    const index = this.data.vehicles.findIndex(v => v.id === id);
    if (index === -1) return false;
    this.data.vehicles.splice(index, 1);
    this.save();
    this.asyncWrite('vehicles', 'delete', { id });
    return true;
  }

  // Fault Reports API
  public getFaultReports(orgId: string): (FaultReport & { vehicle_reg?: string; driver_name?: string })[] {
    const vehicles = this.getVehicles(orgId);
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
    const userMap = new Map(this.data.users.map(u => [u.id, u]));

    const reports = this.data.fault_reports.filter(r => vehicleMap.has(r.vehicle_id));
    return reports.map(r => {
      const v = vehicleMap.get(r.vehicle_id);
      const d = userMap.get(r.driver_id);
      return {
        ...r,
        vehicle_reg: v ? v.registration_number : undefined,
        driver_name: d ? d.name : undefined
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getDriverFaultReports(driverId: string): FaultReport[] {
    return this.data.fault_reports
      .filter(r => r.driver_id === driverId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addFaultReport(report: Omit<FaultReport, "id">): FaultReport {
    const id = "rep_" + Math.random().toString(36).substring(2, 9);
    const newReport = { ...report, id };
    this.data.fault_reports.push(newReport);
    this.save();
    this.asyncWrite('fault_reports', 'insert', undefined, newReport);

    // Trigger pattern alerts grouping logic to check if a new fleet_alert should be generated
    this.checkAndGeneratePatternAlerts();

    return newReport;
  }

  // Fleet Alerts API
  public addSosAlert(org_id: string, reason: string): FleetAlert {
    const newAlert: FleetAlert = {
      id: 'sos_' + Math.random().toString(36).substring(2, 9),
      org_id,
      pattern_description: 'SOS EMERGENCY ALERT: ' + reason,
      severity: 'high',
      related_fault_report_ids: [],
      resolved: false,
      created_at: Date.now()
    };
    this.data.fleet_alerts.unshift(newAlert);
    this.save();
    this.asyncWrite('fleet_alerts', 'insert', undefined, newAlert);
    return newAlert;
  }

  public getFleetAlerts(orgId: string): FleetAlert[] {
    return this.data.fleet_alerts.filter(a => a.org_id === orgId);
  }

  public resolveFleetAlert(id: string): boolean {
    const alert = this.data.fleet_alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.resolved = true;
    this.save();
    this.asyncWrite('fleet_alerts', 'update', { id }, { resolved: true });
    return true;
  }

  // Service Centers API
  public getServiceCenters(): ServiceCenter[] {
    return this.data.service_centers;
  }

  // Fatigue Events API
  public getFatigueEvents(orgId: string): (FatigueEvent & { driver_name?: string; vehicle_reg?: string })[] {
    const userMap = new Map(this.data.users.map(u => [u.id, u]));
    const vehicleMap = new Map(this.data.vehicles.map(v => [v.assigned_driver_id, v]));

    // Filter to drivers belonging to this org
    const orgDrivers = new Set(this.data.users.filter(u => u.org_id === orgId && u.role === "driver").map(u => u.id));

    return this.data.fatigue_events
      .filter(fe => orgDrivers.has(fe.driver_id))
      .map(fe => {
        const d = userMap.get(fe.driver_id);
        const v = vehicleMap.get(fe.driver_id);
        return {
          ...fe,
          driver_name: d ? d.name : undefined,
          vehicle_reg: v ? v.registration_number : undefined
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addFatigueEvent(event: Omit<FatigueEvent, "id">): FatigueEvent {
    const id = "fe_" + Math.random().toString(36).substring(2, 9);
    const newEvent = { ...event, id };
    this.data.fatigue_events.push(newEvent);
    this.save();
    this.asyncWrite('fatigue_events', 'insert', undefined, newEvent);
    return newEvent;
  }

  // Fleet Pattern Detection (Relational grouping logic)
  // Groups similar diagnosis texts / symptoms within a 48 hour window for vehicles of same org
  private checkAndGeneratePatternAlerts() {
    console.log("Running cross-vehicle Fleet Pattern Detection algorithm...");
    const orgs = this.getOrganizations();

    for (const org of orgs) {
      const reports = this.data.fault_reports.filter(r => {
        const v = this.data.vehicles.find(veh => veh.id === r.vehicle_id);
        return v && v.org_id === org.id;
      });

      // Filter to unresolved reports in the last 48 hours
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const recentReports = reports.filter(r => new Date(r.timestamp) >= fortyEightHoursAgo);

      // Group reports by keyword matches in symptom/diagnosis
      const keywords = ["injector", "break", "clutch", "radiator", "suspension", "power steering", "air pressure", "leak", "turbo", "battery", "smoke"];
      
      for (const keyword of keywords) {
        // Find reports containing this keyword in english symptom, english diagnosis, or recommended action
        const matched = recentReports.filter(r => 
          r.symptom_text_english.toLowerCase().includes(keyword) || 
          r.diagnosis.toLowerCase().includes(keyword)
        );

        // Group by vehicle_id to ensure this keyword occurs across AT LEAST 2 DISTINCT VEHICLES!
        const distinctVehicles = new Set(matched.map(r => r.vehicle_id));

        if (distinctVehicles.size >= 2) {
          // Check if an alert already exists with identical reports
          const matchedIds = matched.map(m => m.id).sort();
          const alertExists = this.data.fleet_alerts.some(alert => 
            alert.org_id === org.id &&
            alert.related_fault_report_ids.length === matchedIds.length &&
            [...alert.related_fault_report_ids].sort().every((v, i) => v === matchedIds[i])
          );

          if (!alertExists) {
            // Generate a beautiful, specific description
            const vehiclesList = matched.map(m => {
              const v = this.data.vehicles.find(veh => veh.id === m.vehicle_id);
              return v ? `${v.make} ${v.model} (${v.registration_number})` : 'Vehicle';
            }).filter((v, i, self) => self.indexOf(v) === i);

            const pattern_description = `Pattern detected: Multi-vehicle issue related to "${keyword}" affecting ${vehiclesList.join(" and ")} within 48 hours. Potential localized environmental, routing, or fuel-adulteration trigger.`;
            
            const newAlert: FleetAlert = {
              id: "alert_" + Math.random().toString(36).substring(2, 9),
              org_id: org.id,
              pattern_description,
              related_fault_report_ids: matched.map(m => m.id),
              created_at: new Date().toISOString(),
              resolved: false
            };

            this.data.fleet_alerts.push(newAlert);
            this.asyncWrite('fleet_alerts', 'insert', undefined, newAlert);
            console.log(`NEW FLEET PATTERN ALERT CREATED: ${pattern_description}`);
          }
        }
      }
    }
    this.save();
  }

  // SOS Alerts API
  public getSosAlerts(orgId: string): SosAlert[] {
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    return this.data.sos_alerts.filter(a => a.org_id === orgId);
  }

  public addSosAlertRecord(alert: Omit<SosAlert, "id">): SosAlert {
    const id = "sos_" + Math.random().toString(36).substring(2, 9);
    const newAlert = { ...alert, id };
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    this.data.sos_alerts.push(newAlert);
    this.save();
    this.asyncWrite('sos_alerts', 'insert', undefined, newAlert);
    return newAlert;
  }

  public resolveSosAlert(id: string): boolean {
    if (!this.data.sos_alerts) {
      this.data.sos_alerts = [];
    }
    const alert = this.data.sos_alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.status = "RESOLVED";
    this.save();
    this.asyncWrite('sos_alerts', 'update', { id }, { status: "RESOLVED" });
    return true;
  }
}

// Global DB instance
export const db = new Database();
