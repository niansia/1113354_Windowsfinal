import { hasHostBridge, sendMessageToHost, addHostMessageListener } from '../utils/bridge';
import { ACCOUNT_TEXT } from '../settings/settingsText';

// Account data access. When the WinForms host (WebView2) is present, every call goes
// over the bridge to the SQLite-backed AccountStore. In a plain browser (dev preview),
// a localStorage + Web Crypto mock implements the exact same contract so the login,
// setup, and password flows stay fully testable without the host.
//
// Multi-user: the state carries EVERY account on the device; the login screen lets the
// user pick one (verify targets a userId) or create another (setup signs in as it).

export interface AccountUser {
  id: number;
  displayName: string;
  email: string;
  language: string;
}

export interface AccountState {
  exists: boolean;
  needsSetup: boolean;
  displayName: string;
  email: string;
  language: string;
  users: AccountUser[];
  currentUserId: number;
}

export interface AccountResult {
  ok: boolean;
  message?: string;
}

export interface AccountClient {
  getState(): Promise<AccountState>;
  setup(input: { displayName: string; email: string; password: string; language: string }): Promise<AccountResult>;
  verify(userId: number, password: string): Promise<AccountResult>;
  updateProfile(input: { displayName: string; email: string }): Promise<AccountResult>;
  changePassword(input: { current: string; next: string }): Promise<AccountResult>;
  reset(): Promise<AccountResult>;
  onState(cb: (state: AccountState) => void): () => void;
}

const EMPTY_STATE: AccountState = {
  exists: false, needsSetup: true, displayName: '', email: '', language: 'zh-TW', users: [], currentUserId: 0
};

function parseUsers(payload: any): AccountUser[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((u: any) => ({
    id: Number(u?.id ?? 0),
    displayName: String(u?.displayName ?? ''),
    email: String(u?.email ?? ''),
    language: String(u?.language ?? '')
  }));
}

function parseState(payload: any): AccountState {
  return {
    exists: Boolean(payload.exists),
    needsSetup: Boolean(payload.needsSetup),
    displayName: String(payload.displayName ?? ''),
    email: String(payload.email ?? ''),
    language: String(payload.language ?? 'zh-TW'),
    users: parseUsers(payload.users),
    currentUserId: Number(payload.currentUserId ?? 0)
  };
}

/* ---------------- Bridge client (talks to the WinForms host) ---------------- */

function waitForMessage<T>(match: (type: string, payload: any) => T | undefined, timeoutMs = 6000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      dispose();
      reject(new Error('bridge timeout'));
    }, timeoutMs);
    const dispose = addHostMessageListener((message) => {
      const value = match(message.type, message.payload);
      if (value !== undefined) {
        window.clearTimeout(timer);
        dispose();
        resolve(value);
      }
    });
  });
}

function waitForResult(op: string): Promise<AccountResult> {
  return waitForMessage<AccountResult>((type, payload) => {
    if (type === 'FUSION_ACCOUNT_RESULT' && payload && payload.op === op) {
      return { ok: Boolean(payload.ok), message: payload.message };
    }
    return undefined;
  }).catch(() => ({ ok: false, message: 'TIMEOUT' }));
}

function waitForState(): Promise<AccountState> {
  return waitForMessage<AccountState>((type, payload) => {
    if (type === 'FUSION_ACCOUNT_STATE' && payload) return parseState(payload);
    return undefined;
  }).catch(() => EMPTY_STATE);
}

const bridgeClient: AccountClient = {
  getState() {
    const pending = waitForState();
    sendMessageToHost('FUSION_ACCOUNT_GET');
    return pending;
  },
  setup(input) {
    const pending = waitForResult('setup');
    sendMessageToHost('FUSION_ACCOUNT_SETUP', input);
    return pending;
  },
  verify(userId, password) {
    const pending = waitForResult('verify');
    sendMessageToHost('FUSION_ACCOUNT_VERIFY', { userId, password });
    return pending;
  },
  updateProfile(input) {
    const pending = waitForResult('updateProfile');
    sendMessageToHost('FUSION_ACCOUNT_UPDATE_PROFILE', input);
    return pending;
  },
  changePassword(input) {
    const pending = waitForResult('changePassword');
    sendMessageToHost('FUSION_ACCOUNT_CHANGE_PASSWORD', input);
    return pending;
  },
  reset() {
    const pending = waitForResult('reset');
    sendMessageToHost('FUSION_ACCOUNT_RESET');
    return pending;
  },
  onState(cb) {
    return addHostMessageListener((message) => {
      if (message.type === 'FUSION_ACCOUNT_STATE' && message.payload) {
        cb(parseState(message.payload as any));
      }
    });
  }
};

