const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
let totalUpdated = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // ─── Standalone text-slate-400 (not already followed by a dark: variant) ─
    // These are near-invisible in light mode on white/light backgrounds
    content = content.replace(/\btext-slate-400\b(?!\s+dark:)/g, "text-secondary");

    // ─── Standalone text-slate-600 (should be text-secondary for consistency) ─
    content = content.replace(/\btext-slate-600\b(?!\s+dark:)/g, "text-secondary");
    
    // ─── text-slate-400 dark:[anything] → just text-secondary ────────────────
    content = content.replace(/\btext-slate-400 dark:text-\[[^\]]+\]/g, "text-secondary");
    content = content.replace(/\btext-slate-400 dark:text-\w+/g, "text-secondary");

    // ─── text-slate-600 dark:[anything] → just text-secondary ────────────────
    content = content.replace(/\btext-slate-600 dark:text-\[[^\]]+\]/g, "text-secondary");
    content = content.replace(/\btext-slate-600 dark:text-\w+/g, "text-secondary");

    // ─── cleanup: dark:text-slate-600 standalone → dark:text-secondary ───────
    content = content.replace(/\bdark:text-slate-600\b/g, "dark:text-secondary");
    content = content.replace(/\bdark:text-slate-400\b/g, "dark:text-secondary");

    // ─── Fix bg-card where used as icon/decorative box needing background ────
    // Patterns like "hover:bg-slate-200 dark:bg-card" → hover:bg-hover
    content = content.replace(/hover:bg-slate-200 dark:bg-card/g, "hover:bg-hover");

    // ─── Clean up stale "text-primary " (trailing space from old refactors) ──
    // These don't break anything but are messy
    content = content.replace(/\btext-primary  /g, "text-primary ");

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalUpdated++;
        console.log("Updated: " + filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.next') continue;
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(srcDir);
console.log(`\nPhase 2 migration complete. ${totalUpdated} files updated.`);
