// Pilote Microsoft Edge (ou Chrome) sans interface par le protocole DevTools, sans dépendance : ouvre une page à la
// taille voulue, y exécute du JavaScript et en fait une capture PNG (fond transparent par défaut).
// Navigateur : variable d'environnement BROWSER, sinon emplacements habituels d'Edge et de Chrome.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openBrowser() {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error('Navigateur introuvable : indiquer son chemin dans BROWSER');
  const profile = mkdtempSync(join(tmpdir(), 'planche-edge-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
  let info;
  for (let i = 0; i < 150 && !info; i++) {
    try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(100); }
  }
  if (!info) { proc.kill(); throw new Error('Le navigateur ne répond pas'); }

  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (!m.id || !pending.has(m.id)) return;
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) rej(new Error(m.error.message)); else res(m.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  async function page(width, height, scale = 1) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
    await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    const api = {
      async eval(expression) {
        const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      },
      async waitFor(expression, timeout = 90000) {
        const t0 = Date.now();
        while (Date.now() - t0 < timeout) { if (await api.eval(`!!(${expression})`).catch(() => false)) return; await sleep(200); }
        throw new Error(`Délai dépassé : ${expression}`);
      },
      async goto(url) {
        await s('Page.navigate', { url });
        await sleep(300);
        await api.waitFor('document.readyState === "complete"');
      },
      async html(content) {
        const { frameTree } = await s('Page.getFrameTree');
        await s('Page.setDocumentContent', { frameId: frameTree.frame.id, html: content });
        await api.waitFor('document.readyState === "complete" && (!document.fonts || document.fonts.status === "loaded")');
        await sleep(200);
      },
      async png(clip) {
        const r = await s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
        return Buffer.from(r.data, 'base64');
      },
      // script exécuté avant ceux de chaque page chargée ensuite (relevé des erreurs, par exemple)
      beforeLoad: (source) => s('Page.addScriptToEvaluateOnNewDocument', { source }),
      close: () => send('Target.closeTarget', { targetId }),
    };
    return api;
  }

  return {
    page,
    async close() {
      try { ws.close(); } catch {}
      proc.kill();
      await sleep(500);
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
    },
  };
}
