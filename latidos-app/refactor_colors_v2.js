const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // First swap back the old mappings we just did in v1, directly to the v2 mappings
    content = content.replace(/bg-surface/g, 'bg-card');
    content = content.replace(/text-foreground/g, 'text-primary');

    // Swap pure white leftover backgrounds to cards where possible
    content = content.replace(/bg-white/g, 'bg-card');

    // Reverse incorrect direct double-swaps that might look like bg-card dark:bg-[#something]
    // because my previous script removed those.
    // If I just replaced bg-white, then combinations like bg-card dark:bg-card aren't right.
    content = content.replace(/bg-card dark:bg-card/g, 'bg-card');

    // Inputs: many times we use "bg-slate-50 dark:bg-white/5" for inputs. We maps this strictly to bg-input
    content = content.replace(/bg-slate-50 dark:bg-white\/5/g, 'bg-input');
    content = content.replace(/bg-slate-50 dark:bg-\[\#1A1C1E\]/g, 'bg-input'); // if left

    // Colors Operacionales (Green, Blue, Red)
    // Success:
    content = content.replace(/text-green-600 dark:text-green-400/g, 'text-success');
    content = content.replace(/text-emerald-500/g, 'text-success');
    content = content.replace(/text-emerald-600 dark:text-emerald-400/g, 'text-success');
    content = content.replace(/text-green-500/g, 'text-success');

    // Info/Transfer:
    content = content.replace(/text-blue-600 dark:text-blue-400/g, 'text-transfer');
    content = content.replace(/text-blue-500/g, 'text-transfer');

    // Debt/Alert/Danger:
    content = content.replace(/text-red-600 dark:text-red-400/g, 'text-debt');
    content = content.replace(/text-red-500/g, 'text-debt');

    // Residual hardcoded colors
    content = content.replace(/bg-\[\#121212\]/g, 'bg-background');
    content = content.replace(/bg-\[\#1A1C1E\]/g, 'bg-background');
    content = content.replace(/bg-\[\#1E2023\]/g, 'bg-card');
    content = content.replace(/bg-\[\#18181B\]/g, 'bg-card');

    // Text hardcoded
    content = content.replace(/text-\[\#0f172a\]/gi, 'text-primary');

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated: " + filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(srcDir);
// Let's also run on components
const componentsDir = path.join(__dirname, 'src', 'components');
if (fs.existsSync(componentsDir)) {
    walk(componentsDir);
}
console.log("V2 Deep Refactor complete.");
