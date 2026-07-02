const fs = require('fs');

let driverCode = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

// The string in DriverApp is:
// org_id: 'org_solo',
// vehicle_id: 'MH-12-AB-1234',
// driver_id: 'u_driver1',

driverCode = driverCode.replace(
  /org_id:\s*'org_solo',\s*vehicle_id:\s*'MH-12-AB-1234',\s*driver_id:\s*'u_driver1',/g,
  "org_id: user?.org_id || 'org_rajpath',\n                          vehicle_id: activeVehicle?.registration_number || 'MH-12-YK-3561',\n                          driver_id: user?.id || 'u_driver1',"
);

fs.writeFileSync('src/driver-app/DriverApp.tsx', driverCode);
console.log('Fixed driver app fetch payload');
