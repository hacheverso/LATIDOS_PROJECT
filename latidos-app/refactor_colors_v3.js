const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'src', 'app'),
    path.join(__dirname, 'src', 'components')
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. NEUTRALIDAD PURA Y BACKGROUNDS MUERTOS
    // Si quedan rastros de slate/zinc/gray oscuros forzados en fondos de tarjetas que se saltaban el script...
    content = content.replace(/bg-slate-900/g, 'bg-card');
    content = content.replace(/bg-zinc-900/g, 'bg-card');
    content = content.replace(/bg-gray-800/g, 'bg-card');
    content = content.replace(/bg-gray-900/g, 'bg-card');

    // 2. CORREGIR TEXTOS OSCUROS HUERFANOS
    content = content.replace(/text-slate-900/g, 'text-primary');
    content = content.replace(/text-gray-900/g, 'text-primary');
    content = content.replace(/text-slate-800/g, 'text-primary');
    content = content.replace(/text-gray-800/g, 'text-primary');
    content = content.replace(/text-zinc-900/g, 'text-primary');
    content = content.replace(/text-zinc-800/g, 'text-primary');

    // Y sus contrapartes claras explicitamente forzadas:
    content = content.replace(/dark:text-white/g, ''); // Deja que primary haga su trabajo 
    content = content.replace(/dark:text-slate-100/g, '');
    content = content.replace(/dark:text-gray-100/g, '');
    content = content.replace(/text-slate-50/g, 'text-primary'); // Errores inversos

    // Muted fixes
    content = content.replace(/text-slate-500/g, 'text-muted');
    content = content.replace(/text-gray-500/g, 'text-muted');
    content = content.replace(/text-zinc-500/g, 'text-muted');

    // 3. HOVERS UNIFICADOS 
    content = content.replace(/hover:bg-slate-50/g, 'hover:bg-hover');
    content = content.replace(/hover:bg-slate-100/g, 'hover:bg-hover');
    content = content.replace(/hover:bg-gray-50/g, 'hover:bg-hover');
    content = content.replace(/hover:bg-gray-100/g, 'hover:bg-hover');
    content = content.replace(/hover:bg-white\/5/g, 'hover:bg-hover');
    content = content.replace(/hover:bg-white\/10/g, 'hover:bg-hover');
    content = content.replace(/dark:hover:bg-white\/5/g, 'hover:bg-hover');
    content = content.replace(/dark:hover:bg-\[\#1E2023\]/g, 'hover:bg-hover');
    content = content.replace(/dark:hover:bg-card/g, ''); // Eliminar conflictivo

    // 4. MUERTE A LOS BORDES
    content = content.replace(/border-slate-200/g, 'border-border');
    content = content.replace(/border-slate-300/g, 'border-border');
    content = content.replace(/border-gray-200/g, 'border-border');
    content = content.replace(/border-gray-300/g, 'border-border');
    content = content.replace(/dark:border-white\/10/g, 'border-border');
    content = content.replace(/dark:border-white\/5/g, 'border-border');
    content = content.replace(/dark:border-slate-700/g, 'border-border');
    content = content.replace(/dark:border-slate-800/g, 'border-border');

    // 5. MARCA Y VERDE ELÉCTRICO
    content = content.replace(/bg-green-600 dark:bg-green-500/g, 'bg-brand text-inverse');
    content = content.replace(/bg-green-500 dark:bg-green-600/g, 'bg-brand text-inverse');
    content = content.replace(/bg-emerald-500 dark:bg-emerald-600/g, 'bg-brand text-inverse');
    content = content.replace(/bg-emerald-600 dark:bg-emerald-500/g, 'bg-brand text-inverse');
    content = content.replace(/bg-green-500/g, 'bg-brand text-inverse');
    content = content.replace(/bg-emerald-500/g, 'bg-brand text-inverse');

    content = content.replace(/hover:bg-green-600/g, 'hover:opacity-90');
    content = content.replace(/hover:bg-emerald-600/g, 'hover:opacity-90');

    content = content.replace(/ring-green-500/g, 'ring-brand');
    content = content.replace(/ring-emerald-500/g, 'ring-brand');
    content = content.replace(/focus:border-green-500/g, 'focus:border-brand');
    content = content.replace(/focus:border-emerald-500/g, 'focus:border-brand');

    // Limpieza de colisiones
    content = content.replace(/dark:text-muted/gi, '');
    content = content.replace(/ text-primary text-primary/g, ' text-primary ');

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Updated (V3): " + filePath);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
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

targetDirs.forEach(dir => walk(dir));
console.log("V3 Deep Neutrality Refactor complete.");
