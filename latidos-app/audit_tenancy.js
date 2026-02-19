const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const targetDir = path.join(__dirname, 'src', 'app');
let suspiciousQueries = [];

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('actions.ts') || filePath.endsWith('payment-actions.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Attempting a simple heuristic: find prisma.model.method({ ... })
    // If we find a where: { ... } that does NOT contain organizationId

    const regex = /prisma\.[a-zA-Z]+\.(findMany|findFirst|findUnique|update|delete|count|updateMany|deleteMany)\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const method = match[1];
      const args = match[2];
      
      // If there's a where clause
      if (args.includes('where:')) {
        // Very rough check: does it mention organizationId?
        // Note: this might miss complex nested wheres or variables, but it's a good first pass.
        if (!args.includes('organizationId')) {
           // Skip if it's Instance, User, Operator, SaleAudit since they might be handled differently
           const fullMatch = match[0];
           if (fullMatch.includes('prisma.operator.') || fullMatch.includes('prisma.user.') || fullMatch.includes('prisma.organization.')) {
               continue; 
           }
           suspiciousQueries.push({ file: filePath.replace(__dirname, ''), query: fullMatch.slice(0, 100).replace(/\n/g, ' ') + '...' });
        }
      }
    }
  }
});

console.log(JSON.stringify(suspiciousQueries, null, 2));
