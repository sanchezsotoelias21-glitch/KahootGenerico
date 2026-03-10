@echo off
REM Script de migracion a Vercel para Windows
REM Ejecutar: migrate-to-vercel.bat

echo.
echo 🚀 TeamKahoot — Preparando para Vercel...
echo.

REM Verificar que existe package.json
if not exist "package.json" (
  echo ❌ Error: package.json no encontrado
  exit /b 1
)

echo ✅ Encontrado package.json

REM Crear .env.local si no existe
if not exist ".env.local" (
  echo 📝 Creando .env.local...
  (
    echo DATABASE_URL=postgresql://user:password@localhost:5432/kahoot_dev
    echo MODERATOR_PIN=1234
    echo NODE_ENV=development
  ) > .env.local
  echo ✅ .env.local creado
) else (
  echo ⚠️  .env.local ya existe, saltando...
)

REM Instalar dependencias
echo.
echo 📦 Instalando dependencias...
call npm install
if %errorlevel% equ 0 (
  echo ✅ Dependencias instaladas
) else (
  echo ❌ Error instalando dependencias
  exit /b 1
)

REM Verificar vercel.json
if exist "vercel.json" (
  echo ✅ vercel.json configurado
) else (
  echo ⚠️  vercel.json no encontrado
)

REM Verificar api/index.js
if exist "api\index.js" (
  echo ✅ api/index.js encontrado
) else (
  echo ⚠️  api/index.js no encontrado — necesita configuración
)

echo.
echo ════════════════════════════════════════════════════
echo ✅ Preparación completada
echo ════════════════════════════════════════════════════
echo.
echo Próximos pasos:
echo.
echo 1. Sube tu código a GitHub:
echo    git add .
echo    git commit -m "Configure for Vercel"
echo    git push
echo.
echo 2. En Vercel Dashboard (vercel.com):
echo    - Importa este repositorio desde GitHub
echo    - Agrega variables de entorno:
echo      DATABASE_URL = tu-database-url
echo      MODERATOR_PIN = tu-pin-secreto
echo      NODE_ENV = production
echo.
echo 3. El deploy es automático desde main branch ✅
echo.
echo Documentación: ver VERCEL_DEPLOYMENT.md
echo.
pause
