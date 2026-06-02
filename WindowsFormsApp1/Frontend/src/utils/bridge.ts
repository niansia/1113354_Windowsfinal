/**
 * WebView2 bridge for commands sent from React to the WinForms host.
 */
declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage: (message: unknown) => void;
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
        removeEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
      };
    };
  }
}

export const sendMessageToHost = (type: string, data: Record<string, unknown> = {}) => {
  const message = { type, ...data };
  if (window.chrome?.webview) {
    window.chrome.webview.postMessage(message);
    return;
  }
  if (window.localStorage?.getItem('fusionBridgeDebug') === '1') {
    console.warn('WebView2 host not found. Message kept in browser fallback:', message);
  }
};

export const launchApp = (appId: string) => {
  sendMessageToHost('LAUNCH_APP', { appId });
};

export const openSettings = () => {
  sendMessageToHost('OPEN_SETTINGS');
};
