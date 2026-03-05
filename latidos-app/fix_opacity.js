const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

let filesModified = 0;

function processFile(filePath) {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let newContent = originalContent;

    // Pattern to match any bg-card/10, dark:bg-card/90, etc.
    newContent = newContent.replace(/bg-card\/\d+/g, 'bg-card');

    // Pattern to match any bg-background/95, dark:bg-background/80, etc.
    newContent = newContent.replace(/bg-background\/\d+/g, 'bg-background');

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        filesModified++;
        console.log(`Cleaned valid opacities in: ${filePath.replace(targetDir, '')}`);
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

console.log("Starting opacity purger...");
scanDir(targetDir);
console.log(`\nComplete. Modified ${filesModified} files to remove invalid Tailwind opacity slashes.`);
