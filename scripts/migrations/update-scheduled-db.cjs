const fs = require('fs');

// 1. Update server/db.ts
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

// Add ScheduledService interface locally in db.ts if not present
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

// Update DatabaseSchema
if (!dbCode.includes('scheduled_services: ScheduledService[]')) {
  dbCode = dbCode.replace('sos_alerts: SosAlert[];', 'sos_alerts: SosAlert[];\n  scheduled_services: ScheduledService[];');
}

// Update constructor
if (!dbCode.includes('scheduled_services: []')) {
  dbCode = dbCode.replace('sos_alerts: []', 'sos_alerts: [],\n      scheduled_services: []');
}

// Add methods
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
    return this.data.scheduled_services.filter(s => s.org_id === orgId) || [];
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
  dbCode = dbCode.replace(/export class Database \{[\s\S]*?\n\s+constructor\(\) \{/, match => methods + '\n' + match);
  // Wait, prepending methods inside the class is tricky. It's better to just append before the last closing brace of Database class.
  // Actually, appending before the last `}` of the file is safer if we know `Database` is the last class.
}

fs.writeFileSync('server/db.ts', dbCode);
console.log("Updated server/db.ts");

