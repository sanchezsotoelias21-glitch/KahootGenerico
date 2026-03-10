// ============================================================
//  TeamKahoot API — Adaptado para Vercel Serverless
//  Con soporte para Socket.io vía conexión persistente
// ============================================================
'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// ══════════════════════════════════════════════════════════
//  DATABASE POOL
// ══════════════════════════════════════════════════════════
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Test connection
pool.connect()
  .then(c => {
    console.log('✅ Database connected to Vercel');
    c.release();
  })
  .catch(e => console.error('❌ DB connection error:', e.message));

// ══════════════════════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Servir archivos estáticos desde public/
app.use(express.static(path.join(__dirname, '..', 'public')));

// ══════════════════════════════════════════════════════════
//  IN-MEMORY GAME STATE
// ══════════════════════════════════════════════════════════
const gameRooms = new Map();

// Función para generar código aleatorio
function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function fetchQuestions(topicId) {
  const r = await pool.query(
    'SELECT * FROM questions WHERE topic_id=$1 ORDER BY RANDOM() LIMIT 10',
    [topicId]
  );
  return r.rows;
}

function roomPublic(room) {
  const players = Array.from(room.players.values());
  return {
    code: room.code,
    topic: room.topic,
    teamA: players.filter(p => p.team === 'A'),
    teamB: players.filter(p => p.team === 'B'),
    players,
    state: room.state
  };
}

// ══════════════════════════════════════════════════════════
//  REST API ENDPOINTS
// ══════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TeamKahoot running on Vercel' });
});

