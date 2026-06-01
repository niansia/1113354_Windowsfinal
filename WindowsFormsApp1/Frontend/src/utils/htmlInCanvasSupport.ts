// Progressive enhancement detector for the experimental WICG "HTML-in-Canvas"
// proposal (https://github.com/WICG/html-in-canvas).
//
// The proposal lets HTML elements be painted into a 2D/WebGL canvas as a texture
// (drawElementImage / element snapshots / texElementImage2D / layoutSubtree)
// while the DOM still owns hit-testing & accessibility. That is exactly the model
// this spatial desktop follows: real DOM cards for interaction, canvas for the
// surrounding depth/particle compositing.
//
// The API is not shipping in current WebView2/Chromium, so we ONLY feature-detect
// it. When present we could upgrade card compositing to a canvas texture; when
// absent (the normal case) we use the stable CSS-3D + Canvas-2D fallback. Either
// way the UI never breaks.

export type RenderMode = 'html-in-canvas' | 'css3d';

let logged = false;

export function detectHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as (CanvasRenderingContext2D & Record<string, unknown>) | null;
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as (WebGLRenderingContext & Record<string, unknown>) | null;

    const hasDrawElementImage = !!ctx && typeof (ctx as Record<string, unknown>)['drawElementImage'] === 'function';
    const hasRequestPaint = typeof (canvas as unknown as Record<string, unknown>)['requestPaint'] === 'function';
    const hasLayoutSubtree =
      typeof (HTMLElement.prototype as unknown as Record<string, unknown>)['layoutSubtree'] === 'function' ||
      typeof (HTMLElement.prototype as unknown as Record<string, unknown>)['layoutsubtree'] === 'function';
    const hasCaptureElement = typeof (HTMLElement.prototype as unknown as Record<string, unknown>)['captureElementImage'] === 'function';
    const hasTexElementImage = !!gl && typeof (gl as Record<string, unknown>)['texElementImage2D'] === 'function';

    return hasDrawElementImage || hasRequestPaint || hasLayoutSubtree || hasCaptureElement || hasTexElementImage;
  } catch {
    return false;
  }
}

export function getRenderMode(): RenderMode {
  const supported = detectHtmlInCanvas();
  if (!logged) {
    logged = true;
    if (supported) {
      console.info('[FusionOS] HTML-in-Canvas API detected — progressive enhancement available.');
    } else {
      console.info('[FusionOS] HTML-in-Canvas API not available, using CSS3D/DOM fallback.');
    }
  }
  return supported ? 'html-in-canvas' : 'css3d';
}
