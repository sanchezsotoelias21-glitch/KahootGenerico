#!/bin/bash
# Script de migración a Vercel

echo "🚀 TeamKahoot — Preparando para Vercel..."
echo ""

# Verificar que existe package.json
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json no encontrado"
  exit 1
fi

echo "✅ Encontrado package.json"

# Crear .env.local si no existe
if [ ! -f ".env.local" ]; then
  echo "📝 Creando .env.local..."
  cat > .env.local << EOL
DATABASE_URL=postgresql://user:password@localhost:5432/kahoot_dev
MODERATOR_PIN=1234
NODE_ENV=development
EOL
  echo "✅ .env.local creado"
else
  echo "⚠️  .env.local ya existe, saltando..."
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
npm install
if [ $? -eq 0 ]; then
  echo "✅ Dependencias instaladas"
else
  echo "❌ Error instalando dependencias"
  exit 1
fi

# Verificar vercel.json
if [ -f "vercel.json" ]; then
  echo "✅ vercel.json configurado"
else
  echo "⚠️  vercel.json no encontrado"
fi

# Crear api/index.js si no existe
if [ ! -f "api/index.js" ]; then
  echo "⚠️  api/index.js no encontrado — necesita configuración"
fi

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ Preparación completada"
echo "════════════════════════════════════════════════════"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Sube tu código a GitHub:"
echo "   git add ."
echo "   git commit -m 'Configure for Vercel'"
echo "   git push"
echo ""
echo "2. En Vercel Dashboard:"
echo "   - Importa este repositorio"
echo "   - Agrega variables de entorno:"
echo "     DATABASE_URL = tu-database-url"
echo "     MODERATOR_PIN = tu-pin-secreto"
echo "     NODE_ENV = production"
echo ""
echo "3. Deploy automático desde main branch ✅"
echo ""
echo "Documentación: ver VERCEL_DEPLOYMENT.md"
