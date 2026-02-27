const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Background Main replacements:
    content = content.replace(/bg-white dark:bg-\[#1A1C1E\]/g, "bg-background");
    content = content.replace(/bg-slate-50 dark:bg-\[#1A1C1E\]/g, "bg-background");
    content = content.replace(/bg-slate-50 dark:bg-\[#141618\]/g, "bg-background");

    // Background Surface replacements:
    content = content.replace(/bg-white dark:bg-card/g, "bg-surface");
    content = content.replace(/bg-white dark:bg-\[#1E2023\]/g, "bg-surface");
    content = content.replace(/bg-slate-100 dark:bg-white\/5/g, "bg-surface-hover"); // just using bg-surface here maybe?
    // Let's refine bg-surface-hover later, for now we want the exact replacements:

    // Text Main replacements:
    content = content.replace(/text-slate-900 dark:text-white/g, "text-foreground");
    content = content.replace(/text-slate-800 dark:text-slate-200/g, "text-foreground");

    // Text Muted replacements:
    content = content.replace(/text-slate-500 dark:text-slate-400/g, "text-muted");
    content = content.replace(/text-slate-400 dark:text-slate-500/g, "text-muted");
    content = content.replace(/text-slate-600 dark:text-slate-300/g, "text-muted");

    // Borders:
    content = content.replace(/border-slate-100 dark:border-white\/10/g, "border-border");
    content = content.replace(/border-slate-200 dark:border-white\/10/g, "border-border");

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
console.log("Migration complete.");
