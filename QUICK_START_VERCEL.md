# 🚀 Quick Start — Desplegar en Vercel en 5 minutos

## Prequisitos
- ✅ Cuenta GitHub (con tu código pusheado)
- ✅ Cuenta Vercel (gratis en vercel.com)
- ✅ PostgreSQL database (Railway, Neon, ElephantSQL, etc.)

---

## PASO 1: Importar en Vercel

```bash
1. Ir a https://vercel.com/dashboard
2. Click "New Project"
3. Seleccionar tu repo de GitHub "kahool-generico"
4. Vercel auto-detecta Node.js ✅
```

## PASO 2: Variables de Entorno

En el formulario de settings, agregar 3 variables:

```
DATABASE_URL = postgresql://user:pass@host:5432/db-name
              (obtener de tu proveedor PostgreSQL)

NODE_ENV     = production

MODERATOR_PIN = 1234  (reemplaza con tu PIN secreto)
```

## PASO 3: Deploy

```bash
# Click "Deploy"
# Vercel inicia automáticamente
# En 2-3 minutos estarú listo ✅
```

## PASO 4: Crear tablas en BD

Ejecuta este SQL en tu base de datos PostgreSQL:

```sql
-- Copiar y pegar TODO esto en pgAdmin o psql:

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

CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  topic_id INT NOT NULL REFERENCES topics(id),
  question_text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INT NOT NULL,
  time_limit INT DEFAULT 30,
  difficulty VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE,
  topic_id INT REFERENCES topics(id),
  total_questions INT,
  team_a_score INT DEFAULT 0,
  team_b_score INT DEFAULT 0,
  winner_team CHAR(1),
  player_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_players (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES game_sessions(id),
  user_id INT REFERENCES users(id),
  guest_username VARCHAR(50),
  team CHAR(1) NOT NULL,
  final_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar datos de ejemplo
INSERT INTO topics (name, description) VALUES
('Geografia', 'Preguntas sobre geografía mundial'),
('Ciencia', 'Preguntas de ciencia y tecnología'),
('Cine', 'Preguntas sobre películas y series');

-- Agregar algunas preguntas de ejemplo
INSERT INTO questions (topic_id, question_text, options, correct_answer, time_limit) VALUES
(1, '¿Cuál es la capital de Francia?', 
  '["Madrid","París","Londres","Berlín"]', 1, 20),
(2, '¿Cuáles es el metal más pesado?', 
  '["Oro","Platino","Osmio","Tugsteno"]', 2, 20),
(3, '¿Qué película ganó el Oscar a Mejor Película 2024?', 
  '["Oppenheimer","Killers of the Flower Moon","La zona de interés","Anatomía de una caída"]', 
  0, 20);
```

---

## PASO 5: Actualizar URLs en el Frontend

En tus archivos HTML (`index.html`, `moderator.html`), reemplaza:

**Antes:**
```javascript
const API_URL = 'http://localhost:3000';
```

**Después:**
```javascript
const API_URL = 'https://tu-proyecto.vercel.app';
// O detecta automáticamente:
const API_URL = window.location.origin;
```

---

## ✅ DONE

Tu app está en vivo! Comparte:
- **Jugadores**: `https://tu-proyecto.vercel.app`
- **Moderador**: `https://tu-proyecto.vercel.app/moderator.html`

---

## 🆘 Errores Comunes

**Error: "Cannot connect to database"**
→ Verifica `DATABASE_URL` en Vercel Settings → Environment Variables

**Error: "Tables don't exist"**
→ Ejecuta el SQL de creación de tablas en tu base de datos

**Socket.io no conecta**
→ Verifica que el frontend use `https://` no `http://`

**404 on /api/***
→ Verifica que tus archivos estén en `/public` (para estáticos) o `/api` (para endpoints)

---

**¡A jugar! 🎮**
