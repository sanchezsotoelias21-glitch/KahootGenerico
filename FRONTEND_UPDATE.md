# 🌐 Actualizar URLs de API en el Frontend

Después de desplegar en Vercel, necesitas actualizar todas las referencias a URLs de API en tus archivos HTML/JavaScript.

## 📍 Ubicaciones a Actualizar

### ✅ En `index.html` y `moderator.html`

Busca todas las referencias a `localhost:3000` y `http://` y reemplaza con tu URL de Vercel.

---

## Opción 1: URL Fija (más simple)

```javascript
// Variables de configuración
const API_URL = 'https://tu-proyecto.vercel.app';
const SOCKET_URL = 'https://tu-proyecto.vercel.app';
```

**Ejemplo completo en JavaScript:**
```javascript
// ============================================
// CONFIGURACIÓN DE API
// ============================================
const API_URL = 'https://tu-proyecto.vercel.app';
const SOCKET_URL = 'https://tu-proyecto.vercel.app';

// Endpoints REST
async function register(username, email, password) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function fetchTopics() {
  const res = await fetch(`${API_URL}/api/topics`);
  return res.json();
}

// Socket.io
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnection: true,
  reconnectionAttempts: 10
});
```

---

## Opción 2: Detección Automática (recomendado)

Detecta automáticamente si está en local o producción:

```javascript
// ============================================
// CONFIGURACIÓN AUTOMÁTICA
// ============================================

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';

const API_URL = isLocal 
  ? 'http://localhost:3000'
  : window.location.origin;  // En Vercel: https://tu-proyecto.vercel.app

const SOCKET_URL = API_URL;

console.log('🌐 API URL:', API_URL);
console.log('📍 Environment:', isLocal ? 'DEVELOPMENT' : 'PRODUCTION');

// El resto del código igual...
async function register(username, email, password) {
  const res = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
}

// ... Socket.io ...
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling']
});
```

---

## 🔍 Lista de Endpoints a Verificar

Busca en tu código y reemplaza:

```
BUSCAR:                          → REEMPLAZAR CON:
✗ http://localhost:3000          ✓ https://tu-proyecto.vercel.app
✗ localhost:3000/api/*           ✓ https://tu-proyecto.vercel.app/api/*
✗ ws://localhost:3000            ✓ https://tu-proyecto.vercel.app
✗ "127.0.0.1:3000"              ✓ "https://tu-proyecto.vercel.app"
```

---

## 📝 Ejemplo: Actualizar `index.html`

### Antes:
```html
<script>
  const API_URL = 'http://localhost:3000';
  const SOCKET_URL = 'http://localhost:3000';
  
  // ...resto de código
  async function updateLeaderboard() {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    const data = await res.json();
    // ...
  }
  
  const socket = io(SOCKET_URL);
</script>
```

### Después (con detección automática):
```html
<script>
  // Detectar si es local o producción
  const isLocal = window.location.hostname.includes('localhost');
  const API_URL = isLocal 
    ? 'http://localhost:3000'
    : 'https://tu-proyecto.vercel.app';
  const SOCKET_URL = API_URL;
  
  console.log('🚀 API:', API_URL);
  
  // ...resto de código IGUAL
  async function updateLeaderboard() {
    const res = await fetch(`${API_URL}/api/leaderboard`);
    const data = await res.json();
    // ...
  }
  
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
  });
</script>
```

---

## 🔧 Usar Variables de Entorno (Avanzado)

Si construyes con un bundler (Webpack, Vite, Next.js):

```javascript
const API_URL = process.env.REACT_APP_API_URL || 
                window.location.origin;
```

Then en Vercel, agrega:
```env
REACT_APP_API_URL=https://tu-proyecto.vercel.app
```

---

## ✅ Verificar que Funciona

1. Deploy en Vercel
2. Abre https://tu-proyecto.vercel.app en el navegador
3. Abre la consola del navegador (F12)
4. Busca el mensaje de conexión:
   ```
   🌐 API URL: https://tu-proyecto.vercel.app
   ```
5. Si Socket.io conecta, deberías ver:
   ```
   socket connected ✓
   ```

---

## 🐛 Troubleshooting

**Error: "Failed to fetch /api/..."**
- Verifica que API_URL sea correcto
- Comprueba que Vercel está deployado y activo
- Revisa la consola de Vercel (Deployments → Logs)

**Error: "Socket connection failed"**
- El transporte por defecto podría no funcionar
- Asegúrate de agregar transports en Socket.io:
  ```javascript
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
  });
  ```

**Error: "CORS error"**
- El frontend y backend deben tener CORS habilitado
- En `api/index.js` ya está configurado correctamente
- Si persiste, agrega a tu fetch:
  ```javascript
  fetch(url, {
    mode: 'cors',
    credentials: 'omit'  // o 'include' si necesitas cookies
  });
  ```

---

## 📋 Checklist Final

- [ ] Actualizado `index.html` con nueva API_URL
- [ ] Actualizado `moderator.html` con nueva API_URL
- [ ] Testeado localmente: `npm start`
- [ ] Git commit y push a GitHub
- [ ] Vercel re-deployó automáticamente
- [ ] Verificado en navegador que conecta a la API
- [ ] Socket.io conectó correctamente
- [ ] Modo desarrollo usa `localhost:3000`
- [ ] Modo producción usa `vercel.app`

---

**¡Listo! Tu frontend está conectado a Vercel 🎉**
