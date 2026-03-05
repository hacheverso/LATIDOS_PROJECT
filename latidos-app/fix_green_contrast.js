const fs = require('fs');
const path = require('path');

const filesToFix = [
    "src/app/sales/SalesTable.tsx",
    "src/app/sales/collections/components/CollectionsTable.tsx",
    "src/app/finance/account/[id]/history/page.tsx",
    "src/app/finance/reconciliation/ReconciliationDashboard.tsx",
    "src/app/finance/FinanceDashboard.tsx",
    "src/app/finance/commissions/page.tsx",
    "src/app/logistics/components/DeliveryCard.tsx",
    "src/app/logistics/components/LogisticsBoard.tsx",
    "src/app/inventory/page.tsx",
    "src/app/inventory/audit/components/AuditTable.tsx",
    "src/app/inventory/InventoryTable.tsx",
    "src/app/directory/customers/[id]/CustomerProfileForm.tsx",
    "src/app/directory/customers/[id]/CustomerFinancialTabs.tsx",
    "src/app/directory/team/performance/page.tsx"
];

let fixedCount = 0;

filesToFix.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('dark:bg-brand') && !lines[i].includes('dark:bg-brand/10') && !lines[i].includes('dark:bg-brand/20')) {
            const originalLine = lines[i];

            lines[i] = lines[i].replace(/dark:text-emerald-\d{3}/g, 'dark:text-black');
            lines[i] = lines[i].replace(/dark:text-green-\d{3}/g, 'dark:text-black');
            lines[i] = lines[i].replace(/dark:text-success/g, 'dark:text-black');
            lines[i] = lines[i].replace(/text-inverse\/(10|20)/g, ''); // Removes opacity override

            // Fix any weird double spaces
            lines[i] = lines[i].replace(/\s{2,}(?= )/g, ' ');

            if (originalLine !== lines[i]) {
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        console.log("Fixed " + relPath);
        fixedCount++;
    }
});

console.log(`\nSuccessfully fixed text contrast on green backgrounds in ${fixedCount} files.`);
