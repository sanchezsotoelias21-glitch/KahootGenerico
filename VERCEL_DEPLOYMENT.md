# 🚀 Guía de Despliegue en Vercel

## Requisitos Previos

- Cuenta de Vercel (https://vercel.com)
- Git instalado
- PostgreSQL database (local o en la nube)
- Node.js 18+

## Paso 1: Preparar el Repositorio Local

```bash
# Inicializar git si no lo has hecho
git init
git add .
git commit -m "Initial commit - TeamKahoot"

# Crear repositorio en GitHub
# (ir a https://github.com/new y seguir las instrucciones)

git remote add origin https://github.com/tu-usuario/kahool-generico.git
git branch -M main
git push -u origin main
```

## Paso 2: Desplegar en Vercel

### Opción A: Via Dashboard de Vercel (RECOMENDADO)

1. Accede a [vercel.com](https://vercel.com)
2. Click en **"New Project"**
3. Selecciona tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Node.js
5. En **Environment Variables**, agrega:
   - `DATABASE_URL`: Tu URL de PostgreSQL
   - `MODERATOR_PIN`: Tu PIN de moderador (ej: 1234)
   - `NODE_ENV`: `production`
6. Click en **"Deploy"**

### Opción B: Via CLI de Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar
vercel

# En el setup interactivo:
# - Selecciona tu cuenta de Vercel
# - Vincula tu proyecto Git
# - Responde las preguntas de configuración
```

## Paso 3: Configurar Base de Datos

### Base de Datos Recomendadas:

**Opción 1: Railway (RECOMENDADO)**
- Accede a [railway.app](https://railway.app)
- Crea una nueva app con PostgreSQL
- Copia la `DATABASE_URL` y agrégala a Vercel

**Opción 2: ElephantSQL**
- Accede a [elephantsql.com](https://www.elephantsql.com)
- Crea una base de datos PostgreSQL (tier gratis disponible)
- Copia la connection URL

**Opción 3: Neon**
- Accede a [neon.tech](https://neon.tech)
- Crea un projeto PostgreSQL serverless
- Copia la `DATABASE_URL`

### Crear las Tablas en tu Base de Datos

Ejecuta este SQL en tu base de datos:

```sql
-- Tabla de usuarios
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar INT DEFAULT 1,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  total_score INT DEFAULT 0,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de temas
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty VARCHAR(20) DEFAULT 'medium',
  language VARCHAR(20) DEFAULT 'es',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de preguntas
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  topic_id INT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL,  -- Array de 4 opciones
  correct_answer INT NOT NULL,  -- Index 0-3
  time_limit INT DEFAULT 30,  -- segundos
  difficulty VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones de juego
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE,
  topic_id INT REFERENCES topics(id),
  total_questions INT,
  team_a_score INT DEFAULT 0,
  team_b_score INT DEFAULT 0,
  winner_team CHAR(1),  -- 'A', 'B', NULL si draw
  player_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de jugadores por sesión
CREATE TABLE session_players (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  guest_username VARCHAR(50),
  team CHAR(1) NOT NULL,  -- 'A' o 'B'
  final_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_questions_topic_id ON questions(topic_id);
CREATE INDEX idx_session_players_session_id ON session_players(session_id);
CREATE INDEX idx_users_email ON users(email);
```

## Paso 4: Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**

Agrega estas variables:
```
DATABASE_URL = postgresql://user:password@host:port/dbname
MODERATOR_PIN = 1234
NODE_ENV = production
```

## Paso 5: Actualizar tu Frontend

En tu `index.html` y `moderator.html`, actualiza la URL del servidor:

**Local (para desarrollo):**
```javascript
const API_URL = 'http://localhost:3000';
```

**Vercel (producción):**
```javascript
const API_URL = 'https://tu-proyecto.vercel.app';
```

O mejor, usa una variable que detecte el ambiente:

```javascript
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://tu-proyecto.vercel.app';
```

## Paso 6: Deploy

```bash
# Commit y push de cambios
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

Vercel se redesplegará automáticamente desde GitHub.

---

## Consideraciones Importantes

### ⚠️ Sobre Socket.io en Vercel

**Limitación**: Las conexiones Socket.io con Vercel necesitan configuración especial:
- Vercel soporta WebSockets en Hobby plan y superior
- El estado en memoria (`gameRooms`) se perderá en redeploys
- Para producción con múltiples instancias, considera usar Redis Adapter

**Solución para ahora**:
- El código está configurado para usar Socket.io vía polling como fallback
- Los datos se persisten parcialmente en PostgreSQL  
- Para usar WebSockets completos, upgrade a Vercel Pro o usa una alternativa

### Alternativa: Usar Redis para Estado Persistente

Si necesitas estado persistente en Socket.io:

```bash
npm install redis socket.io-redis
```

Actualiza `api/index.js` para incluir Redis:

```javascript
const redis = require('redis');
const redisClient = redis.createClient(process.env.REDIS_URL);
const { createAdapter } = require('socket.io-redis');

io.adapter(createAdapter(redisClient));
```

Servicios Redis recomendados:
- [Railway Redis](https://railway.app)
- [Redis Cloud](https://redis.com/cloud)
- [Upstash](https://upstash.com)

---

## Solución de Problemas

### Error: "Cannot find module 'pg'"
```bash
npm install
npm install pg socket.io express
```

### Error: "DATABASE_URL not defined"
- Ve a Vercel Settings → Environment Variables
- Verifica que `DATABASE_URL` esté configurada correctamente
- Redeploy después de actualizar

### Socket.io no conecta
- Verifica que CORS esté configurado en `api/index.js`
- Asegúrate de usar `https://` en producción, no `http://`
- Cambia el transporte a polling en el cliente si es necesario

### Base de datos no se conecta
- Verifica que la `DATABASE_URL` sea correcta
- Asegúrate de que la base de datos es accesible desde Vercel (IP whitelist)
- Prueba la conexión localmente primero

---

## Monitoreo

- En Vercel Dashboard → **Monitoring**
- Revisa logs: **Deployments** → Click en un deploy → **Logs**
- Usa `console.log()` para debugging en `api/index.js`

## URLs de Acceso

Después del deploy:
- **Frontend**: `https://tu-proyecto.vercel.app`
- **API**: `https://tu-proyecto.vercel.app/api/*`
- **Moderador**: `https://tu-proyecto.vercel.app/moderator.html`

---

**¡Listo! Tu aplicación está desplegada en Vercel** 🎉
