import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useBootSequence } from './hooks/useBootSequence';
import { FusionBootSequence } from './components/boot/FusionBootSequence';
import { FusionHome } from './components/FusionHome';
import { sendMessageToHost } from './utils/bridge';
import { fusionRuntimeCache } from './boot/runtimeCache';

interface SidebarLayoutMessage {
  type: 'FUSION_SIDEBAR_LAYOUT';
  payload: {
    expanded: boolean;
    width: number;
    compactWidth: number;
    expandedWidth: number;
  };
}

const DEFAULT_SIDEBAR_LAYOUT = {
  expanded: true,
  width: 250,
  compactWidth: 76,
  expandedWidth: 250
};

function parseHostMessage(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  if (!data.trim().startsWith('{')) return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// FusionOS startup orchestrator.
//
// Clean single-reveal choreography (no intermediate "图2" state):
//  1. boot.done  -> mount Home HIDDEN behind the still-opaque overlay; post
//     FUSION_BOOT_DONE so the WinForms host reveals the shell and resizes the
//     WebView from fullscreen-boot to the hero stage.
//  2. The host posts FUSION_SHELL_READY once that layout is final. Only THEN do we
//     crossfade: overlay out + Home in. Home is never shown in the wrong layout
//     because it stays hidden while the WebView resizes / shell appears.
//  3. A fallback timer reveals anyway if the host message never arrives.
export default function App() {
  const boot = useBootSequence();
  const [showHome, setShowHome] = useState(false);
  const [revealHome, setRevealHome] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const [sidebarLayout, setSidebarLayout] = useState(DEFAULT_SIDEBAR_LAYOUT);
  const bootDoneSentRef = useRef(false);

  useEffect(() => {
    const wv = (window as unknown as { chrome?: { webview?: { addEventListener?: (t: string, cb: (e: MessageEvent) => void) => void; removeEventListener?: (t: string, cb: (e: MessageEvent) => void) => void } } }).chrome?.webview;
    const onMsg = (e: MessageEvent) => {
      const parsed = parseHostMessage(e.data) as Partial<SidebarLayoutMessage>;
      if (parsed && parsed.type === 'FUSION_SIDEBAR_LAYOUT' && parsed.payload) {
        setSidebarLayout({
          expanded: !!parsed.payload.expanded,
          width: Number(parsed.payload.width) || DEFAULT_SIDEBAR_LAYOUT.width,
          compactWidth: Number(parsed.payload.compactWidth) || DEFAULT_SIDEBAR_LAYOUT.compactWidth,
          expandedWidth: Number(parsed.payload.expandedWidth) || DEFAULT_SIDEBAR_LAYOUT.expandedWidth
        });
      }
    };
    wv?.addEventListener?.('message', onMsg);
    return () => {
      wv?.removeEventListener?.('message', onMsg);
    };
  }, []);

  // Mount Home (hidden) + notify host exactly once when boot completes.
  useEffect(() => {
    if (!boot.done || bootDoneSentRef.current) return;
    bootDoneSentRef.current = true;
    setShowHome(true);

    const diag = fusionRuntimeCache.bootDiagnostics;
    sendMessageToHost('FUSION_BOOT_DONE', {
      bootCompleted: true,
      durationMs: diag?.durationMs ?? 0,
      taskCount: diag?.tasks.length ?? 0,
      fallbackTasks: diag?.tasks.filter((t) => !t.ok).map((t) => t.id) ?? []
    });
  }, [boot.done]);

  // Reveal only after the host confirms the final shell layout (or fallback).
  useEffect(() => {
    if (!showHome) return;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      setRevealHome(true);
      window.setTimeout(() => setOverlayGone(true), 820);
    };

    const wv = (window as unknown as { chrome?: { webview?: { addEventListener?: (t: string, cb: (e: MessageEvent) => void) => void; removeEventListener?: (t: string, cb: (e: MessageEvent) => void) => void } } }).chrome?.webview;
    const onMsg = (e: MessageEvent) => {
      const data = typeof e.data === 'string' ? e.data : '';
      if (data === 'FUSION_SHELL_READY') reveal();
    };
    wv?.addEventListener?.('message', onMsg);

    // Fallback: reveal even if the host never reports shell-ready (e.g. browser).
    const fallback = window.setTimeout(reveal, 1500);

    return () => {
      wv?.removeEventListener?.('message', onMsg);
      window.clearTimeout(fallback);
    };
  }, [showHome]);

  const sidebarInset = Math.max(0, sidebarLayout.width + 30);
  const shellStyle = {
    '--fusion-sidebar-inset': `${sidebarInset}px`,
    '--fusion-sidebar-width': `${sidebarLayout.width}px`,
    '--fusion-sidebar-expanded': sidebarLayout.expanded ? '1' : '0'
  } as CSSProperties;

  return (
    <>
      {showHome && (
        <div className={`fusion-home-wrap ${revealHome ? 'revealed' : ''}`} style={shellStyle}>
          <FusionHome />
        </div>
      )}
      {!overlayGone && <FusionBootSequence state={boot} fadingOut={revealHome} onSkip={boot.skip} />}
    </>
  );
}
