const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // ─── PHASE 1: Old inline dark: pairs → semantic tokens ─────────────────
    content = content.replace(/bg-white dark:bg-\[#1A1C1E\]/g, "bg-background");
    content = content.replace(/bg-slate-50 dark:bg-\[#1A1C1E\]/g, "bg-background");
    content = content.replace(/bg-slate-50 dark:bg-\[#141618\]/g, "bg-background");
    content = content.replace(/bg-white dark:bg-card/g, "bg-surface");
    content = content.replace(/bg-white dark:bg-\[#1E2023\]/g, "bg-surface");
    content = content.replace(/text-slate-900 dark:text-white/g, "text-primary");
    content = content.replace(/text-slate-800 dark:text-slate-200/g, "text-primary");
    content = content.replace(/text-slate-500 dark:text-slate-400/g, "text-muted");
    content = content.replace(/text-slate-400 dark:text-slate-500/g, "text-muted");
    content = content.replace(/text-slate-600 dark:text-slate-300/g, "text-muted");
    content = content.replace(/border-slate-100 dark:border-white\/10/g, "border-border");
    content = content.replace(/border-slate-200 dark:border-white\/10/g, "border-border");

    // ─── PHASE 2: FIX text-primary0 → text-secondary (broken Tailwind class) ─
    // This class does not exist in tailwind.config and silently produces no color.
    content = content.replace(/\btext-primary0\b/g, "text-secondary");

    // ─── PHASE 3: Fix hardcoded dark slate that has no dark variant ──────────
    // text-slate-300 alone (no dark: variant) is near-invisible on white bg in light mode
    // Replace: standalone text-slate-300 (not preceded by dark:) → text-muted
    content = content.replace(/(?<!dark:)text-slate-300(?!\S)/g, "text-muted");

    // ─── PHASE 4: Fix dark:text-primary0 → dark:text-secondary ──────────────
    content = content.replace(/dark:text-primary0/g, "dark:text-secondary");

    // ─── PHASE 5: Normalize inconsistent dark hover text ─────────────────────
    content = content.replace(/dark:hover:text-slate-300/g, "dark:hover:text-primary");

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
            // Skip node_modules and .next
            if (file === 'node_modules' || file === '.next') continue;
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

walk(srcDir);
console.log("Migration complete.");
