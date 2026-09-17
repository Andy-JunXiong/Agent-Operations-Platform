import { DurableObject } from 'cloudflare:workers';
import { isAllowedTransition, derivedTaskForTransition, type DerivedTaskDefinition } from '../../src/domain/job-application-lifecycle.js';
import type { LifecycleState } from '../../src/domain/types.js';

declare const DEMO_HTML: string;
declare const DEMO_CSS: string;
declare const DEMO_JS: string;

const TTL = 60 * 60 * 1000;
const COOKIE = '__Host-aop_demo';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Command = { action: 'observe' | 'propose' | 'reset' } | {
  action: 'admit'; proposalId: string; expectedVersion: number;
  confirmed: boolean; idempotencyKey: string;
};
type Receipt = { id: string; proposalId: string; expectedVersion: number; idempotencyKey: string; version: number; admittedAt: string };
type State = {
  expiresAt: number; lifecycle: LifecycleState; version: number; observed: boolean;
  proposal: { id: string; alternativeId: string; expectedVersion: number } | null;
  task: DerivedTaskDefinition | null; receipt: Receipt | null;
  audit: { type: string; at: string; detail: string }[];
};
type Result = { status: number; code: string; message: string; state?: State; replayed?: boolean };
function initial(expiresAt: number): State {
  return { expiresAt, lifecycle: 'APPLIED', version: 1, observed: false, proposal: null, task: null, receipt: null, audit: [] };
}
const result = (status: number, code: string, message: string, state?: State): Result => ({ status, code, message, ...(state ? { state } : {}) });

// This is an isolated portfolio adapter. The Node WorkspaceService remains the
// production implementation. Only the pure lifecycle/task rules are shared.
export class DemoSession extends DurableObject<Env> {
  async start(): Promise<Result> {
    const existing = this.ctx.storage.kv.get<State>('state');
    if (existing && existing.expiresAt > Date.now()) return result(200, 'READY', 'Your sandbox is ready.', existing);
    const state = initial(Date.now() + TTL);
    this.ctx.storage.kv.put('state', state);
    await this.ctx.storage.setAlarm(state.expiresAt);
    return result(200, 'READY', 'Your sandbox is ready.', state);
  }

  read(): Result {
    const state = this.ctx.storage.kv.get<State>('state');
    return !state || state.expiresAt <= Date.now()
      ? result(410, 'SESSION_EXPIRED', 'Your sandbox expired. Reload to start again.')
      : result(200, 'READY', 'State loaded from server storage.', state);
  }

  run(command: Command): Result {
    return this.ctx.storage.transactionSync(() => {
      const current = this.read();
      if (!current.state) return current;
      let state = current.state;
      const audit = (type: string, detail: string) => state.audit.push({ type, detail, at: new Date().toISOString() });
      switch (command.action) {
        case 'reset':
          state = initial(state.expiresAt);
          break;
        case 'observe':
          if (state.observed) return result(200, 'ALREADY_OBSERVED', 'Evidence already recorded; no new write.', state);
          state.observed = true;
          audit('OBSERVATION', 'Synthetic recruiter reply recorded. Lifecycle remains APPLIED.');
          break;
        case 'propose':
          if (!state.observed) return result(409, 'EVIDENCE_REQUIRED', 'Record the evidence first.', state);
          if (state.proposal) return result(200, 'ALREADY_PROPOSED', 'Proposal already recorded; no new write.', state);
          state.proposal = { id: crypto.randomUUID(), alternativeId: crypto.randomUUID(), expectedVersion: state.version };
          audit('PROPOSAL', 'RECRUITER_CONTACT proposed at version 1. A competing proposal is held for the stale-write test.');
          break;
        case 'admit': {
          if (!command.confirmed) return result(403, 'AUTHORITY_REQUIRED', 'Blocked: evidence and a suggestion do not grant approval.', state);
          if (!state.proposal || ![state.proposal.id, state.proposal.alternativeId].includes(command.proposalId)) return result(409, 'PROPOSAL_REQUIRED', 'A recorded proposal is required.', state);
          const receipt = state.receipt;
          if (receipt?.idempotencyKey === command.idempotencyKey) {
            if (receipt.proposalId !== command.proposalId || receipt.expectedVersion !== command.expectedVersion) return result(409, 'IDEMPOTENCY_CONFLICT', 'That key belongs to a different command.', state);
            return { ...result(200, 'REPLAYED', 'Original receipt returned. No new state change, task or audit entry.', state), replayed: true };
          }
          if (command.expectedVersion !== state.version || state.proposal.expectedVersion !== state.version) return result(409, 'VERSION_CONFLICT', `Blocked: proposal expects version ${command.expectedVersion}; current version is ${state.version}.`, state);
          if (!isAllowedTransition(state.lifecycle, 'RECRUITER_CONTACT')) return result(409, 'INVALID_TRANSITION', 'Lifecycle rule rejected the transition.', state);
          state.task = derivedTaskForTransition(state.lifecycle, 'RECRUITER_CONTACT');
          state.lifecycle = 'RECRUITER_CONTACT';
          state.version += 1;
          state.receipt = { id: crypto.randomUUID(), proposalId: command.proposalId, expectedVersion: command.expectedVersion, idempotencyKey: command.idempotencyKey, version: state.version, admittedAt: new Date().toISOString() };
          audit('ADMISSION', 'Visitor confirmed. State advanced to version 2; one follow-up task and one receipt committed together.');
          break;
        }
      }
      this.ctx.storage.kv.put('state', state);
      return result(200, command.action.toUpperCase(), command.action === 'reset' ? 'Sandbox reset.' : 'Operation recorded.', state);
    });
  }

