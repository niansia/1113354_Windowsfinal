import { GestureData } from '../hooks/useHandGesture';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APPS_CONFIG } from '../types';
import { AppCard } from './AppCard';
import { launchApp } from '../utils/bridge';

interface GestureAppCarouselProps {
  onIndexChange?: (index: number) => void;
  onQueueChange?: (depth: number) => void;
  gestureData?: GestureData;
}

const ANIM_MS = 400;
const DEBUG_GESTURE_CAROUSEL =
  typeof window !== 'undefined' &&
  window.localStorage?.getItem('fusionCarouselDebug') === '1';

type QueuedSwipe = {
  swipeId: number;
  swipeDirection: 'left' | 'right' | null;
  gestureType: string;
};

export const GestureAppCarousel: React.FC<GestureAppCarouselProps> = ({
  onIndexChange,
  onQueueChange,
  gestureData
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isAnimatingRef = useRef(false);
  const lastActivateId = useRef(0);
  const lastActivateTime = useRef(0);

  // Each swipeId is consumed exactly once.
  const lastHandledSwipeId = useRef(0);
  // At most ONE pending swipe is queued while an animation is in flight.
  const queuedSwipeRef = useRef<QueuedSwipe | null>(null);

  const setQueue = useCallback((q: QueuedSwipe | null) => {
    queuedSwipeRef.current = q;
    onQueueChange?.(q ? 1 : 0);
  }, [onQueueChange]);

  // Apply a single page move in the given direction. Returns nothing.
  const movePage = useCallback((direction: 'left' | 'right' | null) => {
    if (direction === 'left') {
      setCurrentIndex(prev => (prev >= APPS_CONFIG.length - 1 ? prev : prev + 1));
    } else if (direction === 'right') {
      setCurrentIndex(prev => (prev <= 0 ? prev : prev - 1));
    }
  }, []);

  // Run one animation cycle for a swipe; when it ends, flush any queued swipe.
  const runSwipe = useCallback((direction: 'left' | 'right' | null) => {
    isAnimatingRef.current = true;
    movePage(direction);
    setTimeout(() => {
      isAnimatingRef.current = false;
      const queued = queuedSwipeRef.current;
      if (queued) {
        setQueue(null);
        if (DEBUG_GESTURE_CAROUSEL) {
          console.log('[GestureCarousel] swipe accepted', {
            swipeId: queued.swipeId,
            swipeDirection: queued.swipeDirection,
            gestureType: queued.gestureType
          });
        }
        runSwipe(queued.swipeDirection);
      }
    }, ANIM_MS);
  }, [movePage, setQueue]);

  // Manual one-page helpers (keyboard / buttons). Respect the same animation lock.
  const handleNext = useCallback(() => {
    if (isAnimatingRef.current) return;
    runSwipe('left');
  }, [runSwipe]);

  const handlePrev = useCallback(() => {
    if (isAnimatingRef.current) return;
    runSwipe('right');
  }, [runSwipe]);

  // Keyboard navigation (preserved).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Discrete gesture swipes via swipeId.
  // The recognizer never emits a swipeId for return motion, so anything that
  // reaches here is a genuine new stroke. One swipeId => one page.
  useEffect(() => {
    if (!gestureData || gestureData.swipeId === 0) return;
    const { swipeId, swipeDirection, gestureType } = gestureData;

    // Effect can re-run on unrelated field changes; ignore already-seen ids.
    if (swipeId === lastHandledSwipeId.current) return;
    lastHandledSwipeId.current = swipeId;

    if (isAnimatingRef.current) {
      // Queue the LATEST valid swipe (max 1). Older queued entry is replaced.
      setQueue({ swipeId, swipeDirection, gestureType });
      if (DEBUG_GESTURE_CAROUSEL) {
        console.log('[GestureCarousel] swipe queued', {
          swipeId,
          swipeDirection,
          gestureType
        });
      }
      return;
    }

    if (DEBUG_GESTURE_CAROUSEL) {
      console.log('[GestureCarousel] swipe accepted', {
        swipeId,
        swipeDirection,
        gestureType
      });
    }
    runSwipe(swipeDirection);
  }, [gestureData?.swipeId, runSwipe, setQueue]);

  // Activation via activateId. Shared by DOUBLE_PINCH / FIST / INDEX_DOUBLE_TAP.
  // All of them launch the currently centered (active) app via the same path.
  useEffect(() => {
    if (!gestureData || gestureData.activateId === 0) return;
    if (gestureData.activateId === lastActivateId.current) return;

    const now = Date.now();
    // 900ms activate cooldown.
    if (now - lastActivateTime.current < 900) return;

    lastActivateId.current = gestureData.activateId;
    lastActivateTime.current = now;

    // Never launch a mid-swipe (wrong) card: ignore while a page animation runs.
    if (isAnimatingRef.current) {
      if (DEBUG_GESTURE_CAROUSEL) {
        console.log('[GestureCarousel] activate ignored (animating)', {
          activateId: gestureData.activateId,
          activateType: gestureData.activateType
        });
      }
      return;
    }

    const activeApp = APPS_CONFIG[currentIndex];
    if (DEBUG_GESTURE_CAROUSEL) {
      console.log('[GestureCarousel] activate selected app', {
        activateId: gestureData.activateId,
        activateType: gestureData.activateType,
        activeIndex: currentIndex,
        app: activeApp?.id
      });
    }

    if (activeApp) launchApp(activeApp.id);
  }, [gestureData?.activateId, currentIndex]);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  const onDragEnd = (_event: any, info: any) => {
    const threshold = 80;
    if (info.offset.x < -threshold) handleNext();
    else if (info.offset.x > threshold) handlePrev();
    setDragOffset(0);
  };

  const externalDrag = (gestureData?.isPinching || gestureData?.status === 'PALM_CONTROL') ? gestureData.deltaX : 0;
  const status = gestureData?.status || 'INITIALIZING';

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">

      {/* Container for Cards */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={(_e, info) => setDragOffset(info.offset.x)}
        onDragEnd={onDragEnd}
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence initial={false}>
          {APPS_CONFIG.map((app, index) => {
            const position = index - currentIndex - (dragOffset + externalDrag) / 600;
            const isVisible = Math.abs(position) < 4;
            if (!isVisible) return null;

            return (
              <AppCard
                key={app.id}
                app={app}
                isActive={index === currentIndex}
                position={position}
                status={status}
                onClick={() => {
                  if (index === currentIndex) launchApp(app.id);
                  else setCurrentIndex(index);
                }}
              />
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
        {APPS_CONFIG.map((_, i) => (
          <div
            key={i}
            className={`
              w-1.5 h-1.5 rounded-full transition-all duration-300
              ${i === currentIndex ? 'bg-fusion-accent w-6 shadow-[0_0_10px_#22d3ee]' : 'bg-white/20'}
            `}
          />
        ))}
      </div>

      {/* Futuristic Pulse effect on swipe */}
      <AnimatePresence>
        {(status === 'FAST_SWIPE' || status === 'INDEX_SWIPE') && (
          <motion.div
            key={gestureData?.swipeId}
            initial={{ opacity: 0, scale: 0.5, rotate: status === 'FAST_SWIPE' ? 45 : 0 }}
            animate={{ opacity: 0.15, scale: 2, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none bg-fusion-accent/20 rounded-full blur-[120px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
