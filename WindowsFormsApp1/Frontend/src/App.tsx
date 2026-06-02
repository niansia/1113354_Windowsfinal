import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useBootSequence } from './hooks/useBootSequence';
import { FusionBootSequence } from './components/boot/FusionBootSequence';
import { FusionHome } from './components/FusionHome';
import { addHostMessageListener, sendMessageToHost } from './utils/bridge';
import { fusionRuntimeCache } from './boot/runtimeCache';

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
  const [hostFullscreen, setHostFullscreen] = useState(true);
  const bootDoneSentRef = useRef(false);

  useEffect(() => {
    return addHostMessageListener((message) => {
      if (message.type === 'FUSION_HOST_FULLSCREEN_CHANGED' && message.payload && typeof message.payload === 'object') {
        const payload = message.payload as { fullscreen?: unknown };
        setHostFullscreen(Boolean(payload.fullscreen));
      }
    });
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

    const disposeHostListener = addHostMessageListener((message) => {
      if (message.type === 'FUSION_SHELL_READY') reveal();
    });

    // Fallback: reveal even if the host never reports shell-ready (e.g. browser).
    const fallback = window.setTimeout(reveal, 1500);

    return () => {
      disposeHostListener();
      window.clearTimeout(fallback);
    };
  }, [showHome]);

  const shellStyle = {
    '--fusion-sidebar-inset': '0px',
    '--fusion-sidebar-width': '0px',
    '--fusion-sidebar-expanded': '0'
  } as CSSProperties;

  return (
    <>
      {showHome && (
        <div
          className={`fusion-home-wrap ${revealHome ? 'revealed' : ''} ${hostFullscreen ? 'host-fullscreen' : 'host-windowed'}`}
          style={shellStyle}
        >
          <FusionHome />
        </div>
      )}
      {!overlayGone && <FusionBootSequence state={boot} fadingOut={revealHome} onSkip={boot.skip} />}
    </>
  );
}
