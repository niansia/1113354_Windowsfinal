import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, WandSparkles, X } from 'lucide-react';
import type { AppId } from '../types';
import type { FusionSettingsState } from '../hooks/useFusionSettings';
import { WALLPAPERS } from '../hooks/useFusionSettings';
import { FUSION_APPS, getAppById } from '../data/fusionApps';
import { useI18n } from '../i18n/I18nContext';
import { LANG_LABELS, type Lang } from '../i18n/strings';
import { formatFusionDate, formatFusionTime } from '../i18n/localeFormatting';
import { useVoice } from '../hooks/useVoice';
import { parseIntent, type ParsedIntent } from '../assistant/nlu';
import { ASSISTANT_TEXT } from '../assistant/assistantText';
import { fetchWeather } from '../assistant/weather';
import { understand } from '../assistant/brain';

interface FusionAssistantProps {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimmed?: boolean;
  settings: FusionSettingsState;
  onChange: <K extends keyof FusionSettingsState>(key: K, value: FusionSettingsState[K]) => void;
  onLaunchAppId: (id: AppId) => boolean;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  ASSISTANT_TEXT.chipTime,
  ASSISTANT_TEXT.chipWeather,
  ASSISTANT_TEXT.chipSettings,
  ASSISTANT_TEXT.chipDark,
  ASSISTANT_TEXT.chipApps,
  ASSISTANT_TEXT.chipHelp
];

// Strip emoji / pictographs so the spoken (TTS) version stays clean.
const stripForSpeech = (text: string) => text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}️]/gu, '').trim();

