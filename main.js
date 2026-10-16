'use strict';
const { app, BrowserWindow, ipcMain, dialog, safeStorage, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

let win = null;
let forceClose = false;
const controllers = new Map();

/* ---------- definições (a chave fica cifrada quando o sistema o permite) ---------- */
const cfgPath = () => path.join(app.getPath('userData'), 'config.json');
function loadCfg() {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch { return {}; }
}
function saveCfg(cfg) {
  fs.mkdirSync(path.dirname(cfgPath()), { recursive: true });
  fs.writeFileSync(cfgPath(), JSON.stringify(cfg, null, 2), { mode: 0o600 });
}
function getKey() {
  const c = loadCfg();
  if (!c.apiKey) return '';
  try {
    return c.encrypted ? safeStorage.decryptString(Buffer.from(c.apiKey, 'base64')) : c.apiKey;
  } catch { return ''; }
}

ipcMain.handle('settings:get', () => {
  const c = loadCfg();
  return { hasKey: !!getKey(), model: c.model || DEFAULT_MODEL, encrypted: !!c.encrypted };
});

ipcMain.handle('settings:set', (_e, { apiKey, model, clearKey } = {}) => {
  const c = loadCfg();
  if (model) c.model = String(model).trim();
  if (clearKey) {
    delete c.apiKey; delete c.encrypted;
  } else if (apiKey) {
    if (safeStorage.isEncryptionAvailable()) {
      c.apiKey = safeStorage.encryptString(apiKey.trim()).toString('base64');
      c.encrypted = true;
    } else {
      c.apiKey = apiKey.trim();
      c.encrypted = false;
    }
  }
  saveCfg(c);
  return true;
});

/* ---------- ficheiros ---------- */
ipcMain.handle('file:open', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0];
  try {
    if (fs.statSync(p).size > MAX_FILE_BYTES) throw new Error('O ficheiro tem mais de 5 MB.');
    return { path: p, content: fs.readFileSync(p, 'utf8') };
  } catch (err) {
    dialog.showErrorBox('Não foi possível abrir o ficheiro', err.message);
    return null;
  }
});

ipcMain.handle('file:save', async (_e, { path: p, content, suggested }) => {
  let target = p;
  if (!target) {
    const r = await dialog.showSaveDialog(win, { defaultPath: suggested || 'sem-titulo.txt' });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  try {
    fs.writeFileSync(target, content, 'utf8');
    return target;
  } catch (err) {
    dialog.showErrorBox('Não foi possível guardar o ficheiro', err.message);
    return null;
  }
});

/* ---------- IA (Groq, API compatível com OpenAI, com streaming) ---------- */
ipcMain.handle('ai:chat', async (e, { id, messages, model }) => {
  const send = (d) => { if (!e.sender.isDestroyed()) e.sender.send('ai:event', { id, ...d }); };
  const key = getKey();
  if (!key) { send({ type: 'error', message: 'Falta a API key. Abre as definições (Ctrl+,).' }); return; }

  const ac = new AbortController();
  controllers.set(id, ac);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: model || loadCfg().model || DEFAULT_MODEL,
        messages, stream: true, temperature: 0.3
      }),
      signal: ac.signal
    });
    if (!res.ok) {
      const body = await res.text();
      let msg = body.slice(0, 300);
      try { msg = JSON.parse(body).error.message; } catch {}
      throw new Error(`Groq ${res.status}: ${msg}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const data = s.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) send({ type: 'chunk', delta });
        } catch { /* linha incompleta */ }
      }
    }
    send({ type: 'done' });
  } catch (err) {
    if (err.name === 'AbortError') send({ type: 'done' });
    else send({ type: 'error', message: err.message });
  } finally {
    controllers.delete(id);
  }
});

ipcMain.on('ai:cancel', (_e, id) => controllers.get(id)?.abort());

/* ---------- janela ---------- */
ipcMain.on('app:close-ok', () => { forceClose = true; win?.close(); });

function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 780, minWidth: 760, minHeight: 480,
    title: 'XNotes', backgroundColor: '#f3f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());
  win.on('close', (ev) => {
    if (forceClose) return;
    ev.preventDefault();
    win.webContents.send('app:close-request');
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
