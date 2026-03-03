const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');
const componentsDir = path.join(__dirname, 'src', 'components');

const regexesToReplace = [
    // Standard thick Slate 800 borders acting as white lines in dark mode
    {
        pattern: /border-slate-800/g,
        replacement: 'border-border'
    },
    // Same for Slate 700 with or without opacity
    {
        pattern: /border-slate-700\/50/g,
        replacement: 'border-border'
    },
    {
        pattern: /border-slate-700/g,
        replacement: 'border-border'
    },
    // We already cleaned white/10 in earlier scripts, but just in case:
    {
        pattern: /dark:border-white\/10/g,
        replacement: 'border-border'
    },
    {
        pattern: /dark:border-white\/5/g,
        replacement: 'border-border'
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
                console.log(`Eliminados: ${fullPath.replace(__dirname, '')} (-${fileReplacements} bordes rígidos)`);
                filesChangedCount++;
                totalReplacements += fileReplacements;
            }
        }
    }
}

console.log('--- EMPEZANDO V3.2 PURGA DE BORDES RÍGIDOS ---');
processDirectory(srcDir);
if (fs.existsSync(componentsDir)) {
    processDirectory(componentsDir);
}
console.log('-----------------------------------');
console.log(`Refactor Completo!`);
console.log(`Archivos purificados: ${filesChangedCount}`);
console.log(`Total de líneas/bordes destruidos: ${totalReplacements}`);
console.log('Por favor corre npm run build para verificar.');
