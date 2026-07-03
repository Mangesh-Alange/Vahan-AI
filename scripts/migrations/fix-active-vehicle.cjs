const fs = require('fs');

let code = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');
code = code.replace(
  /vehicle_id:\s*activeVehicle\?\.registration_number\s*\|\|\s*'MH-12-YK-3561',/g,
  "vehicle_id: vehicles.find(v => v.id === selectedVehicleId)?.registration_number || 'MH-12-YK-3561',"
);

fs.writeFileSync('src/driver-app/DriverApp.tsx', code);
console.log('Fixed activeVehicle ReferenceError');