export const FusionAssistant: React.FC<FusionAssistantProps> = ({
  enabled,
  open,
  onOpenChange,
  dimmed,
  settings,
  onChange,
  onLaunchAppId
}) => {
  const { t, tf, lang } = useI18n();
  const voice = useVoice(lang, settings.assistantServerUrl);
  const {
    engine,
    serverReady,
    gemmaReady,
    gemmaLoading,
    modelId,
    sttEngine,
    vadEngine,
    voiceError,
    wakeListening,
    connecting,
    diagnostics,
    refresh,
    sttAvailable,
    ttsSupported,
    listening,
    interim,
    speaking,
    startCommand,
    stopListening,
    startWake,
    stopWake,
    speak
  } = voice;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);

  const idRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>([]);
  const settingsRef = useRef(settings);
  const openRef = useRef(open);
  const aiWarnedRef = useRef(false);
  const pendingWakeCommandRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  settingsRef.current = settings;
  messagesRef.current = messages;
  openRef.current = open;

  const micAllowed = settings.microphone;
  const canVoiceInput = sttAvailable && micAllowed;

  const pushMessage = useCallback((role: ChatMessage['role'], text: string) => {
    idRef.current += 1;
    setMessages((prev) => [...prev, { id: idRef.current, role, text }]);
  }, []);

  const speakReply = useCallback(
    (text: string) => {
      if (settingsRef.current.assistantVoice && ttsSupported) speak(stripForSpeech(text));
    },
    [speak, ttsSupported]
  );

  // ---- intent execution (side effects + a localized response string) ----
  const executeIntent = useCallback(
    async (parsed: ParsedIntent, raw: string): Promise<string> => {
      const s = settingsRef.current;
      const now = new Date();
      switch (parsed.kind) {
        case 'open_app': {
          if (!parsed.appId) return t(ASSISTANT_TEXT.notUnderstood);
          const app = getAppById(parsed.appId);
          if (!app) return tf(ASSISTANT_TEXT.appNotFound, parsed.appId);
          onLaunchAppId(app.id);
          window.setTimeout(() => onOpenChange(false), 700);
          return tf(ASSISTANT_TEXT.openingApp, t(app.title));
        }
        case 'time':
          return tf(ASSISTANT_TEXT.timeNow, formatFusionTime(now, lang, s.timezone, s.clock24));
        case 'date':
          return tf(ASSISTANT_TEXT.dateToday, formatFusionDate(now, lang, s.timezone));
        case 'weather': {
          const wx = await fetchWeather(parsed.query, lang, s.timezone);
          if (!wx.ok) return t(ASSISTANT_TEXT.weatherError);
          const condition = `${wx.emoji} ${t(wx.conditionKey)}`;
          return tf(ASSISTANT_TEXT.weatherResult, wx.city, wx.temperature, condition, wx.apparent, wx.humidity);
        }
        case 'search': {
          // Cap length and always funnel through a fixed, encoded search URL — never navigate
          // to a raw model- or user-supplied URL.
          const q = (parsed.query || raw).trim().slice(0, 200);
          let opened: Window | null = null;
          try {
            opened = window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener');
          } catch {
            opened = null;
          }
          if (!opened) onLaunchAppId('web');
          return q ? tf(ASSISTANT_TEXT.searching, q) : t(ASSISTANT_TEXT.openedWeb);
        }
        case 'setting':
          return applySetting(parsed, s);
        case 'help':
          return t(ASSISTANT_TEXT.help);
        case 'greeting':
          return t(ASSISTANT_TEXT.greetingReply);
        case 'thanks':
          return t(ASSISTANT_TEXT.thanksReply);
        case 'identity':
          return t(ASSISTANT_TEXT.identityReply);
        case 'joke':
          return t(ASSISTANT_TEXT.jokeReply);
        default:
          return t(ASSISTANT_TEXT.notUnderstood);
      }
    },
    // applySetting is defined below and is stable via closure over onChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, onLaunchAppId, onOpenChange, t, tf]
  );

  const applySetting = useCallback(
    (parsed: ParsedIntent, s: FusionSettingsState): string => {
      const resolveToggle = (current: boolean) =>
        parsed.setValue === 'on' ? true : parsed.setValue === 'off' ? false : !current;
      switch (parsed.setTarget) {
        case 'theme': {
          const dark = parsed.setValue !== 'light';
          onChange('colorMode', dark ? 'dark' : 'light');
          return t(dark ? ASSISTANT_TEXT.setDark : ASSISTANT_TEXT.setLight);
        }
        case 'night': {
          const next = resolveToggle(s.nightLight);
          onChange('nightLight', next);
          return t(next ? ASSISTANT_TEXT.setNightOn : ASSISTANT_TEXT.setNightOff);
        }
        case 'brightness': {
          const up = parsed.setValue === 'up';
          const next = up ? Math.min(100, s.brightness + 10) : Math.max(40, s.brightness - 10);
          onChange('brightness', next);
          return tf(up ? ASSISTANT_TEXT.setBrighter : ASSISTANT_TEXT.setDimmer, next);
        }
        case 'volume': {
          if (parsed.setValue === 'mute') {
            onChange('muted', true);
            return t(ASSISTANT_TEXT.setMute);
          }
          if (parsed.setValue === 'unmute') {
            onChange('muted', false);
            return t(ASSISTANT_TEXT.setUnmute);
          }
          let next = s.volume;
          if (typeof parsed.setValue === 'number') next = parsed.setValue;
          else if (parsed.setValue === 'up') next = Math.min(100, s.volume + 10);
          else if (parsed.setValue === 'down') next = Math.max(0, s.volume - 10);
          onChange('muted', false);
          onChange('volume', next);
          return tf(ASSISTANT_TEXT.setVolume, next);
        }
        case 'transparency': {
          const next = resolveToggle(s.transparency);
          onChange('transparency', next);
          return t(next ? ASSISTANT_TEXT.setTransparencyOn : ASSISTANT_TEXT.setTransparencyOff);
        }
        case 'animations': {
          const next = resolveToggle(s.animations);
          onChange('animations', next);
          return t(next ? ASSISTANT_TEXT.setAnimationsOn : ASSISTANT_TEXT.setAnimationsOff);
        }
        case 'contrast': {
          const next = resolveToggle(s.highContrast);
          onChange('highContrast', next);
          return t(next ? ASSISTANT_TEXT.setContrastOn : ASSISTANT_TEXT.setContrastOff);
        }
        case 'wallpaper': {
          const next = (s.wallpaper + 1) % WALLPAPERS.length;
          onChange('wallpaper', next);
          return t(ASSISTANT_TEXT.setWallpaper);
        }
        case 'language': {
          const target = (parsed.setValue as Lang) || 'zh-TW';
          onChange('language', target);
          return tf(ASSISTANT_TEXT.setLanguage, LANG_LABELS[target] ?? String(target));
        }
        default:
          return t(ASSISTANT_TEXT.notUnderstood);
      }
    },
    [onChange, t, tf]
  );

  // ---- main turn: AI (optional) → rule parser → execute → respond ----
  const handleUtterance = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      pushMessage('user', text);
      setBusy(true);
      try {
        let responseText: string | null = null;
        let parsed: ParsedIntent | null = null;
        const s = settingsRef.current;

        if (s.assistantUseAI) {
          const apps = FUSION_APPS.map((a) => ({ id: a.id, name: a.title }));
          const understanding = await understand({
            serverUrl: s.assistantServerUrl,
            ollamaModel: s.assistantModel,
            utterance: text,
            lang,
            apps
          });
          if (understanding) {
            if (understanding.parsed) parsed = understanding.parsed;
            else if (understanding.reply) responseText = understanding.reply;
          } else if (!aiWarnedRef.current) {
            aiWarnedRef.current = true;
            pushMessage('assistant', t(ASSISTANT_TEXT.aiFallback));
          }
        }

        if (responseText === null) {
          if (!parsed) parsed = parseIntent(text);
          responseText = await executeIntent(parsed, text);
        }

        pushMessage('assistant', responseText);
        speakReply(responseText);
      } finally {
        setBusy(false);
      }
    },
    [busy, executeIntent, lang, pushMessage, speakReply, t]
  );

  const handleRef = useRef(handleUtterance);
  handleRef.current = handleUtterance;

  const startListening = useCallback(() => {
    if (!canVoiceInput) return;
    startCommand((finalText) => handleRef.current(finalText));
  }, [canVoiceInput, startCommand]);

  const toggleMic = useCallback(() => {
    if (listening) {
      setVoicePaused(true);
      stopListening();
    } else {
      setVoicePaused(false);
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const submitInput = useCallback(() => {
    const value = input.trim();
    if (!value) return;
    setInput('');
    void handleUtterance(value);
  }, [handleUtterance, input]);

  // ---- summon: Alt+V hotkey ----
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey && (event.code === 'KeyV' || event.key === 'v' || event.key === 'V')) {
        event.preventDefault();
        onOpenChange(!openRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, onOpenChange]);

  // ---- wake word: continuous listen while idle (say "嗨 Fusion") ----
  useEffect(() => {
    if (!enabled || !settings.assistantWakeWord || !canVoiceInput) return;
    if (open || speaking || listening) return;
    startWake((command) => {
      pendingWakeCommandRef.current = command;
      onOpenChange(true);
      if (command) {
        window.setTimeout(() => {
          const pending = pendingWakeCommandRef.current;
          pendingWakeCommandRef.current = '';
          if (pending) void handleRef.current(pending);
        }, 90);
      }
    });
    return () => stopWake();
  }, [enabled, settings.assistantWakeWord, canVoiceInput, open, speaking, listening, startWake, stopWake, onOpenChange]);

  // ---- on open: re-check the voice service, greet once, focus ----
  useEffect(() => {
    if (!open) {
      setVoicePaused(false);
      pendingWakeCommandRef.current = '';
      stopListening();
      return;
    }
    void refresh();
    if (messagesRef.current.length === 0 && !pendingWakeCommandRef.current) {
      const greeting = t(ASSISTANT_TEXT.greeting);
      pushMessage('assistant', greeting);
      speakReply(greeting);
    }
    window.setTimeout(() => inputRef.current?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- voice-first: keep the next command ready without a microphone click ----
  useEffect(() => {
    if (!open || voicePaused || busy || speaking || listening || !canVoiceInput) return;
    if (pendingWakeCommandRef.current) return;
    const retryDelay = voiceError ? (voiceError.startsWith('mic:') ? 12000 : 4000) : 520;
    const timer = window.setTimeout(() => startListening(), retryDelay);
    return () => window.clearTimeout(timer);
  }, [open, voicePaused, busy, speaking, listening, canVoiceInput, messages.length, voiceError, startListening]);

  // ---- close on Escape while open ----
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onOpenChange]);

  // ---- if the feature is turned off while open, close it ----
  useEffect(() => {
    if (!enabled && open) onOpenChange(false);
  }, [enabled, open, onOpenChange]);

  // ---- keep the transcript scrolled to the latest message ----
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim, busy]);

  if (!enabled) return null;

  const accent = settings.accent;
  const reduceMotion = !settings.animations;
  const status = connecting
    ? t(ASSISTANT_TEXT.statusConnecting)
    : voiceError
      ? t(ASSISTANT_TEXT.statusRetrying)
    : listening
    ? t(ASSISTANT_TEXT.statusListening)
    : busy
      ? t(ASSISTANT_TEXT.statusThinking)
      : speaking
        ? t(ASSISTANT_TEXT.statusSpeaking)
        : gemmaLoading
          ? t(ASSISTANT_TEXT.statusModelLoading)
          : t(ASSISTANT_TEXT.statusIdle);

  const hint = !micAllowed
    ? t(ASSISTANT_TEXT.hintMicOff)
    : voiceError.startsWith('mic:')
      ? t(ASSISTANT_TEXT.hintMicError)
    : voiceError
      ? t(ASSISTANT_TEXT.hintVoiceError)
    : engine === 'none'
      ? t(ASSISTANT_TEXT.hintNoServer)
      : settings.assistantWakeWord
        ? t(ASSISTANT_TEXT.hintWake)
        : t(ASSISTANT_TEXT.hintText);
  const signalText = diagnostics.signal === 'speech'
    ? t(ASSISTANT_TEXT.signalSpeech)
    : diagnostics.signal === 'audible'
      ? t(ASSISTANT_TEXT.signalAudible)
      : t(ASSISTANT_TEXT.signalSilent);

  return (
    <>
      {!open && !dimmed && (
        <button
          type="button"
          className={`fusion-assistant-orb ${reduceMotion ? 'no-motion' : ''} ${wakeListening ? 'is-listening' : ''}`}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
          onClick={() => onOpenChange(true)}
          aria-label={t(ASSISTANT_TEXT.orbLabel)}
          title={`${t(ASSISTANT_TEXT.orbLabel)} · Alt+V`}
        >
          <span className="fusion-assistant-orb-core">
            <Sparkles size={22} strokeWidth={1.9} />
          </span>
          <span className="fusion-assistant-orb-ring" aria-hidden="true" />
          <span className="fusion-assistant-orb-ring two" aria-hidden="true" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.section
            className={`fusion-assistant-panel ${reduceMotion ? 'no-motion' : ''}`}
            style={{ ['--accent' as string]: accent } as React.CSSProperties}
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.97 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 320, damping: 30 }}
            role="dialog"
            aria-label={t(ASSISTANT_TEXT.title)}
          >
            <header className="fusion-assistant-head">
              <span className={`fusion-assistant-head-orb ${listening ? 'is-listening' : ''} ${speaking ? 'is-speaking' : ''}`}>
                <Sparkles size={18} strokeWidth={2} />
              </span>
              <div className="fusion-assistant-head-text">
                <strong>{t(ASSISTANT_TEXT.title)}</strong>
                <span>{t(ASSISTANT_TEXT.tagline)}</span>
              </div>
              {settings.assistantUseAI && (
                <span className="fusion-assistant-ai-badge" title="Ollama / Gemma">
                  <WandSparkles size={13} strokeWidth={2} /> AI
                </span>
              )}
              <button type="button" className="fusion-assistant-close" onClick={() => onOpenChange(false)} title={t(ASSISTANT_TEXT.close)}>
                <X size={18} />
              </button>
            </header>

            <div className="fusion-assistant-scroll" ref={scrollRef}>
              {messages.map((message) => (
                <div key={message.id} className={`fusion-assistant-msg ${message.role}`}>
                  {message.role === 'assistant' && (
                    <span className="fusion-assistant-msg-orb" aria-hidden="true">
                      <Sparkles size={13} strokeWidth={2} />
                    </span>
                  )}
                  <p>{message.text}</p>
                </div>
              ))}
              {listening && interim && (
                <div className="fusion-assistant-msg user interim">
                  <p>{interim}</p>
                </div>
              )}
              {busy && (
                <div className="fusion-assistant-msg assistant">
                  <span className="fusion-assistant-msg-orb" aria-hidden="true">
                    <Sparkles size={13} strokeWidth={2} />
                  </span>
                  <p className="fusion-assistant-typing">
                    <Loader2 size={15} className="spin" /> {t(ASSISTANT_TEXT.statusThinking)}
                  </p>
                </div>
              )}
            </div>

            <div className="fusion-assistant-chips">
              {SUGGESTIONS.map((chip) => (
                <button key={chip} type="button" className="fusion-assistant-chip" onClick={() => void handleUtterance(t(chip))} disabled={busy}>
                  {t(chip)}
                </button>
              ))}
            </div>

            <div className="fusion-assistant-statusline">
              <span className={`fusion-assistant-status-dot ${listening ? 'listening' : busy ? 'thinking' : speaking ? 'speaking' : ''}`} />
              <span>{status}</span>
              {serverReady && (
                <span className="fusion-assistant-engine-pill" title={`${t(ASSISTANT_TEXT.voiceReady)} · ${vadEngine}`}>
                  <Sparkles size={11} strokeWidth={2.4} /> {sttEngine.startsWith('Faster-Whisper') ? 'Whisper' : sttEngine}
                </span>
              )}
              {diagnostics.deviceLabel && (
                <span
                  className={`fusion-assistant-level-pill ${diagnostics.signal}`}
                  title={`${diagnostics.deviceLabel} · ${signalText}`}
                >
                  {diagnostics.rmsDbfs.toFixed(0)} dB
                </span>
              )}
              {gemmaReady && (
                <span className="fusion-assistant-engine-pill ai" title={`${t(ASSISTANT_TEXT.aiReady)} · ${modelId}`}>
                  <WandSparkles size={11} strokeWidth={2.4} /> Gemma 4
                </span>
              )}
              {ttsSupported && (
                <button
                  type="button"
                  className="fusion-assistant-voice-toggle"
                  onClick={() => onChange('assistantVoice', !settings.assistantVoice)}
                  title={t(ASSISTANT_TEXT.settingVoice)}
                >
                  {settings.assistantVoice ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
              )}
            </div>

            <div className="fusion-assistant-inputbar">
              <button
                type="button"
                className={`fusion-assistant-mic ${listening ? 'is-listening' : ''}`}
                onClick={toggleMic}
                disabled={!canVoiceInput}
                title={listening ? t(ASSISTANT_TEXT.micStop) : t(ASSISTANT_TEXT.micStart)}
              >
                {canVoiceInput ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <input
                ref={inputRef}
                type="text"
                className="fusion-assistant-input"
                value={input}
                placeholder={t(ASSISTANT_TEXT.inputPlaceholder)}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitInput();
                  }
                }}
              />
              <button type="button" className="fusion-assistant-send" onClick={submitInput} disabled={!input.trim() || busy} title={t(ASSISTANT_TEXT.send)}>
                <Send size={18} />
              </button>
            </div>

            <p className="fusion-assistant-hint">{hint}</p>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
};
