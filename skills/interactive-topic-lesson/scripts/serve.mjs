#!/usr/bin/env node
import http from 'node:http';
import { isIP } from 'node:net';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { safeJson } from './lib.mjs';

function duration(hours) {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) throw new Error('hours must be greater than 0 and at most 24');
  return hours * 3_600_000;
}
function privateInterface(bind) {
  if (isIP(bind) === 4) {
    const [a,b] = bind.split('.').map(Number);
    return a === 127 || a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31;
  }
  return isIP(bind) === 6 && (bind === '::1' || /^(?:fc|fd|fe80:)/i.test(bind));
}
function hostAddress(bind) { return bind.includes(':') ? `[${bind}]` : bind; }
async function pageFile(filename) {
  const file = path.resolve(filename);
  const html = await readFile(file, 'utf8');
  if (!html.includes('/*__DELIVERY__*/null') || !html.includes('sandbox="allow-scripts"')) throw new Error('Serve only an index.html built by this skill version');
  return { file, html };
}
async function atomicState(filename, state) {
  const temporary = filename + '.' + randomBytes(6).toString('hex') + '.tmp';
  await writeFile(temporary, JSON.stringify(state, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await rename(temporary, filename);
}

export async function startLessonServer({ lesson, bind = '127.0.0.1', port = 0, hours = 4, state: stateFile }) {
  const ms = duration(hours);
  if (!privateInterface(bind)) throw new Error('Bind an explicit loopback or private LAN interface; wildcard/public interfaces are unsupported');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('port must be 0–65535');
  if (!stateFile) throw new Error('A private --state file is required');
  const statePath = path.resolve(stateFile);
  if (await access(statePath).then(()=>true,()=>false)) throw new Error('State file already exists; use the recorded service or choose a new private state path');
  let current = await pageFile(lesson);
  if (current.file === statePath) throw new Error('State must not overwrite the lesson page');
  await mkdir(path.dirname(statePath), { recursive: true });
  const token = randomBytes(32).toString('hex');
  const route = '/lesson/' + randomBytes(12).toString('hex') + '/';
  let record, timer, stopPromise, stopped = false, queue = Promise.resolve();
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.url === '/__agent/control' && req.method === 'POST') {
      const auth = req.headers.authorization || '';
      const expected = 'Bearer ' + token;
      if (Buffer.byteLength(auth) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      let body = '';
      req.on('data', part => { body += part; if (Buffer.byteLength(body) > 4096) req.destroy(); });
      req.on('end', () => {
        queue = queue.then(async () => {
          try {
            const action = JSON.parse(body);
            if (stopped) throw new Error('Service already stopped');
            if (action.type === 'update') {
              const next = await pageFile(action.lesson);
              if (next.file === statePath) throw new Error('Invalid page path');
              const updated = { ...record, lesson: next.file, updatedAt: new Date().toISOString() };
              await atomicState(statePath, updated);
              record = updated; current = next;
            } else if (action.type === 'extend') {
              const nextExpiry = Date.now() + duration(action.hours);
              const updated = { ...record, expiresAt: new Date(nextExpiry).toISOString() };
              await atomicState(statePath, updated);
              record = updated; arm();
            } else if (action.type === 'stop') {
              // Confirm persisted shutdown state before acknowledging the command.
              const updated = { ...record, status:'stopped', stoppedAt:new Date().toISOString() };
              await atomicState(statePath, updated); record = updated;
            } else throw new Error('Unsupported control action');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, url: record.url, expiresAt: record.expiresAt }));
            if (action.type === 'stop') await stop();
          } catch (error) { if (!res.headersSent) res.writeHead(400); res.end(JSON.stringify({ ok: false, error: error.message })); }
        }).catch(() => { if (!res.writableEnded) { res.writeHead(500); res.end('Control error'); } });
      });
      return;
    }
    if (req.url !== route || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
    if (stopped || Date.now() >= Date.parse(record.expiresAt)) { res.writeHead(410); res.end('Lesson hosting expired'); return; }
    // Resolve the page and lifecycle as one snapshot; never expose directories or private state.
    const snapshot = { file: current.file, expiresAt: record.expiresAt };
    readFile(snapshot.file, 'utf8').then(html => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.method === 'HEAD' ? '' : html.replace('/*__DELIVERY__*/null', safeJson({ expiresAt: snapshot.expiresAt })));
    }).catch(() => { res.writeHead(503); res.end('Lesson temporarily unavailable'); });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  function stop() {
    if (stopPromise) return stopPromise;
    stopped = true; clearTimeout(timer);
    const closed = new Promise(resolve => server.close(resolve));
    server.closeIdleConnections();
    stopPromise = (async () => {
      try {
        if (record.status !== 'stopped') {
          record = { ...record, status:'stopped', stoppedAt:new Date().toISOString() };
          await atomicState(statePath, record);
        }
      } finally { await closed; }
    })();
    return stopPromise;
  }
  function arm() {
    clearTimeout(timer);
    timer = setTimeout(() => { stop().catch(error => console.error(error.message)); }, Math.max(1, Date.parse(record.expiresAt) - Date.now()));
  }
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, bind, resolve); });
  const address = server.address();
  record = {
    format: 'interactive-topic-lesson.delivery.v1', status: 'running', url: `http://${hostAddress(bind)}:${address.port}${route}`,
    bind, port: address.port, pid: process.pid, lesson: current.file,
    expiresAt: new Date(Date.now() + ms).toISOString(),
    audience: bind.startsWith('127.') || bind === '::1' ? 'author-preview-only' : 'private-network',
    controlUrl: `http://${hostAddress(bind)}:${address.port}/__agent/control`, stopToken: token,
    verification: { service: 'not_run', learnerDevice: 'not_run' },
    revisionMethod: 'Agent compiles a new private build, then uses --update; existing sessions keep their page',
  };
  try {
    // wx prevents two hosts from claiming the same manifest.
    await writeFile(statePath, JSON.stringify(record, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    arm();
  } catch (error) { await new Promise(resolve => server.close(resolve)); throw error; }
  return { server, stop, record: () => ({ ...record }) };
}

export async function controlService(stateFile, action) {
  const record = JSON.parse(await readFile(stateFile, 'utf8'));
  if (record.format !== 'interactive-topic-lesson.delivery.v1' || record.status !== 'running' || typeof record.stopToken !== 'string') throw new Error('No running lesson service in this manifest');
  const url = new URL(record.controlUrl);
  if (url.protocol !== 'http:' || url.username || url.password || !privateInterface(url.hostname.replace(/^\[|\]$/g, '')) || url.pathname !== '/__agent/control') throw new Error('Invalid private control address');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + record.stopToken, 'Content-Type': 'application/json' }, body: JSON.stringify(action), signal: AbortSignal.timeout(10_000), redirect: 'error' });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Lesson control failed');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const usage = 'serve.mjs --lesson index.html --state private/delivery.json [--bind private-IP] [--port 0] [--hours 4]; or --stop manifest; --update manifest --lesson new/index.html; --extend manifest --hours 4';
    if (args.length === 1 && args[0] === '--help') { console.log(usage); }
    else {
      const options = {};
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace(/^--/, '');
        if (!['lesson', 'state', 'bind', 'port', 'hours', 'stop', 'update', 'extend'].includes(key) || !args[i + 1] || Object.hasOwn(options, key)) throw new Error(usage);
        options[key] = ['port', 'hours'].includes(key) ? Number(args[i + 1]) : args[i + 1];
      }
      const modes = ['stop', 'update', 'extend'].filter(key => Object.hasOwn(options, key));
      if (modes.length > 1) throw new Error(usage);
      if (modes.length) {
        const mode = modes[0];
        const allowed = mode === 'stop' ? ['stop'] : mode === 'update' ? ['update','lesson'] : ['extend','hours'];
        if (Object.keys(options).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(options,key))) throw new Error(usage);
        console.log(JSON.stringify(await controlService(options[mode], { type: mode, lesson: options.lesson, hours: options.hours }), null, 2));
      } else {
        const service = await startLessonServer(options);
        console.log(JSON.stringify({ ok: true, url: service.record().url, expiresAt: service.record().expiresAt, audience: service.record().audience, state: path.resolve(options.state) }, null, 2));
        for (const signal of ['SIGTERM','SIGINT']) process.once(signal, () => { service.stop().catch(error => { console.error(error.message); process.exitCode = 1; }); });
      }
    }
  } catch (error) { console.error(JSON.stringify({ ok: false, errors: [error.message] })); process.exitCode = 1; }
}
