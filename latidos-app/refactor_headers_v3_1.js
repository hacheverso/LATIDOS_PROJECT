const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');
const componentsDir = path.join(__dirname, 'src', 'components');

const regexesToReplace = [
    // The main offender (hex opacity bug)
    {
        pattern: /bg-slate-50\/80\s+dark:bg-background\/80/g,
        replacement: 'bg-header'
    },
    {
        pattern: /bg-slate-50\/50\s+dark:bg-background\/80/g,
        replacement: 'bg-header'
    },
    // The standard hardcoded gray bars
    {
        pattern: /bg-slate-50\s+dark:bg-white\/5/g,
        replacement: 'bg-header'
    },
    {
        pattern: /bg-slate-100\s+dark:bg-white\/5/g,
        replacement: 'bg-header'
    },
    // Transparency variants
    {
        pattern: /bg-slate-50\/50\s+dark:bg-white\/5/g,
        replacement: 'bg-header'
    },
    {
        pattern: /bg-slate-100\/50\s+dark:bg-white\/5/g,
        replacement: 'bg-header'
    },
    {
        pattern: /bg-slate-50\s+dark:bg-background\/80/g,
        replacement: 'bg-header'
    },
    {
        pattern: /bg-slate-100\s+dark:bg-background\/80/g,
        replacement: 'bg-header'
    },
    // Sometimes it's written the other way around
    {
        pattern: /dark:bg-white\/5\s+bg-slate-50/g,
        replacement: 'bg-header'
    }
];

let filesChangedCount = 0;
let totalReplacements = 0;

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let fileChanged = false;
            let fileReplacements = 0;

            for (const { pattern, replacement } of regexesToReplace) {
                const matches = content.match(pattern);
                if (matches) {
                    fileReplacements += matches.length;
                    content = content.replace(pattern, replacement);
                    fileChanged = true;
                }
            }

            if (fileChanged) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath.replace(__dirname, '')} (-${fileReplacements} bad headers)`);
                filesChangedCount++;
                totalReplacements += fileReplacements;
            }
        }
    }
}

console.log('--- STARTING V3.1 HEADER REFACTOR ---');
processDirectory(srcDir);
if (fs.existsSync(componentsDir)) {
    processDirectory(componentsDir);
}
console.log('-----------------------------------');
console.log(`Refactor Complete!`);
console.log(`Files modified: ${filesChangedCount}`);
console.log(`Total header instances replaced: ${totalReplacements}`);
console.log('Please run npm run build to verify.');
