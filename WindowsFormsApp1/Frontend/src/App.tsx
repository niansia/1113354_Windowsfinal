import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useBootSequence } from './hooks/useBootSequence';
import { FusionBootSequence } from './components/boot/FusionBootSequence';
import { FusionHome } from './components/FusionHome';
import { FusionLogin, type LoginPhase } from './components/FusionLogin';
import { useAccount } from './account/AccountContext';
import { addHostMessageListener, sendMessageToHost } from './utils/bridge';
import { fusionRuntimeCache } from './boot/runtimeCache';

// FusionOS startup orchestrator.
//
// Flow: Boot loader -> Login / first-run Setup -> Home.
//  1. boot.done  -> post FUSION_BOOT_DONE so the WinForms host leaves boot mode and the
//     WebView becomes the interactive login surface. The boot overlay fades once the
//     account state has loaded (so there is no black flash before login appears).
//  2. The login layer (z-50) sits over a hidden Home; on successful unlock/setup the
//     account context flips to `authed`, Home mounts + reveals, and the login fades out.
export default function App() {
  const boot = useBootSequence();
  const { status, authed } = useAccount();
  const [showHome, setShowHome] = useState(false);
  const [revealHome, setRevealHome] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const [loginMounted, setLoginMounted] = useState(false);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>('idle');
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

  // Notify the host exactly once when boot completes (host leaves fullscreen-boot mode).
  useEffect(() => {
    if (!boot.done || bootDoneSentRef.current) return;
    bootDoneSentRef.current = true;

    const diag = fusionRuntimeCache.bootDiagnostics;
    sendMessageToHost('FUSION_BOOT_DONE', {
      bootCompleted: true,
      durationMs: diag?.durationMs ?? 0,
      taskCount: diag?.tasks.length ?? 0,
      fallbackTasks: diag?.tasks.filter((t) => !t.ok).map((t) => t.id) ?? []
    });
  }, [boot.done]);

  // Fade the boot overlay out only after boot finished AND the account state resolved,
  // so the login screen is ready underneath (no flash of empty desktop).
  const bootReadyToLeave = boot.done && status !== 'loading';
  useEffect(() => {
    if (!bootReadyToLeave) return;
    const timer = window.setTimeout(() => setOverlayGone(true), 420);
    return () => window.clearTimeout(timer);
  }, [bootReadyToLeave]);

  // Mount the login layer when authentication is required.
  useEffect(() => {
    if (boot.done && !authed && (status === 'needsSetup' || status === 'locked')) {
      setLoginMounted(true);
      setLoginPhase('idle');
    }
  }, [boot.done, authed, status]);

  // Once authenticated: mount Home, then play a Windows-style hand-off —
  //   "歡迎" welcome beat → login zooms/blurs out → desktop settles in underneath.
  useEffect(() => {
    if (!authed) return;
    setShowHome(true);
    if (loginMounted) {
      setLoginPhase('welcome');
      const toExit = window.setTimeout(() => {
        setLoginPhase('exit'); // login zoom-fade begins
        setRevealHome(true); // desktop animates in as the login dissolves
      }, 880);
      const toUnmount = window.setTimeout(() => setLoginMounted(false), 880 + 620);
      return () => {
        window.clearTimeout(toExit);
        window.clearTimeout(toUnmount);
      };
    }
    // Already authenticated at boot (no login shown): just reveal Home.
    const timer = window.setTimeout(() => setRevealHome(true), 30);
    return () => window.clearTimeout(timer);
  }, [authed, loginMounted]);

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
      {loginMounted && <FusionLogin phase={loginPhase} />}
      {!overlayGone && <FusionBootSequence state={boot} fadingOut={bootReadyToLeave} onSkip={boot.skip} />}
    </>
  );
}
