const fs = require('fs');

// 1. Update server/db.ts
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

if (!dbCode.includes('interface ScheduledService {')) {
  dbCode = dbCode.replace('interface DatabaseSchema {', `export interface ScheduledService {
  id: string;
  org_id: string;
  vehicle_id: string;
  driver_id: string;
  scheduled_date: string;
  reason: string;
  status: "scheduled" | "completed";
}

interface DatabaseSchema {`);
}

if (!dbCode.includes('scheduled_services: ScheduledService[]')) {
  dbCode = dbCode.replace('sos_alerts: SosAlert[];', 'sos_alerts: SosAlert[];\n  scheduled_services: ScheduledService[];');
}

if (!dbCode.includes('scheduled_services: []')) {
  dbCode = dbCode.replace('sos_alerts: []', 'sos_alerts: [],\n      scheduled_services: []');
}

if (!dbCode.includes('async getScheduledServices(')) {
  const methods = `
  public async getScheduledServices(orgId: string): Promise<ScheduledService[]> {
    if (this.isMongoConnected && this.mongoDb) {
      try {
        const collection = this.mongoDb.collection<ScheduledService>('scheduled_services');
        return await collection.find({ org_id: orgId }).toArray();
      } catch (err) {
        console.error("Error fetching scheduled services from MongoDB:", err);
      }
    }
    return this.data.scheduled_services?.filter(s => s.org_id === orgId) || [];
  }

  public async addScheduledService(service: Omit<ScheduledService, 'id'>): Promise<ScheduledService> {
    const newService: ScheduledService = { ...service, id: 'svc_' + Date.now().toString() };
    if (this.isMongoConnected && this.mongoDb) {
      try {
        const collection = this.mongoDb.collection<ScheduledService>('scheduled_services');
        await collection.insertOne(newService);
        return newService;
      } catch (err) {
        console.error("Error inserting scheduled service to MongoDB:", err);
      }
    }
    if (!this.data.scheduled_services) this.data.scheduled_services = [];
    this.data.scheduled_services.push(newService);
    this.save();
    return newService;
  }
`;
  // Append before the last closing brace in the file
  dbCode = dbCode.replace(/\n\}\s*$/, methods + '\n}\n');
}

fs.writeFileSync('server/db.ts', dbCode);
console.log("Updated server/db.ts");

// 2. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
if (!serverCode.includes('/api/schedule-service')) {
  const serverMethods = `
// SCHEDULED SERVICES
app.get('/api/scheduled-services', async (req, res) => {
  const org_id = req.query.org_id as string || 'org_solo';
  const db = getDb();
  const services = await db.getScheduledServices(org_id);
  res.json({ services });
});

app.post('/api/schedule-service', express.json(), async (req, res) => {
  try {
    const { org_id, vehicle_id, driver_id, reason, scheduled_date } = req.body;
    const db = getDb();
    const service = await db.addScheduledService({
      org_id: org_id || 'org_solo',
      vehicle_id: vehicle_id || 'v_1',
      driver_id: driver_id || 'u_driver1',
      reason: reason || 'Routine Inspection',
      scheduled_date: scheduled_date || new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled'
    });
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule service' });
  }
});
`;
  // Append before `const PORT = process.env.PORT || 3000;`
  serverCode = serverCode.replace('const PORT = process.env.PORT || 3000;', serverMethods + '\nconst PORT = process.env.PORT || 3000;');
  fs.writeFileSync('server.ts', serverCode);
  console.log("Updated server.ts");
}
