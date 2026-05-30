import { GestureData } from '../hooks/useHandGesture';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppConfig, APPS_CONFIG } from '../types';
import { AppCard } from './AppCard';
import { launchApp } from '../utils/bridge';

interface GestureAppCarouselProps {
  onIndexChange?: (index: number) => void;
  gestureData?: GestureData;
}

export const GestureAppCarousel: React.FC<GestureAppCarouselProps> = ({ 
  onIndexChange,
  gestureData
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isAnimatingRef = useRef(false);
  const lastActivateId = useRef(0);
  const lastActivateTime = useRef(0);

  const handleNext = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    setCurrentIndex(prev => {
      if (prev >= APPS_CONFIG.length - 1) return prev;
      
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 450); // Match or slightly exceed animation duration
      
      return prev + 1;
    });
  }, []);

  const handlePrev = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    setCurrentIndex(prev => {
      if (prev <= 0) return prev;
      
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 450);
      
      return prev - 1;
    });
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Handle Discrete Gesture Swipes via swipeId
  useEffect(() => {
    if (!gestureData || gestureData.swipeId === 0) return;
    if (isAnimatingRef.current) return;
    
    console.log('[GestureCarousel] swipe event', {
      id: gestureData.swipeId,
      dir: gestureData.swipeDirection,
      type: gestureData.gestureType,
      vx: gestureData.swipeVelocity
    });

    if (gestureData.swipeDirection === 'left') {
      handleNext();
    } else if (gestureData.swipeDirection === 'right') {
      handlePrev();
    }
  }, [gestureData?.swipeId]); 

  // Handle Activation via activateId
  useEffect(() => {
    if (!gestureData || gestureData.activateId === 0) return;
    if (gestureData.activateId === lastActivateId.current) return;
    
    const now = Date.now();
    if (now - lastActivateTime.current < 1000) return; // Cooldown

    lastActivateId.current = gestureData.activateId;
    lastActivateTime.current = now;

    console.log('[GestureCarousel] activate event', {
      id: gestureData.activateId,
      type: gestureData.activateType,
      activeIndex: currentIndex
    });

    // Only activate if not animating
    if (!isAnimatingRef.current) {
      const activeApp = APPS_CONFIG[currentIndex];
      if (activeApp) {
        launchApp(activeApp.id);
      }
    }
  }, [gestureData?.activateId, currentIndex]);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  const onDragEnd = (event: any, info: any) => {
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
        onDrag={(e, info) => setDragOffset(info.offset.x)}
        onDragEnd={onDragEnd}
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence initial={false}>
          {APPS_CONFIG.map((app, index) => {
            // Apply gesture delta. Sensitivity 600 in carousel divisor
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
