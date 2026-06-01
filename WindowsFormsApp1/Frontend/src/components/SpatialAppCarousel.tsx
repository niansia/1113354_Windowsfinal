import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GestureData } from '../hooks/useHandGesture';
import { FUSION_APPS } from '../data/fusionApps';
import { HolographicAppCard } from './HolographicAppCard';
import { launchApp } from '../utils/bridge';

interface SpatialAppCarouselProps {
  gestureData?: GestureData;
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
}

const ANIM_MS = 450;
const SPREAD = 300;

type QueuedSwipe = { swipeId: number; swipeDirection: 'left' | 'right' | null; gestureType: string };

export const SpatialAppCarousel: React.FC<SpatialAppCarouselProps> = ({ gestureData, onIndexChange, onQueueChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // fractional card units
  const [dragging, setDragging] = useState(false);

  const isAnimatingRef = useRef(false);
  const lastActivateId = useRef(0);
  const lastActivateTime = useRef(0);
  const lastHandledSwipeId = useRef(0);
  const queuedSwipeRef = useRef<QueuedSwipe | null>(null);
  // selected-app stability tracking
  const lastSwipeAtRef = useRef(0);
  const indexStableSinceRef = useRef(Date.now());

  // drag state
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const deckRef = useRef<HTMLDivElement>(null);

  const setQueue = useCallback((q: QueuedSwipe | null) => {
    queuedSwipeRef.current = q;
    onQueueChange?.(q ? 1 : 0);
  }, [onQueueChange]);

  const movePage = useCallback((direction: 'left' | 'right' | null) => {
    if (direction === 'left') setCurrentIndex((p) => (p >= FUSION_APPS.length - 1 ? p : p + 1));
    else if (direction === 'right') setCurrentIndex((p) => (p <= 0 ? p : p - 1));
  }, []);

  // One animation cycle; flush a queued swipe afterwards (max 1 queued).
  const runSwipe = useCallback((direction: 'left' | 'right' | null) => {
    isAnimatingRef.current = true;
    lastSwipeAtRef.current = Date.now();
    movePage(direction);
    window.setTimeout(() => {
      isAnimatingRef.current = false;
      const queued = queuedSwipeRef.current;
      if (queued) {
        setQueue(null);
        runSwipe(queued.swipeDirection);
      }
    }, ANIM_MS);
  }, [movePage, setQueue]);

  const handleNext = useCallback(() => { if (!isAnimatingRef.current) runSwipe('left'); }, [runSwipe]);
  const handlePrev = useCallback(() => { if (!isAnimatingRef.current) runSwipe('right'); }, [runSwipe]);

  const launchCurrent = useCallback(() => {
    const app = FUSION_APPS[currentIndex];
    if (app) launchApp(app.id);
  }, [currentIndex]);

  // Keyboard: arrows step, Enter launches, Esc resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Enter') launchCurrent();
      else if (e.key === 'Escape') setCurrentIndex(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev, launchCurrent]);

  // Discrete gesture swipes via swipeId (one swipeId => one page; queue 1 mid-anim).
  useEffect(() => {
    if (!gestureData || gestureData.swipeId === 0) return;
    const { swipeId, swipeDirection, gestureType } = gestureData;
    if (swipeId === lastHandledSwipeId.current) return;
    lastHandledSwipeId.current = swipeId;

    if (isAnimatingRef.current) {
      setQueue({ swipeId, swipeDirection, gestureType });
      console.log('[SpatialCarousel] swipe queued', { swipeId, swipeDirection, gestureType });
      return;
    }
    console.log('[SpatialCarousel] swipe accepted', { swipeId, swipeDirection, gestureType });
    runSwipe(swipeDirection);
  }, [gestureData?.swipeId, runSwipe, setQueue]);

  // Activation via activateId (double pinch / fist / index double tap).
  useEffect(() => {
    if (!gestureData || gestureData.activateId === 0) return;
    if (gestureData.activateId === lastActivateId.current) return;
    const now = Date.now();
    if (now - lastActivateTime.current < 900) return;
    // Selected-app stability gate: never launch a mid-swipe / unstable target.
    if (isAnimatingRef.current || queuedSwipeRef.current) {
      console.log('[SpatialCarousel] activate ignored', { reason: 'SELECTED_APP_NOT_STABLE' });
      return;
    }
    if (now - lastSwipeAtRef.current < 400 || now - indexStableSinceRef.current < 250) {
      console.log('[SpatialCarousel] activate ignored', { reason: 'SELECTED_APP_NOT_STABLE' });
      return;
    }
    lastActivateId.current = gestureData.activateId;
    lastActivateTime.current = now;
    const app = FUSION_APPS[currentIndex];
    console.log('[SpatialCarousel] activate selected app', { activateId: gestureData.activateId, activateType: gestureData.activateType, app: app?.id });
    if (app) launchApp(app.id);
  }, [gestureData?.activateId, currentIndex]);

  useEffect(() => { indexStableSinceRef.current = Date.now(); }, [currentIndex]);
  useEffect(() => { onIndexChange?.(currentIndex); }, [currentIndex, onIndexChange]);

  // Pointer drag (mouse) on the deck.
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragMoved.current = false;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 6) dragMoved.current = true;
    setDragOffset(-dx / SPREAD);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const step = Math.max(-1, Math.min(1, Math.round(dragOffset)));
    setDragOffset(0);
    if (step !== 0 && !isAnimatingRef.current) runSwipe(step > 0 ? 'left' : 'right');
  };

  const onWheel = (e: React.WheelEvent) => {
    if (isAnimatingRef.current) return;
    if (e.deltaY > 12 || e.deltaX > 12) handleNext();
    else if (e.deltaY < -12 || e.deltaX < -12) handlePrev();
  };

  // Subtle live air-control offset (palm/pinch) for tactile feedback.
  const externalDrag = (gestureData?.isPinching || gestureData?.status === 'PALM_CONTROL') ? (gestureData.deltaX || 0) / 1400 : 0;

  return (
    <div className="spatial-viewport" onWheel={onWheel}>
      <div
        ref={deckRef}
        className={`spatial-deck ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {FUSION_APPS.map((app, index) => {
          const position = index - currentIndex - dragOffset - externalDrag;
          if (Math.abs(position) > 3.4) return null;
          return (
            <HolographicAppCard
              key={app.id}
              app={app}
              position={position}
              isActive={index === currentIndex && Math.abs(dragOffset) < 0.5}
              spread={SPREAD}
              onClick={() => {
                if (dragMoved.current) return; // ignore click that ended a drag
                if (index === currentIndex) launchApp(app.id);
                else setCurrentIndex(index);
              }}
            />
          );
        })}
      </div>

      {/* page indicator */}
      <div className="spatial-dots">
        {FUSION_APPS.map((_, i) => (
          <span key={i} className={i === currentIndex ? 'dot active' : 'dot'} />
        ))}
      </div>
    </div>
  );
};