/** POST /api/register */
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (username.length < 3 || username.length > 50)
    return res.status(400).json({ error: 'El nombre debe tener entre 3 y 50 caracteres' });
  try {
    const dup = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]
    );
    if (dup.rows.length)
      return res.status(409).json({ error: 'El email o nombre de usuario ya está en uso' });

    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1,$2,$3)
       RETURNING id, username, email, avatar, games_played, total_score, created_at`,
      [username.trim(), email.toLowerCase().trim(), hash]
    );
    res.status(201).json({ success: true, user: r.rows[0] });
  } catch (e) {
    console.error('Register:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/** POST /api/login */
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    if (!r.rows.length)
      return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    await pool.query('UPDATE users SET last_seen=NOW() WHERE id=$1', [user.id]);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        games_played: user.games_played,
        total_score: user.total_score
      }
    });
  } catch (e) {
    console.error('Login:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/** GET /api/topics */
app.get('/api/topics', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM topics ORDER BY id');
    res.json(r.rows);
  } catch (e) {
    console.error('Topics:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/** GET /api/leaderboard */
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT username, total_score, games_played, games_won
       FROM users ORDER BY total_score DESC LIMIT 10`
    );
    res.json(r.rows);
  } catch (e) {
    console.error('Leaderboard:', e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/** POST /api/moderator/verify */
app.post('/api/moderator/verify', (req, res) => {
  const { pin } = req.body;
  const correct = process.env.MODERATOR_PIN || '1234';
  if (pin === correct) res.json({ success: true });
  else res.status(401).json({ error: 'PIN incorrecto' });
});

// ══════════════════════════════════════════════════════════
//  SOCKET.IO SETUP (Para desarrollo local o con Vercel Hobby)
// ══════════════════════════════════════════════════════════
let io;
const server = http.createServer(app);

try {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6
  });

  // Socket.io connection
  io.on('connection', socket => {
    console.log(`[+] Socket connected: ${socket.id}`);

    // ── CREATE ROOM (moderator) ───────────────────────────────
    socket.on('create-room', async ({ topicId, moderatorName }) => {
      try {
        const topicRes = await pool.query('SELECT * FROM topics WHERE id=$1', [topicId]);
        if (!topicRes.rows.length) {
          socket.emit('error', { msg: 'Tema no encontrado' });
          return;
        }

        const questions = await fetchQuestions(topicId);
        if (!questions.length) {
          socket.emit('error', { msg: 'Sin preguntas para este tema' });
          return;
        }

        let code;
        do { code = randomCode(); } while (gameRooms.has(code));

        const room = {
          code,
          topic: topicRes.rows[0],
          questions,
          moderatorId: socket.id,
          moderatorName: moderatorName || 'Moderador',
          players: new Map(),
          state: 'waiting',     // waiting | countdown | question | results | gameover
          currentIdx: -1,
          currentQ: null,
          qAnswers: {},
          teamScores: { A: 0, B: 0 },
          timer: null,
          qStartTime: null,
          createdAt: Date.now()
        };

        gameRooms.set(code, room);
        socket.join(code);
        socket.data = { roomCode: code, isModerator: true };

        socket.emit('room-created', {
          roomCode: code,
          topic: room.topic,
          questionCount: questions.length
        });
        console.log(`[Room] ${code} | Topic: ${room.topic.name} | Mod: ${moderatorName}`);

      } catch (e) {
        console.error('create-room:', e);
        socket.emit('error', { msg: 'No se pudo crear la sala' });
      }
    });

    // ── JOIN ROOM (player) ────────────────────────────────────
    socket.on('join-room', ({ roomCode, username, userId }) => {
      const code = (roomCode || '').toUpperCase().trim();
      const room = gameRooms.get(code);

      if (!room) {
        socket.emit('join-error', { msg: 'Sala no encontrada. Verifica el código.' });
        return;
      }
      if (room.state !== 'waiting') {
        socket.emit('join-error', { msg: 'El juego ya comenzó. Espera la próxima partida.' });
        return;
      }
      if (!username || username.trim().length < 1) {
        socket.emit('join-error', { msg: 'Nombre de jugador requerido.' });
        return;
      }

      for (const [, p] of room.players) {
        if (p.username.toLowerCase() === username.toLowerCase().trim()) {
          socket.emit('join-error', { msg: 'Ese nombre ya está tomado en esta sala.' });
          return;
        }
      }

      const team = room.players.size % 2 === 0 ? 'A' : 'B';
      const avatarN = Math.floor(Math.random() * 8) + 1;
      const player = {
        socketId: socket.id,
        userId: userId || null,
        username: username.trim(),
        team,
        score: 0,
        streak: 0,
        avatar: avatarN,
        joinedAt: Date.now()
      };

      room.players.set(socket.id, player);
      socket.join(code);
      socket.data = { roomCode: code, playerId: socket.id, team };

      const pub = roomPublic(room);
      socket.emit('joined-room', { player, room: pub });
      io.to(code).emit('player-joined', { player, ...pub });
      console.log(`[Join] ${username} → Room ${code} Team ${team}`);
    });

    // ── START GAME (moderator) ────────────────────────────────
    socket.on('start-game', ({ roomCode }) => {
      const room = gameRooms.get(roomCode);
      if (!room || socket.id !== room.moderatorId) return;
      if (room.players.size < 2) {
        socket.emit('error', { msg: 'Necesitas al menos 2 jugadores para comenzar.' });
        return;
      }

      room.state = 'countdown';
      let n = 3;
      io.to(roomCode).emit('game-starting', { countdown: n });

      const cd = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(cd);
          room.currentIdx = 0;
          sendQuestion(roomCode);
        } else {
          io.to(roomCode).emit('countdown-tick', { countdown: n });
        }
      }, 1000);
    });

    // ── NEXT QUESTION (moderator) ─────────────────────────────
    socket.on('next-question', ({ roomCode }) => {
      const room = gameRooms.get(roomCode);
      if (!room || socket.id !== room.moderatorId) return;
      room.currentIdx++;
      if (room.currentIdx >= room.questions.length) endGame(roomCode);
      else sendQuestion(roomCode);
    });

    // ── SHOW RESULTS (moderator) ──────────────────────────────
    socket.on('show-results', ({ roomCode }) => {
      const room = gameRooms.get(roomCode);
      if (!room || socket.id !== room.moderatorId) return;
      clearInterval(room.timer);
      showResults(roomCode);
    });

    // ── SUBMIT ANSWER (player) ────────────────────────────────
    socket.on('submit-answer', ({ roomCode, questionId, answerIndex }) => {
      const room = gameRooms.get(roomCode);
      if (!room || room.state !== 'question') return;

      const player = room.players.get(socket.id);
      if (!player) return;
      if (room.qAnswers[socket.id]) return;

      const q = room.currentQ;
      if (!q || q.id !== questionId) return;

      const isCorrect = answerIndex === q.correct_answer;
      const elapsed = (Date.now() - room.qStartTime) / 1000;
      const speedRatio = Math.max(0, 1 - elapsed / q.time_limit);
      const basePoints = isCorrect ? 200 : 0;
      const speedBonus = isCorrect ? Math.floor(speedRatio * 800) : 0;

      player.streak = isCorrect ? player.streak + 1 : 0;
      const streakBonus = isCorrect && player.streak > 1
        ? Math.min((player.streak - 1) * 50, 200) : 0;

      const total = basePoints + speedBonus + streakBonus;

      room.qAnswers[socket.id] = { answerIndex, isCorrect, points: total };

      if (isCorrect) {
        player.score += total;
        room.teamScores[player.team] += total;
      }

      socket.emit('answer-result', {
        isCorrect,
        points: total,
        correctAnswer: q.correct_answer,
        streak: player.streak
      });

      const answered = Object.keys(room.qAnswers).length;
      const total_p = room.players.size;
      io.to(roomCode).emit('answer-count', { answered, total: total_p });

      if (answered >= total_p) {
        clearInterval(room.timer);
        setTimeout(() => showResults(roomCode), 500);
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { roomCode, isModerator } = socket.data || {};
      if (!roomCode) return;
      const room = gameRooms.get(roomCode);
      if (!room) return;

      if (isModerator) {
        io.to(roomCode).emit('moderator-disconnected');
        setTimeout(() => gameRooms.delete(roomCode), 30_000);
      } else {
        const p = room.players.get(socket.id);
        if (p) {
          room.players.delete(socket.id);
          const pub = roomPublic(room);
          io.to(roomCode).emit('player-left', { username: p.username, ...pub });
          console.log(`[-] ${p.username} left ${roomCode}`);
        }
      }
    });
  });
} catch (e) {
  console.warn('⚠️  Socket.io not available in serverless environment. Using REST API only.');
}

