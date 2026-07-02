const fs = require('fs');
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

if (!dbCode.includes('public getScheduledServices(orgId')) {
  const insertIndex = dbCode.lastIndexOf('}');
  const methods = `
  public getScheduledServices(orgId: string): any[] {
    return (this.data.scheduled_services || []).filter((s: any) => s.org_id === orgId);
  }

  public addScheduledService(service: any): void {
    if (!this.data.scheduled_services) this.data.scheduled_services = [];
    service.id = 'svc_' + Date.now();
    this.data.scheduled_services.push(service);
    this.saveData();
  }
`;
  dbCode = dbCode.slice(0, insertIndex) + methods + dbCode.slice(insertIndex);
  fs.writeFileSync('server/db.ts', dbCode);
}

let serverCode = fs.readFileSync('server.ts', 'utf8');
if (!serverCode.includes('app.post(\'/api/schedule-service\'')) {
  const endpoint = `
app.get('/api/scheduled-services', (req, res) => {
  const { org_id } = req.query;
  if (!org_id) return res.status(400).json({ error: "org_id is required." });
  const services = db.getScheduledServices(org_id as string);
  res.json({ services });
});

app.post('/api/schedule-service', (req, res) => {
  const data = req.body;
  if (!data.org_id || !data.vehicle_id) {
    return res.status(400).json({ error: "org_id and vehicle_id are required." });
  }
  db.addScheduledService(data);
  res.json({ success: true });
});
`;
  serverCode = serverCode.replace('app.get(\'/api/vehicles\', (req, res) => {', endpoint + '\napp.get(\'/api/vehicles\', (req, res) => {');
  fs.writeFileSync('server.ts', serverCode);
}
console.log('updated server and db');
