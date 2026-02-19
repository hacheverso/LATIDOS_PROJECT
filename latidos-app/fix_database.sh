#!/bin/bash
echo "🧹 Limpiando caché y base de datos..."

# 1. Stop server (if running) - handled by user manually

# 2. Nuke caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# 3. Reinstall specific packages
echo "📦 Reinstalando cliente de base de datos..."
npm install @prisma/client@5.19.1
npm install prisma@5.19.1 --save-dev

# 4. Generate
echo "🔄 Regenerando esquema..."
npx prisma generate

echo "✅ ¡Listo! Ahora inicia el servidor con: npm run dev"
