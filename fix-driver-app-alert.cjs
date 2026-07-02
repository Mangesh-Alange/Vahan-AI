const fs = require('fs');
let driverCode = fs.readFileSync('src/driver-app/DriverApp.tsx', 'utf8');

driverCode = driverCode.replace(
  /catch \((err: any|err)\) \{\s*alert\('Error scheduling inspection.'\);/g,
  "catch (err) { alert('Error scheduling inspection: ' + (err.message || JSON.stringify(err)));"
);

// Additionally, wait! I noticed in my previous regex `fix-driver-app-fetch.cjs`:
// I replaced the body but maybe the body replace was incorrect?
// Let's print out the fetch block just to be absolutely sure.

fs.writeFileSync('src/driver-app/DriverApp.tsx', driverCode);
console.log('Fixed error alert message');
