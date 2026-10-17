import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const app = express();
const clientId = process.env.GOOGLE_CLIENT_ID;
const scriptUrl = process.env.APPS_SCRIPT_URL;
const proxySecret = process.env.CREAR_PROXY_SECRET;
const admins = new Set((process.env.CREAR_ADMIN_EMAILS || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean));
const professionals = new Map((process.env.CREAR_PROFESSIONAL_ACCOUNTS || '').toLowerCase().split(',').map(entry => entry.trim().split(':')).filter(([email, id]) => email && id));
const oauth = clientId ? new OAuth2Client(clientId) : null;

app.disable('x-powered-by');
app.use((_, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api/crear', express.json({ limit: '256kb' }));

app.post('/api/crear', async (request, response) => {
  if (!oauth || !scriptUrl || !proxySecret || (!admins.size && !professionals.size)) {
    return response.status(503).json({ ok: false, error: 'El servicio compartido aún no está configurado.' });
  }
  try {
    const token = /^Bearer (.+)$/.exec(request.get('authorization') || '')?.[1];
    if (!token) return response.status(401).json({ ok: false, error: 'Iniciá sesión para continuar.' });
    const ticket = await oauth.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload();
    const email = String(payload?.email || '').toLowerCase();
    if (!payload?.email_verified || !(email.endsWith('@gmail.com') || payload.hd)) {
      return response.status(403).json({ ok: false, error: 'La cuenta de Google no tiene un correo verificable.' });
    }
    const role = admins.has(email) ? 'admin' : professionals.has(email) ? 'professional' : null;
    if (!role) return response.status(403).json({ ok: false, error: 'Tu cuenta no está habilitada para CREAR.' });
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') {
      return response.status(400).json({ ok: false, error: 'Solicitud inválida.' });
    }
    const upstream = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
      body: JSON.stringify({ ...body, proxySecret, actor: { email, role, professionalId: professionals.get(email) || '' } }),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok) throw new Error(`Apps Script respondió ${upstream.status}.`);
    const result = await upstream.json();
    response.status(result.ok ? 200 : 409).json(result);
  } catch (error) {
    const authError = ['Token used too late', 'Wrong recipient', 'Invalid token signature', 'No pem found'].some(text => String(error?.message || '').includes(text));
    response.status(authError ? 401 : 502).json({ ok: false, error: authError ? 'La sesión venció. Volvé a iniciar sesión.' : 'No se pudo comunicar con el servicio compartido.' });
  }
});
app.all('/api/crear', (_, response) => response.status(405).json({ ok: false, error: 'Método no permitido.' }));

const dist = join(root, 'dist');
if (existsSync(join(dist, 'index.html'))) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_, response) => response.sendFile(join(dist, 'index.html')));
}

const port = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001));
app.listen(port, '0.0.0.0', () => console.log(`CREAR disponible en el puerto ${port}`));
