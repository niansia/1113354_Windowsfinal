import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FusionSettingsState } from '../hooks/useFusionSettings';
import { DEFAULT_DESKTOP_PETS } from '../pets/defaultDesktopPets';
import {
  clampDesktopPetPosition,
  mergeDesktopPetLibrary,
  type DesktopPetAsset,
  type DesktopPetPosition
} from '../pets/desktopPetRegistry';
import { useI18n } from '../i18n/I18nContext';
import { DESKTOP_PET_TEXT } from '../settings/settingsText';

interface DesktopPetProps {
  settings: FusionSettingsState;
  onChange: <K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => void;
}

type PetMotion = 'idle' | 'waving' | 'running-right' | 'running-left';

const CELL_W = 192;
const CELL_H = 208;
const ATLAS_W = 1536;
const ATLAS_H = 1872;

const MOTIONS: Record<PetMotion, { row: number; frames: number; duration: number }> = {
  idle: { row: 0, frames: 6, duration: 1.25 },
  'running-right': { row: 1, frames: 8, duration: 0.72 },
  'running-left': { row: 2, frames: 8, duration: 0.72 },
  waving: { row: 3, frames: 4, duration: 0.82 }
};

function resolveInitialPosition(): DesktopPetPosition {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: Math.max(24, window.innerWidth - 188),
    y: Math.max(24, window.innerHeight - 252)
  };
}

function selectedPet(settings: FusionSettingsState): DesktopPetAsset {
  const library = mergeDesktopPetLibrary(DEFAULT_DESKTOP_PETS, settings.desktopPetCustoms);
  return library.find((pet) => pet.id === settings.desktopPetSelectedId) ?? library[0];
}

export const DesktopPet: React.FC<DesktopPetProps> = ({ settings, onChange }) => {
  const { tf } = useI18n();
  const pet = useMemo(() => selectedPet(settings), [settings]);
  const [position, setPosition] = useState<DesktopPetPosition>(() => {
    if (settings.desktopPetPosition.x >= 0 && settings.desktopPetPosition.y >= 0) {
      return settings.desktopPetPosition;
    }
    return resolveInitialPosition();
  });
  const [motion, setMotion] = useState<PetMotion>('idle');
  const positionRef = useRef(position);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const waveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (settings.desktopPetPosition.x >= 0 && settings.desktopPetPosition.y >= 0) {
      setPosition(settings.desktopPetPosition);
      return;
    }
    setPosition(resolveInitialPosition());
  }, [settings.desktopPetPosition.x, settings.desktopPetPosition.y]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => clampDesktopPetPosition(current, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (waveTimerRef.current !== null) window.clearTimeout(waveTimerRef.current);
    };
  }, []);

  if (!settings.desktopPetEnabled) return null;

  const animation = MOTIONS[motion];
  const scale = settings.desktopPetScale / 100;
  const spriteStyle = {
    backgroundImage: `url("${pet.spritesheetUrl}")`,
    ['--pet-row-y' as string]: `${-animation.row * CELL_H}px`,
    ['--pet-end-x' as string]: `${-animation.frames * CELL_W}px`,
    ['--pet-frames' as string]: animation.frames,
    ['--pet-duration' as string]: `${animation.duration}s`,
    ['--pet-scale' as string]: scale,
    ['--pet-atlas-w' as string]: `${ATLAS_W}px`,
    ['--pet-atlas-h' as string]: `${ATLAS_H}px`
  } as React.CSSProperties;

  const triggerWave = () => {
    setMotion('waving');
    if (waveTimerRef.current !== null) window.clearTimeout(waveTimerRef.current);
    waveTimerRef.current = window.setTimeout(() => setMotion('idle'), 1700);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;

    setMotion(dx < 0 ? 'running-left' : 'running-right');
    const nextPosition = clampDesktopPetPosition(
      {
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY
      },
      window.innerWidth,
      window.innerHeight
    );
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      setMotion('idle');
      onChange('desktopPetPosition', positionRef.current);
      return;
    }
    triggerWave();
  };

  return (
    <button
      type="button"
      className="fusion-desktop-pet"
      style={{ left: position.x, top: position.y, ['--pet-scale' as string]: scale } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={tf(DESKTOP_PET_TEXT.desktopPetAria, pet.displayName)}
      title={pet.displayName}
    >
      <span className="fusion-desktop-pet-sprite" style={spriteStyle} />
    </button>
  );
};
