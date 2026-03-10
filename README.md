# 🎮 TeamKahoot

> Juego de preguntas en tiempo real por equipos, estilo Kahoot. 100% cloud-ready.

---

## 🌟 Características

- **Juego en equipos automático** — Los jugadores se dividen 50/50 en Equipo A y Equipo B
- **3 salas temáticas** — Geografía, Ciencia y Tecnología, Cine y Entretenimiento
- **Tiempo real** — Powered by Socket.io (funciona en cientos de dispositivos simultáneamente)
- **Responsive** — Móvil, tablet y PC
- **Base de datos** — Registro de usuarios, historial de partidas, puntuaciones
- **Panel de moderador** protegido por PIN
- **Sistema de puntuación** — Velocidad de respuesta + rachas consecutivas = más puntos

---

## 🗄️ Base de Datos — Tablas y campos

### Tabla: `users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID único del usuario |
| `username` | VARCHAR(50) UNIQUE | Nombre de usuario |
| `email` | VARCHAR(255) UNIQUE | Correo electrónico |
| `password_hash` | VARCHAR(255) | Contraseña hasheada con bcrypt |
| `avatar` | INTEGER | Número de avatar (1-8) |
| `games_played` | INTEGER | Partidas jugadas |
| `games_won` | INTEGER | Partidas ganadas |
| `total_score` | BIGINT | Puntuación total acumulada |
| `created_at` | TIMESTAMP | Fecha de registro |
| `last_seen` | TIMESTAMP | Última conexión |

### Tabla: `topics` (los 3 temas disponibles)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID del tema |
| `name` | VARCHAR(100) | Nombre del tema |
| `description` | TEXT | Descripción |
| `icon` | VARCHAR(10) | Emoji del tema |
| `color` | VARCHAR(7) | Color hex |

### Tabla: `questions`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID de la pregunta |
| `topic_id` | INTEGER FK | Tema al que pertenece |
| `question_text` | TEXT | Texto de la pregunta |
| `options` | JSONB | Array de 4 opciones: `["A","B","C","D"]` |
| `correct_answer` | INTEGER | Índice de la respuesta correcta (0-3) |
| `time_limit` | INTEGER | Tiempo en segundos (default: 20) |
| `points` | INTEGER | Puntos máximos (default: 1000) |
| `difficulty` | VARCHAR(10) | easy / medium / hard |

### Tabla: `game_sessions`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID de la sesión |
| `room_code` | VARCHAR(10) | Código de la sala |
| `topic_id` | INTEGER FK | Tema jugado |
| `total_questions` | INTEGER | Número de preguntas |
| `team_a_score` | INTEGER | Puntuación Equipo A |
| `team_b_score` | INTEGER | Puntuación Equipo B |
| `winner_team` | CHAR(1) | 'A', 'B', o NULL (empate) |
| `player_count` | INTEGER | Número de jugadores |
| `started_at` | TIMESTAMP | Inicio de la partida |
| `ended_at` | TIMESTAMP | Fin de la partida |

### Tabla: `session_players`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID del registro |
| `session_id` | INTEGER FK | Sesión a la que pertenece |
| `user_id` | INTEGER FK | Usuario (NULL si es invitado) |
| `guest_username` | VARCHAR(50) | Nombre si es invitado |
| `team` | CHAR(1) | Equipo 'A' o 'B' |
| `final_score` | INTEGER | Puntuación final |
| `correct_answers` | INTEGER | Respuestas correctas |

### Tabla: `player_answers`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL PK | ID |
| `session_id` | INTEGER FK | Sesión |
| `user_id` | INTEGER FK | Usuario |
| `question_id` | INTEGER FK | Pregunta respondida |
| `answer_index` | INTEGER | Índice elegido (-1 = sin respuesta) |
| `is_correct` | BOOLEAN | Si fue correcta |
| `points_earned` | INTEGER | Puntos ganados |
| `response_time` | FLOAT | Segundos en responder |

---

## 🚀 Instalación local

### Prerrequisitos
- Node.js 18+
- PostgreSQL 13+

### Pasos

```bash
# 1. Clona o descomprime el proyecto
cd teamkahoot

# 2. Instala dependencias
npm install

# 3. Crea la base de datos en PostgreSQL
createdb teamkahoot
# O desde psql:
#   CREATE DATABASE teamkahoot;

# 4. Ejecuta el schema (crea tablas + datos de prueba)
psql -U tu_usuario -d teamkahoot -f schema.sql

# 5. Configura las variables de entorno
cp .env.example .env
# Edita .env con tus datos:
#   DATABASE_URL=postgresql://usuario:password@localhost:5432/teamkahoot
#   MODERATOR_PIN=1234   ← cámbialo!

# 6. Inicia el servidor
npm start
# O en modo desarrollo (auto-reload):
npm run dev

# 7. Abre el navegador
#   Jugadores:   http://localhost:3000
#   Moderador:   http://localhost:3000/moderator.html
```

---

## ☁️ Deploy en la nube

### ⭐ Opción A — VERCEL (RECOMENDADO)