// ══════════════════════════════════════════════════════════
//  GAME ENGINE FUNCTIONS
// ══════════════════════════════════════════════════════════

function sendQuestion(roomCode) {
  const room = gameRooms.get(roomCode);
  if (!room) return;

  const q = room.questions[room.currentIdx];
  room.currentQ = q;
  room.state = 'question';
  room.qAnswers = {};

  const clientQ = {
    id: q.id,
    question_text: q.question_text,
    options: q.options,
    time_limit: q.time_limit
  };

  io.to(roomCode).emit('new-question', {
    question: clientQ,
    questionNumber: room.currentIdx + 1,
    totalQuestions: room.questions.length,
    teamScores: room.teamScores
  });

  setTimeout(() => {
    room.qStartTime = Date.now();
    let t = q.time_limit;
    room.timer = setInterval(() => {
      t--;
      io.to(roomCode).emit('timer-tick', { timeLeft: t, total: q.time_limit });
      if (t <= 0) {
        clearInterval(room.timer);
        showResults(roomCode);
      }
    }, 1000);
  }, 1000);
}

function showResults(roomCode) {
  const room = gameRooms.get(roomCode);
  if (!room || room.state === 'results' || room.state === 'gameover') return;
  room.state = 'results';

  const q = room.currentQ;
  const players = Array.from(room.players.values());

  const playerResults = players.map(p => ({
    username: p.username,
    team: p.team,
    avatar: p.avatar,
    totalScore: p.score,
    answerIndex: room.qAnswers[p.socketId]?.answerIndex ?? -1,
    isCorrect: room.qAnswers[p.socketId]?.isCorrect || false,
    points: room.qAnswers[p.socketId]?.points || 0,
    streak: p.streak
  })).sort((a, b) => b.totalScore - a.totalScore);

  io.to(roomCode).emit('question-results', {
    correctAnswer: q.correct_answer,
    correctAnswerText: q.options[q.correct_answer],
    playerResults,
    teamA: playerResults.filter(p => p.team === 'A'),
    teamB: playerResults.filter(p => p.team === 'B'),
    teamScores: room.teamScores,
    isLastQuestion: room.currentIdx >= room.questions.length - 1,
    questionNumber: room.currentIdx + 1,
    totalQuestions: room.questions.length
  });
}

async function endGame(roomCode) {
  const room = gameRooms.get(roomCode);
  if (!room) return;
  room.state = 'gameover';
  clearInterval(room.timer);

  const players = Array.from(room.players.values())
    .sort((a, b) => b.score - a.score);

  const winner = room.teamScores.A > room.teamScores.B ? 'A'
    : room.teamScores.B > room.teamScores.A ? 'B'
    : 'DRAW';

  try {
    const sess = await pool.query(
      `INSERT INTO game_sessions
         (room_code, topic_id, total_questions, team_a_score, team_b_score, winner_team, player_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [roomCode, room.topic.id, room.questions.length,
        room.teamScores.A, room.teamScores.B,
        winner === 'DRAW' ? null : winner,
        room.players.size]
    );
    const sessId = sess.rows[0].id;

    for (const p of players) {
      await pool.query(
        `INSERT INTO session_players (session_id, user_id, guest_username, team, final_score)
         VALUES ($1,$2,$3,$4,$5)`,
        [sessId, p.userId, p.userId ? null : p.username, p.team, p.score]
      );
      if (p.userId) {
        await pool.query(
          `UPDATE users SET
             games_played = games_played + 1,
             games_won = games_won + $1,
             total_score = total_score + $2
           WHERE id = $3`,
          [p.team === winner ? 1 : 0, p.score, p.userId]
        );
      }
    }
  } catch (e) {
    console.error('endGame DB save:', e.message);
  }

  io.to(roomCode).emit('game-over', {
    winner,
    teamScores: room.teamScores,
    topPlayers: players.slice(0, 5),
    playerResults: players
  });

  setTimeout(() => gameRooms.delete(roomCode), 600_000);
  console.log(`[End] Room ${roomCode} | Winner: Team ${winner} | A:${room.teamScores.A} B:${room.teamScores.B}`);
}

// ══════════════════════════════════════════════════════════
//  EXPORTS for Vercel
// ══════════════════════════════════════════════════════════
module.exports = app;
