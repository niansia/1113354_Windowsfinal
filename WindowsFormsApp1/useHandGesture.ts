import * as React from 'react';
import { calculateDistance } from './gestureUtils';

/**
 * useHandGesture.ts
 * 處理 MediaPipe Hands 載入與手勢偵測邏輯
 */

export type GestureStatus = 'LOADING' | 'CAMERA_READY' | 'HAND_TRACKING' | 'PINCH_LOCKED' | 'RELEASED' | 'ERROR';

export const useHandGesture = () => {
  const [status, setStatus] = React.useState<GestureStatus>('LOADING');
  const [pinchPos, setPinchPos] = React.useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const handsRef = React.useRef<any>(null);

  React.useEffect(() => {
    // 1. 動態載入 MediaPipe Scripts
    const loadScripts = async () => {
      try {
        const scripts = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
          'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
        ];

        for (const src of scripts) {
          if (!document.querySelector(`script[src="${src}"]`)) {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
            await new Promise((res) => script.onload = res);
          }
        }

        initHands();
      } catch (e) {
        console.error('MediaPipe Load Error', e);
        setStatus('ERROR');
      }
    };

    const initHands = () => {
      // @ts-ignore
      const Hands = window.Hands;
      // @ts-ignore
      const Camera = window.Camera;

      if (!Hands || !Camera) {
        setStatus('ERROR');
        return;
      }

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Landmark 4: Thumb Tip, 8: Index Tip
          const thumb = landmarks[4];
          const index = landmarks[8];
          
          const dist = calculateDistance(thumb, index);
          const isPinch = dist < 0.05; // 捏合閾值

          setIsPinching(isPinch);
          setStatus(isPinch ? 'PINCH_LOCKED' : 'HAND_TRACKING');
          
          // 輸出食指座標作為控制點 (反轉 X 軸以符合直覺)
          setPinchPos({ x: 1 - index.x, y: index.y });
        } else {
          setIsPinching(false);
          setStatus('CAMERA_READY');
        }
      });

      handsRef.current = hands;

      // 設定相機
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            await hands.send({ image: videoRef.current! });
          },
          width: 640,
          height: 480
        });
        camera.start();
        setStatus('CAMERA_READY');
      }
    };

    loadScripts();
  }, []);

  return { status, pinchPos, isPinching, videoRef };
};
