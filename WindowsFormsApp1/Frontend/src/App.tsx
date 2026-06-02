import { useEffect, useRef, useState } from 'react';
import { useBootSequence } from './hooks/useBootSequence';
import { FusionBootSequence } from './components/boot/FusionBootSequence';
import { FusionHome } from './components/FusionHome';
import { sendMessageToHost } from './utils/bridge';
import { fusionRuntimeCache } from './boot/runtimeCache';

// FusionOS startup orchestrator.
//  - Boot overlay runs the real preload pipeline first.
//  - Home mounts exactly once when boot completes (camera/gesture start once).
//  - The boot overlay then crossfades out over the already-mounted Home (no white
//    flash) and unmounts so it can't block clicks.
export default function App() {
  const boot = useBootSequence();
  const [showHome, setShowHome] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const bootDoneSentRef = useRef(false);

  useEffect(() => {
    if (!boot.done) return;
    setShowHome(true); // mount Home behind the (still visible) overlay

    // Tell the WinForms host the system has booted -> it reveals the shell and
    // restores the WebView to the hero stage. Sent exactly once (covers skip /
    // timeout / reduced-motion paths too, since boot.done always resolves).
    if (!bootDoneSentRef.current) {
      bootDoneSentRef.current = true;
      const diag = fusionRuntimeCache.bootDiagnostics;
      sendMessageToHost('FUSION_BOOT_DONE', {
        bootCompleted: true,
        durationMs: diag?.durationMs ?? 0,
        taskCount: diag?.tasks.length ?? 0,
        fallbackTasks: diag?.tasks.filter((t) => !t.ok).map((t) => t.id) ?? []
      });
    }

    const t = window.setTimeout(() => setOverlayGone(true), 750); // remove overlay after crossfade
    return () => window.clearTimeout(t);
  }, [boot.done]);

  return (
    <>
      {showHome && <FusionHome />}
      {!overlayGone && <FusionBootSequence state={boot} fadingOut={boot.done} onSkip={boot.skip} />}
    </>
  );
}
