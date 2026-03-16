const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
let totalUpdated = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // ── Page/section h1 headings ────────────────────────────────────────────
    // Patterns: text-3xl font-black, text-4xl font-black used as page titles
    // → text-heading (which includes font-weight 900 via Tailwind config)
    content = content.replace(/\btext-3xl font-black\b/g, "text-heading");
    content = content.replace(/\btext-4xl font-black\b/g, "text-heading");

    // ── Modal / card titles ──────────────────────────────────────────────────
    // text-xl font-black (modal/card headers) → text-subheading
    content = content.replace(/\btext-xl font-black\b/g, "text-subheading");
    content = content.replace(/\btext-2xl font-black\b/g, "text-subheading");

    // ── Clean up redundant font-black after text-heading/subheading if still present ─
    // (these are already baked into the Tailwind token, but leave them — no harm)

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
console.log(`\nHeading standardization complete. ${totalUpdated} files updated.`);
