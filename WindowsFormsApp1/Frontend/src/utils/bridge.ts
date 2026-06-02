export type FusionHostMessageType =
  | 'FUSION_SHELL_READY'
  | 'FUSION_SIDEBAR_LAYOUT'
  | 'FUSION_HOST_FULLSCREEN_CHANGED'
  | 'FUSION_APP_LAUNCH_STATUS'
  | 'FUSION_ACTIVE_APP_CHANGED'
  | 'FUSION_CAMERA_RELEASE'
  | 'FUSION_CAMERA_RESUME';

export interface FusionHostMessage<TPayload = unknown> {
  type: FusionHostMessageType | string;
  payload?: TPayload;
  raw?: unknown;
}

type WebViewMessageHandler = (event: MessageEvent) => void;

interface WebViewBridge {
  postMessage: (message: unknown) => void;
  addEventListener?: (type: 'message', listener: WebViewMessageHandler) => void;
  removeEventListener?: (type: 'message', listener: WebViewMessageHandler) => void;
}

declare global {
  interface Window {
    chrome?: {
      webview?: WebViewBridge;
    };
  }
}

const isDebugBridge = () =>
  typeof window !== 'undefined' && window.localStorage?.getItem('fusionBridgeDebug') === '1';

export const hasHostBridge = () =>
  typeof window !== 'undefined' && typeof window.chrome?.webview?.postMessage === 'function';

export const sendMessageToHost = (type: string, data: Record<string, unknown> = {}) => {
  const message = { type, ...data };
  if (hasHostBridge()) {
    window.chrome!.webview!.postMessage(message);
    return true;
  }

  if (isDebugBridge()) {
    console.warn('[FusionBridge] WebView2 host not found:', message);
  }
  return false;
};

export const launchApp = (appId: string) => {
  sendMessageToHost('LAUNCH_APP', { appId });
};

export const openSettings = () => {
  sendMessageToHost('OPEN_SETTINGS');
};

export const parseHostMessage = (data: unknown): FusionHostMessage | null => {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('{')) {
      return { type: trimmed, raw: data };
    }
    try {
      const parsed = JSON.parse(trimmed) as Partial<FusionHostMessage>;
      return parsed.type ? { type: parsed.type, payload: parsed.payload, raw: data } : null;
    } catch {
      return { type: trimmed, raw: data };
    }
  }

  if (data && typeof data === 'object' && 'type' in data) {
    const typed = data as Partial<FusionHostMessage>;
    return typed.type ? { type: typed.type, payload: typed.payload, raw: data } : null;
  }

  return null;
};

export const addHostMessageListener = (listener: (message: FusionHostMessage) => void) => {
  const webview = window.chrome?.webview;
  if (!webview?.addEventListener || !webview.removeEventListener) {
    return () => {};
  }

  const handler: WebViewMessageHandler = (event) => {
    const message = parseHostMessage(event.data);
    if (message) listener(message);
  };

  webview.addEventListener('message', handler);
  return () => webview.removeEventListener?.('message', handler);
};