  async alarm(): Promise<void> {
    const state = this.ctx.storage.kv.get<State>('state');
    // A delayed alarm must not erase a session renewed after its old expiry.
    if (state && state.expiresAt > Date.now()) await this.ctx.storage.setAlarm(state.expiresAt);
    else await this.ctx.storage.deleteAll();
  }
}

function parseCommand(value: unknown): Command | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (['observe', 'propose', 'reset'].includes(String(v.action)) && Object.keys(v).length === 1) return v as Command;
  if (v.action === 'admit' && Object.keys(v).sort().join(',') === 'action,confirmed,expectedVersion,idempotencyKey,proposalId'
    && typeof v.proposalId === 'string' && uuid.test(v.proposalId)
    && typeof v.idempotencyKey === 'string' && uuid.test(v.idempotencyKey)
    && Number.isSafeInteger(v.expectedVersion) && typeof v.confirmed === 'boolean') return v as Command;
  return null;
}

async function boundedJSON(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let total = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; } finally { reader.releaseLock(); }
}

const headers = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
function json(data: Result, cookie?: string): Response {
  return Response.json(data, { status: data.status, headers: { ...headers, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const assets: Record<string, [string, string]> = {
        '/': [DEMO_HTML, 'text/html'], '/style.css': [DEMO_CSS, 'text/css'], '/app.js': [DEMO_JS, 'text/javascript'],
        '/robots.txt': ['User-agent: *\nDisallow: /api/\n', 'text/plain'],
      };
      if (assets[url.pathname]) {
        const [body, type] = assets[url.pathname];
        return new Response(body, { headers: { ...headers, 'Content-Type': `${type}; charset=utf-8` } });
      }
    }
    if (!['/api/session', '/api/state', '/api/action'].includes(url.pathname)) return json(result(404, 'NOT_FOUND', 'Route not found.'));
    if ((url.pathname === '/api/state' && request.method !== 'GET') || (url.pathname !== '/api/state' && request.method !== 'POST')) return json(result(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'));
    if (request.method === 'POST' && (request.headers.get('Origin') !== url.origin || request.headers.get('X-Demo-Request') !== '1' || request.headers.get('Content-Type') !== 'application/json')) return json(result(403, 'ORIGIN_REJECTED', 'Use the demo page to perform this action.'));
    let session = request.headers.get('Cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!session || !uuid.test(session)) session = undefined;
    if (!session && url.pathname !== '/api/session') return json(result(401, 'SESSION_REQUIRED', 'Start a sandbox first.'));
    const isNew = !session;
    session ??= crypto.randomUUID();
    try {
      const stub = env.SESSIONS.getByName(session);
      if (url.pathname === '/api/session') {
        const data = await stub.start();
        const seconds = Math.max(0, Math.floor(((data.state?.expiresAt ?? Date.now()) - Date.now()) / 1000));
        return json(data, isNew ? `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}` : undefined);
      }
      if (url.pathname === '/api/state') return json(await stub.read());
      const command = parseCommand(await boundedJSON(request));
      if (!command) return json(result(400, 'INVALID_COMMAND', 'Only the fixed demo actions are accepted.'));
      return json(await stub.run(command));
    } catch {
      return json(result(503, 'TEMPORARILY_UNAVAILABLE', 'Sandbox temporarily unavailable. Please try again shortly.'));
    }
  },
} satisfies ExportedHandler<Env>;
