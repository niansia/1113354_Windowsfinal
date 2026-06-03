import { useEffect, useState } from 'react';

// Reads REAL machine information through cross-platform browser APIs
// (navigator / screen / Battery / Storage / mediaDevices). Works the same on
// Windows, macOS and Linux because it only relies on the web platform, not on
// the WinForms host. It never *changes* anything on the machine — read only.

export interface SystemInfo {
  os: string; // e.g. "Windows 11", "macOS 14.4"
  device: string; // best-effort device/platform descriptor
  arch: string; // e.g. "x86 64-bit"
  browser: string; // engine / browser brand
  cores: number | null;
  memoryGB: number | null;
  screen: string; // logical resolution "1920 × 1080"
  physical: string; // physical pixels (× dpr)
  dpr: number;
  scalePercent: number; // system display scaling, e.g. 125
  language: string;
  online: boolean;
  connection: string | null; // effective connection type
  battery: { level: number; charging: boolean } | null;
  storage: { usedGB: number; totalGB: number } | null;
  audioOutputs: string[];
}

type NavAny = Navigator & {
  userAgentData?: {
    platform?: string;
    brands?: Array<{ brand: string; version: string }>;
    getHighEntropyValues?: (hints: string[]) => Promise<Record<string, string>>;
  };
  deviceMemory?: number;
  getBattery?: () => Promise<any>;
  connection?: { effectiveType?: string };
};

function nav(): NavAny {
  return navigator as NavAny;
}

function detectOS(): string {
  const n = nav();
  const ua = n.userAgent || '';
  const plat = n.userAgentData?.platform || n.platform || '';
  if (/Win/i.test(plat) || /Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(plat) || /Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux|X11/i.test(plat) || /Linux/i.test(ua)) return 'Linux';
  return plat || 'Unknown';
}

function detectBrowser(): string {
  const n = nav();
  const brands = n.userAgentData?.brands;
  if (brands && brands.length) {
    const real = brands.find((b) => !/Not.*Brand/i.test(b.brand));
    if (real) return `${real.brand} ${real.version}`;
  }
  const ua = n.userAgent || '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'WebView';
}

function initialInfo(): SystemInfo {
  const n = nav();
  const dpr = window.devicePixelRatio || 1;
  return {
    os: detectOS(),
    device: detectOS(),
    arch: '',
    browser: detectBrowser(),
    cores: n.hardwareConcurrency || null,
    memoryGB: n.deviceMemory || null,
    screen: `${window.screen.width} × ${window.screen.height}`,
    physical: `${Math.round(window.screen.width * dpr)} × ${Math.round(window.screen.height * dpr)}`,
    dpr,
    scalePercent: Math.round(dpr * 100),
    language: n.language || 'en',
    online: n.onLine,
    connection: n.connection?.effectiveType || null,
    battery: null,
    storage: null,
    audioOutputs: []
  };
}

export function useSystemInfo(): SystemInfo {
  const [info, setInfo] = useState<SystemInfo>(initialInfo);

  useEffect(() => {
    let alive = true;
    const patch = (p: Partial<SystemInfo>) => {
      if (alive) setInfo((prev) => ({ ...prev, ...p }));
    };
    const n = nav();

    // High-entropy UA-CH -> precise OS version + CPU architecture (Chromium).
    const uaData = n.userAgentData;
    if (uaData?.getHighEntropyValues) {
      uaData
        .getHighEntropyValues(['platformVersion', 'architecture', 'bitness', 'model'])
        .then((hv) => {
          const plat = uaData.platform || detectOS();
          const major = parseInt((hv.platformVersion || '0').split('.')[0], 10);
          let os = plat;
          if (plat === 'Windows') os = major >= 13 ? 'Windows 11' : major >= 1 ? 'Windows 10' : 'Windows';
          else if (plat === 'macOS') os = `macOS ${hv.platformVersion || ''}`.trim();
          else if (plat) os = `${plat} ${hv.platformVersion || ''}`.trim();
          const arch = hv.architecture
            ? `${hv.architecture}${hv.bitness ? ` ${hv.bitness}-bit` : ''}`
            : '';
          patch({ os, arch, device: hv.model || plat || os });
        })
        .catch(() => undefined);
    }

    // Battery
    if (n.getBattery) {
      n.getBattery()
        .then((bat: any) => {
          const read = () => patch({ battery: { level: Math.round(bat.level * 100), charging: !!bat.charging } });
          read();
          bat.addEventListener?.('levelchange', read);
          bat.addEventListener?.('chargingchange', read);
        })
        .catch(() => undefined);
    }

    // Storage estimate
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          patch({
            storage: {
              usedGB: (est.usage || 0) / 1e9,
              totalGB: (est.quota || 0) / 1e9
            }
          });
        })
        .catch(() => undefined);
    }

    // Audio output devices (labels available once camera/mic permission granted)
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devs) => {
          const outs = devs
            .filter((d) => d.kind === 'audiooutput')
            .map((d, i) => d.label || `輸出裝置 ${i + 1}`);
          if (outs.length) patch({ audioOutputs: outs });
        })
        .catch(() => undefined);
    }

    const onNet = () => patch({ online: navigator.onLine, connection: n.connection?.effectiveType || null });
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);

    return () => {
      alive = false;
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, []);

  return info;
}
