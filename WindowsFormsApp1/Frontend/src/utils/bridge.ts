/**
 * bridge.ts
 * 封裝與 WinForms WebView2 的通訊
 */

declare global {
  interface Window {
    chrome: {
      webview: {
        postMessage: (message: any) => void;
        addEventListener: (type: string, listener: (event: any) => void) => void;
        removeEventListener: (type: string, listener: (event: any) => void) => void;
      };
    };
  }
}

export const sendMessageToHost = (type: string, data: any) => {
  if (window.chrome?.webview) {
    window.chrome.webview.postMessage({ type, ...data });
  } else {
    console.warn('WebView2 host not found. Sending to console:', { type, ...data });
  }
};

export const launchApp = (appId: string) => {
  sendMessageToHost('LAUNCH_APP', { appId });
};

export const openSettings = () => {
  sendMessageToHost('OPEN_SETTINGS', {});
};