/* ---------------- Mock client (browser dev — localStorage + Web Crypto) ---------------- */

const MOCK_KEY = 'fusionAccount.v2';
const LEGACY_MOCK_KEY = 'fusionAccount.v1';
const MOCK_ITERATIONS = 100000;

interface MockUser {
  id: number;
  displayName: string;
  email: string;
  language: string;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
}

interface MockDb {
  users: MockUser[];
  nextId: number;
  currentUserId: number;
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return toB64(new Uint8Array(bits));
}

function readMockDb(): MockDb {
  try {
    const raw = window.localStorage?.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
    // migrate the old single-account record into a one-user db
    const legacy = window.localStorage?.getItem(LEGACY_MOCK_KEY);
    if (legacy) {
      const r = JSON.parse(legacy);
      const db: MockDb = {
        users: [{ id: 1, displayName: r.displayName, email: r.email || '', language: r.language || 'zh-TW', salt: r.salt, hash: r.hash, iterations: r.iterations }],
        nextId: 2,
        currentUserId: 1
      };
      writeMockDb(db);
      window.localStorage?.removeItem(LEGACY_MOCK_KEY);
      return db;
    }
  } catch {
    /* fall through */
  }
  return { users: [], nextId: 1, currentUserId: 0 };
}
function writeMockDb(db: MockDb) {
  try {
    window.localStorage?.setItem(MOCK_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

function mockState(db: MockDb): AccountState {
  const current = db.users.find((u) => u.id === db.currentUserId) ?? db.users[0];
  return {
    exists: db.users.length > 0,
    needsSetup: db.users.length === 0,
    displayName: current?.displayName ?? '',
    email: current?.email ?? '',
    language: current?.language ?? 'zh-TW',
    users: db.users.map(({ id, displayName, email, language }) => ({ id, displayName, email, language })),
    currentUserId: current?.id ?? 0
  };
}

const mockClient: AccountClient = {
  async getState() {
    return mockState(readMockDb());
  },
  async setup(input) {
    const db = readMockDb();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(input.password, salt, MOCK_ITERATIONS);
    const user: MockUser = {
      id: db.nextId,
      displayName: input.displayName || ACCOUNT_TEXT.fusionUser,
      email: input.email || '',
      language: input.language || 'zh-TW',
      salt: toB64(salt),
      hash,
      iterations: MOCK_ITERATIONS
    };
    db.users.push(user);
    db.nextId += 1;
    db.currentUserId = user.id;
    writeMockDb(db);
    return { ok: true };
  },
  async verify(userId, password) {
    const db = readMockDb();
    const user = (userId > 0 ? db.users.find((u) => u.id === userId) : db.users[0]) ?? null;
    if (!user) return { ok: false, message: 'NO_ACCOUNT' };
    const hash = await pbkdf2(password, fromB64(user.salt), user.iterations);
    if (hash !== user.hash) return { ok: false, message: 'INVALID_PASSWORD' };
    db.currentUserId = user.id;
    writeMockDb(db);
    return { ok: true };
  },
  async updateProfile(input) {
    const db = readMockDb();
    const user = db.users.find((u) => u.id === db.currentUserId) ?? db.users[0];
    if (!user) return { ok: false };
    user.displayName = input.displayName || user.displayName;
    user.email = input.email;
    writeMockDb(db);
    return { ok: true };
  },
  async changePassword(input) {
    const db = readMockDb();
    const user = db.users.find((u) => u.id === db.currentUserId) ?? db.users[0];
    if (!user) return { ok: false };
    const currentHash = await pbkdf2(input.current, fromB64(user.salt), user.iterations);
    if (currentHash !== user.hash) return { ok: false, message: 'INVALID_PASSWORD' };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    user.hash = await pbkdf2(input.next, salt, MOCK_ITERATIONS);
    user.salt = toB64(salt);
    user.iterations = MOCK_ITERATIONS;
    writeMockDb(db);
    return { ok: true };
  },
  async reset() {
    writeMockDb({ users: [], nextId: 1, currentUserId: 0 });
    return { ok: true };
  },
  onState() {
    return () => {};
  }
};

// Lock the choice in at module load: the host bridge is injected before scripts run.
export const accountClient: AccountClient = hasHostBridge() ? bridgeClient : mockClient;
export const accountBackend: 'host' | 'mock' = hasHostBridge() ? 'host' : 'mock';
