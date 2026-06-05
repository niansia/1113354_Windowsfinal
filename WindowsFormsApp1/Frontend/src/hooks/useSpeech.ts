import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../i18n/strings';
import { localeForLanguage } from '../i18n/localeFormatting';
import { matchWakePhrase } from '../assistant/wakeWords';

// Thin wrapper over the Web Speech API: speech-to-text (SpeechRecognition) and
// text-to-speech (speechSynthesis). Both are feature-detected and fully optional — when
// unavailable (older WebView, no mic) the assistant just falls back to text input and
// silent replies, so nothing breaks. The Speech API types aren't in lib.dom, so we keep a
// minimal local surface and read events loosely.

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: ((ev: any) => void) | null;
  onstart: ((ev: any) => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

const getSR = (): SRConstructor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SRConstructor | undefined;

function readTranscript(ev: any): { text: string; final: boolean } {
  let text = '';
  let final = false;
  const results = ev?.results;
  if (!results) return { text, final };
  for (let i = ev.resultIndex ?? 0; i < results.length; i += 1) {
    const result = results[i];
    if (!result) continue;
    text += result[0]?.transcript ?? '';
    if (result.isFinal) final = true;
  }
  return { text: text.trim(), final };
}

export function useSpeech(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speaking, setSpeaking] = useState(false);

  const sttSupported = Boolean(getSR());
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const modeRef = useRef<'idle' | 'command' | 'wake'>('idle');
  const langRef = useRef<Lang>(lang);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const onWakeRef = useRef<((command: string) => void) | null>(null);
  const finalTextRef = useRef('');

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const teardown = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    modeRef.current = 'idle';
    teardown();
    setListening(false);
    setInterim('');
  }, [teardown]);

  const startCommand = useCallback(
    (onFinal: (text: string) => void) => {
      const SR = getSR();
      if (!SR) return;
      teardown();
      modeRef.current = 'command';
      onFinalRef.current = onFinal;
      finalTextRef.current = '';

      const rec = new SR();
      rec.lang = localeForLanguage(langRef.current);
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => setListening(true);
      rec.onresult = (ev: any) => {
        const { text, final } = readTranscript(ev);
        setInterim(text);
        if (final && text) finalTextRef.current = text;
      };
      rec.onerror = () => {
        setListening(false);
        setInterim('');
        modeRef.current = 'idle';
      };
      rec.onend = () => {
        setListening(false);
        const text = finalTextRef.current.trim();
        setInterim('');
        modeRef.current = 'idle';
        recRef.current = null;
        if (text && onFinalRef.current) onFinalRef.current(text);
      };
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        /* start() throws if called twice in a row — ignore */
      }
    },
    [teardown]
  );

  const startWake = useCallback(
    (onWake: (command: string) => void) => {
      const SR = getSR();
      if (!SR) return;
      teardown();
      modeRef.current = 'wake';
      onWakeRef.current = onWake;

      const rec = new SR();
      rec.lang = localeForLanguage(langRef.current);
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (ev: any) => {
        const { text, final } = readTranscript(ev);
        if (!final) return;
        const wake = matchWakePhrase(text);
        if (wake.matched) {
          modeRef.current = 'idle';
          teardown();
          setListening(false);
          onWakeRef.current?.(wake.command);
        }
      };
      rec.onerror = () => {
        /* keep mode; onend will try to restart */
      };
      rec.onend = () => {
        // Continuous recognition still ends on silence — restart while wake mode holds.
        if (modeRef.current === 'wake') {
          try {
            rec.start();
          } catch {
            /* will be recreated by the next effect run */
          }
        }
      };
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        /* ignore */
      }
    },
    [teardown]
  );

  const stopWake = useCallback(() => {
    if (modeRef.current === 'wake') stopListening();
  }, [stopListening]);

  const cancelSpeak = useCallback(() => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const locale = localeForLanguage(langRef.current);
        utterance.lang = locale;
        const voices = window.speechSynthesis.getVoices();
        const prefix = locale.split('-')[0];
        const voice =
          voices.find((v) => v.lang === locale) ||
          voices.find((v) => v.lang.replace('_', '-') === locale) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
        if (voice) utterance.voice = voice;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    },
    [ttsSupported]
  );

  useEffect(() => () => {
    teardown();
    if (ttsSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }, [teardown, ttsSupported]);

  return {
    sttSupported,
    ttsSupported,
    listening,
    interim,
    speaking,
    startCommand,
    stopListening,
    startWake,
    stopWake,
    speak,
    cancelSpeak
  };
}