**Optimizado específicamente para este proyecto — Lee [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)**

1. Sube tu código a GitHub primero
2. Ve a [vercel.com](https://vercel.com) y conecta tu repositorio
3. Vercel detecta automáticamente la configuración en `vercel.json`
4. Configura las variables de entorno en Dashboard:
   ```
   DATABASE_URL  = tu_url_postgres
   NODE_ENV      = production
   MODERATOR_PIN = tu_pin_secreto
   ```
5. Haz deploy con un click
6. ¡Listo! Tu app está en `https://tu-proyecto.vercel.app`

**Ventajas:**
- Deploy desde GitHub automático
- Certificado HTTPS incluido
- Escalabilidad automática
- CDN global gratis
- WebSocket compatible

### Opción B — Railway (gratuito)

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. **New Project → Deploy from GitHub repo** (sube tu código a GitHub primero)
3. Railway detecta Node.js automáticamente
4. Agrega un servicio **PostgreSQL** desde el panel
5. En **Variables** agrega:
   ```
   DATABASE_URL  = (copiado automáticamente del servicio Postgres)
   NODE_ENV      = production
   MODERATOR_PIN = tu_pin_secreto
   ```
6. Railway hace el deploy automáticamente
7. Ejecuta el schema: en Railway Console → `psql $DATABASE_URL -f schema.sql`

### Opción C — Render

1. Ve a [render.com](https://render.com)
2. **New → Web Service** → conecta tu repositorio
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Agrega **New → PostgreSQL** database
6. Copia el Internal Database URL a `DATABASE_URL`
7. Agrega `NODE_ENV=production` y `MODERATOR_PIN=tu_pin`

### Opción D — Heroku

```bash
heroku create tu-app-name
heroku addons:create heroku-postgresql:mini
heroku config:set NODE_ENV=production MODERATOR_PIN=tu_pin
git push heroku main
heroku run psql $(heroku config:get DATABASE_URL) -f schema.sql
```

---

## 📱 Cómo usar

### Como Jugador
1. Abre la URL de la app en cualquier dispositivo
2. Regístrate o juega como invitado
3. Ingresa el código de 6 letras que te da el moderador
4. ¡Espera a que el moderador inicie el juego!
5. Responde las preguntas lo más rápido posible
6. Los puntos son de tu equipo también 🏆

### Como Moderador
1. Ve a `[URL]/moderator.html`
2. Ingresa el PIN (default: `1234`)
3. Escribe tu nombre y selecciona un tema (sala)
4. Comparte el código de 6 letras con los jugadores
5. Cuando todos estén listos, pulsa **Iniciar Juego**
6. Controla el ritmo del juego con los botones

---

## 🎯 Sistema de puntuación

| Situación | Puntos |
|-----------|--------|
| Respuesta correcta (base) | 200 |
| Bonus por velocidad | 0–800 (más rápido = más) |
| Bonus por racha ×2 | +50 |
| Bonus por racha ×3 | +100 |
| Bonus máximo de racha | +200 |
| Respuesta incorrecta | 0 |
| Sin respuesta (tiempo) | 0 |

Los puntos individuales se acumulan al **marcador del equipo**.

---

## 🛠️ Personalización

### Agregar preguntas
```sql
INSERT INTO questions (topic_id, question_text, options, correct_answer, time_limit)
VALUES (
  1,                              -- topic_id (1=Geo, 2=Ciencia, 3=Cine)
  '¿Tu pregunta aquí?',
  '["Opción A","Opción B","Opción C","Opción D"]',
  0,                              -- índice de respuesta correcta (0-3)
  20                              -- segundos
);
```

### Agregar un nuevo tema
```sql
INSERT INTO topics (name, description, icon, color)
VALUES ('Mi Nuevo Tema', 'Descripción del tema', '🎯', '#9C27B0');
-- Luego agrega preguntas con el nuevo topic_id
```

### Cambiar el PIN del moderador
En tu archivo `.env`:
```
MODERATOR_PIN=mi_nuevo_pin_secreto
```

---

## 📁 Estructura del proyecto

```
teamkahoot/
├── server.js              ← Servidor principal (Express + Socket.io)
├── package.json           ← Dependencias npm
├── .env.example           ← Variables de entorno de ejemplo
├── .env                   ← Tu configuración local (no subir a git!)
├── schema.sql             ← Schema de base de datos + datos iniciales
├── README.md              ← Esta documentación
└── public/
    ├── index.html         ← Interfaz del jugador (SPA)
    └── moderator.html     ← Panel del moderador
```

---

## 🔧 Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `production` |
| `MODERATOR_PIN` | PIN de acceso al panel moderador | `1234` |

---

## 🤝 Capacidad y escalabilidad

- **Salas simultáneas**: ilimitadas (en memoria del servidor)
- **Jugadores por sala**: sin límite definido (recomendado <100 para mejor experiencia)
- **Partidas guardadas**: todas en PostgreSQL
- **Para mayor escala**: considera agregar Redis para el estado de las salas

---

*Desarrollado con ❤️ — Node.js + Socket.io + PostgreSQL*
"# KahootGenerico" 
