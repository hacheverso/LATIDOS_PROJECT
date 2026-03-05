const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

/**
 * Mapping of hardcoded classes to V3 semantic tokens.
 */
const replacements = [
    // --- BACKGROUNDS ---
    { from: /bg-white/g, to: 'bg-card' },
    { from: /bg-slate-50(?![\/\-])/g, to: 'bg-header' },
    { from: /bg-gray-50(?![\/\-])/g, to: 'bg-header' },
    { from: /bg-slate-100(?![\/\-])/g, to: 'bg-header' },
    { from: /dark:bg-slate-900/g, to: '' },
    { from: /dark:bg-slate-800/g, to: '' },
    { from: /bg-slate-900/g, to: 'bg-primary' },

    // --- BORDERS ---
    { from: /border-slate-100/g, to: 'border-border' },
    { from: /border-slate-200/g, to: 'border-border' },
    { from: /border-slate-300/g, to: 'border-border' },
    { from: /border-slate-700/g, to: 'border-border' },
    { from: /border-slate-800/g, to: 'border-border' },
    { from: /border-gray-200/g, to: 'border-border' },
    { from: /border-gray-800/g, to: 'border-border' },
    { from: /dark:border-white\/10/g, to: '' },
    { from: /dark:border-slate-800/g, to: '' },
    { from: /border-white\/10/g, to: 'border-transparent dark:border-border' },

    // --- TEXT ---
    { from: /text-slate-700/g, to: 'text-primary' },
    { from: /text-slate-800/g, to: 'text-primary' },
    { from: /text-slate-900/g, to: 'text-primary' },
    { from: /text-gray-700/g, to: 'text-primary' },
    { from: /text-gray-900/g, to: 'text-primary' },
    { from: /text-slate-500/g, to: 'text-muted' },
    { from: /text-gray-500/g, to: 'text-muted' },
    { from: /dark:text-white/g, to: '' },
    { from: /dark:text-slate-300/g, to: '' },
    { from: /dark:text-slate-200/g, to: '' }
];

let filesModified = 0;

function processFile(filePath) {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let newContent = originalContent;

    replacements.forEach(rule => {
        newContent = newContent.replace(rule.from, rule.to);
    });

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        filesModified++;
        console.log(`Updated: ${filePath.replace(targetDir, '')}`);
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    });
}

console.log("Starting strictly safe V4 Mass Refactor...");
scanDir(targetDir);
console.log(`\nRefactor complete. Modified ${filesModified} files.`);
