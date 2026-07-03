const fs = require('fs');

let dbCode = fs.readFileSync('server/db.ts', 'utf8');

// Add createOrganization method to Database class
dbCode = dbCode.replace(
  /public getOrganizations\(\): Organization\[\] \{\s*return this\.data\.organizations;\s*\}/g,
  `public getOrganizations(): Organization[] {
      return this.data.organizations;
    }

    public createOrganization(org: Organization): Organization {
      // Avoid duplicate push if it already exists in cache
      if (!this.data.organizations.find(o => o.id === org.id)) {
        this.data.organizations.push(org);
      }
      this.asyncWrite('organizations', 'insert', null, org);
      this.save();
      return org;
    }`
);

fs.writeFileSync('server/db.ts', dbCode);
console.log('Added createOrganization method to server/db.ts');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Update signup in server.ts to use db.createOrganization
serverCode = serverCode.replace(
  /db\.getOrganizations\(\)\.push\(\{\s*id:\s*newOrgId,\s*name:\s*newOrgName,\s*plan_tier:\s*"free",\s*created_at:\s*new Date\(\)\.toISOString\(\)\s*\}\);/g,
  `db.createOrganization({
        id: newOrgId,
        name: newOrgName,
        plan_tier: "free",
        created_at: new Date().toISOString()
      });`
);

// Update invite endpoint in server.ts to implement the fallback self-healing mechanism
serverCode = serverCode.replace(
  /const matchedOrg = db\.getOrganizations\(\)\.find\(o => o\.id\.toLowerCase\(\) === candidate1\.toLowerCase\(\) \|\| o\.id\.toLowerCase\(\) === candidate2\.toLowerCase\(\)\);\s*if \(matchedOrg\) \{\s*org_id = matchedOrg\.id;\s*\}/g,
  `const matchedOrg = db.getOrganizations().find(o => o.id.toLowerCase() === candidate1.toLowerCase() || o.id.toLowerCase() === candidate2.toLowerCase());
        if (matchedOrg) {
          org_id = matchedOrg.id;
        } else {
          // Self-healing fallback: Check if there's a fleet manager with this org_id
          const matchedManager = db.getUsers().find(u => u.role === 'fleet_manager' && u.org_id && (u.org_id.toLowerCase() === candidate1.toLowerCase() || u.org_id.toLowerCase() === candidate2.toLowerCase()));
          if (matchedManager && matchedManager.org_id) {
            org_id = matchedManager.org_id;
            db.createOrganization({
              id: org_id,
              name: \`\${matchedManager.name}'s Transport Fleet\`,
              plan_tier: "free",
              created_at: new Date().toISOString()
            });
          }
        }`
);

fs.writeFileSync('server.ts', serverCode);
console.log('Updated server.ts signup and invite endpoints');
