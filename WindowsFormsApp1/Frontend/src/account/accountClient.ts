import { hasHostBridge, sendMessageToHost, addHostMessageListener } from '../utils/bridge';
import { ACCOUNT_TEXT } from '../settings/settingsText';

// Account data access. When the WinForms host (WebView2) is present, every call goes
// over the bridge to the SQLite-backed AccountStore. In a plain browser (dev preview),
// a localStorage + Web Crypto mock implements the exact same contract so the login,
// setup, and password flows stay fully testable without the host.

export interface AccountState {
  exists: boolean;
  needsSetup: boolean;
  displayName: string;
  email: string;
  language: string;
}

export interface AccountResult {
  ok: boolean;
  message?: string;
}

export interface AccountClient {
  getState(): Promise<AccountState>;
  setup(input: { displayName: string; email: string; password: string; language: string }): Promise<AccountResult>;
  verify(password: string): Promise<AccountResult>;
  updateProfile(input: { displayName: string; email: string }): Promise<AccountResult>;
  changePassword(input: { current: string; next: string }): Promise<AccountResult>;
  reset(): Promise<AccountResult>;
  onState(cb: (state: AccountState) => void): () => void;
}

const EMPTY_STATE: AccountState = { exists: false, needsSetup: true, displayName: '', email: '', language: 'zh-TW' };

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
    if (type === 'FUSION_ACCOUNT_STATE' && payload) {
      return {
        exists: Boolean(payload.exists),
        needsSetup: Boolean(payload.needsSetup),
        displayName: String(payload.displayName ?? ''),
        email: String(payload.email ?? ''),
        language: String(payload.language ?? 'zh-TW')
      };
    }
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
  verify(password) {
    const pending = waitForResult('verify');
    sendMessageToHost('FUSION_ACCOUNT_VERIFY', { password });
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
        const p = message.payload as any;
        cb({
          exists: Boolean(p.exists),
          needsSetup: Boolean(p.needsSetup),
          displayName: String(p.displayName ?? ''),
          email: String(p.email ?? ''),
          language: String(p.language ?? 'zh-TW')
        });
      }
    });
  }
};

/* ---------------- Mock client (browser dev — localStorage + Web Crypto) ---------------- */

const MOCK_KEY = 'fusionAccount.v1';
const MOCK_ITERATIONS = 100000;

interface MockRecord {
  displayName: string;
  email: string;
  language: string;
  salt: string; // base64
  hash: string; // base64
  iterations: number;
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

function readMock(): MockRecord | null {
  try {
    const raw = window.localStorage?.getItem(MOCK_KEY);
    return raw ? (JSON.parse(raw) as MockRecord) : null;
  } catch {
    return null;
  }
}
function writeMock(record: MockRecord | null) {
  try {
    if (record) window.localStorage?.setItem(MOCK_KEY, JSON.stringify(record));
    else window.localStorage?.removeItem(MOCK_KEY);
  } catch {
    /* ignore */
  }
}

const mockClient: AccountClient = {
  async getState() {
    const r = readMock();
    if (!r) return EMPTY_STATE;
    return { exists: true, needsSetup: false, displayName: r.displayName, email: r.email, language: r.language };
  },
  async setup(input) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(input.password, salt, MOCK_ITERATIONS);
    writeMock({
      displayName: input.displayName || ACCOUNT_TEXT.fusionUser,
      email: input.email || '',
      language: input.language || 'zh-TW',
      salt: toB64(salt),
      hash,
      iterations: MOCK_ITERATIONS
    });
    return { ok: true };
  },
  async verify(password) {
    const r = readMock();
    if (!r) return { ok: false, message: 'NO_ACCOUNT' };
    const hash = await pbkdf2(password, fromB64(r.salt), r.iterations);
    return hash === r.hash ? { ok: true } : { ok: false, message: 'INVALID_PASSWORD' };
  },
  async updateProfile(input) {
    const r = readMock();
    if (!r) return { ok: false };
    writeMock({ ...r, displayName: input.displayName || r.displayName, email: input.email });
    return { ok: true };
  },
  async changePassword(input) {
    const r = readMock();
    if (!r) return { ok: false };
    const currentHash = await pbkdf2(input.current, fromB64(r.salt), r.iterations);
    if (currentHash !== r.hash) return { ok: false, message: 'INVALID_PASSWORD' };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(input.next, salt, MOCK_ITERATIONS);
    writeMock({ ...r, salt: toB64(salt), hash, iterations: MOCK_ITERATIONS });
    return { ok: true };
  },
  async reset() {
    writeMock(null);
    return { ok: true };
  },
  onState() {
    return () => {};
  }
};

// Lock the choice in at module load: the host bridge is injected before scripts run.
export const accountClient: AccountClient = hasHostBridge() ? bridgeClient : mockClient;
export const accountBackend: 'host' | 'mock' = hasHostBridge() ? 'host' : 'mock';
