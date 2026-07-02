const fs = require('fs');

let driverCode = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

const oldScheduleBody = `body: JSON.stringify({
                          org_id: 'org_solo',
                          vehicle_id: 'MH-12-AB-1234',
                          driver_id: 'u_driver1',
                          reason: 'Predictive AI Recommendation: Radiator Coolant Pump',
                          scheduled_date: new Date(Date.now() + 86400000).toISOString()
                        })`;

const newScheduleBody = `body: JSON.stringify({
                          org_id: user.org_id || 'org_solo',
                          vehicle_id: activeVehicle ? activeVehicle.registration_number : 'MH-12-YK-3561',
                          driver_id: user.id || 'u_driver1',
                          reason: 'Predictive AI Recommendation: Radiator Coolant Pump',
                          scheduled_date: new Date(Date.now() + 86400000).toISOString()
                        })`;

driverCode = driverCode.replace(oldScheduleBody, newScheduleBody);
fs.writeFileSync('src/driver-app/DriverApp.tsx', driverCode);
console.log("Updated DriverApp schedule body");
