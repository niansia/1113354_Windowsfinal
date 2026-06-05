import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../i18n/strings';
import { useSpeech } from './useSpeech';
import {
  VoiceSession,
  checkVoiceServer,
  type VoiceDiagnostics,
  type VoiceServerInfo
} from '../assistant/voiceClient';
import { matchWakePhrase } from '../assistant/wakeWords';

export type VoiceEngine = 'server' | 'webspeech' | 'none';

const EMPTY_INFO: VoiceServerInfo = {
  ok: false,
  gemma: false,
  gemmaLoading: false,
  gemmaError: '',
  hfAuthenticated: false,
  modelId: '',
  sttEngine: 'Vosk',
  vadEngine: 'WebRTC VAD',
  wsPort: 8771,
  host: 'localhost',
  audio: {
    activeSessions: 0,
    totalPackets: 0,
    totalBytes: 0,
    deviceLabel: '',
    deviceId: '',
    clientSampleRate: 0,
    rmsDbfs: -120,
    peakDbfs: -120,
    speechActive: false,
    lastPacketAt: '',
    lastText: '',
    lastError: ''
  }
};

const EMPTY_DIAGNOSTICS: VoiceDiagnostics = {
  deviceLabel: '',
  deviceId: '',
  rmsDbfs: -120,
  peakDbfs: -120,
  signal: 'silent',
  speechActive: false,
  packets: 0,
  updatedAt: 0
};

export function useVoice(lang: Lang, serverUrl: string) {
  const speech = useSpeech(lang);
  const {
    sttSupported,
    ttsSupported,
    listening: webListening,
    interim: webInterim,
    speaking,
    startCommand: startWebCommand,
    stopListening: stopWebListening,
    startWake: startWebWake,
    stopWake: stopWebWake,
    speak,
    cancelSpeak
  } = speech;

  const [serverInfo, setServerInfo] = useState<VoiceServerInfo>(EMPTY_INFO);
  const [serverListening, setServerListening] = useState(false);
  const [serverConnecting, setServerConnecting] = useState(false);
  const [wakeListening, setWakeListening] = useState(false);
  const [serverInterim, setServerInterim] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(EMPTY_DIAGNOSTICS);

  const serverInfoRef = useRef({ host: 'localhost', wsPort: 8771 });
  const sessionRef = useRef<VoiceSession | null>(null);
  const langRef = useRef<Lang>(lang);
  const wakeGenerationRef = useRef(0);
  langRef.current = lang;

  const engine: VoiceEngine = serverInfo.ok ? 'server' : sttSupported ? 'webspeech' : 'none';

  const applyInfo = useCallback((info: VoiceServerInfo) => {
    serverInfoRef.current = { host: info.host, wsPort: info.wsPort };
    setServerInfo(info);
    if (info.audio.deviceLabel) {
      setDiagnostics((current) => ({
        ...current,
        deviceLabel: info.audio.deviceLabel,
        deviceId: info.audio.deviceId,
        rmsDbfs: info.audio.rmsDbfs,
        peakDbfs: info.audio.peakDbfs,
        signal: info.audio.rmsDbfs < -75 ? 'silent' : info.audio.rmsDbfs < -42 ? 'audible' : 'speech',
        speechActive: info.audio.speechActive,
        packets: info.audio.totalPackets,
        updatedAt: info.audio.lastPacketAt ? Date.parse(info.audio.lastPacketAt) : current.updatedAt
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    const info = await checkVoiceServer(serverUrl);
    applyInfo(info);
    return info;
  }, [applyInfo, serverUrl]);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const probe = async () => {
      const info = await checkVoiceServer(serverUrl);
      if (!alive) return;
      applyInfo(info);
      timer = window.setTimeout(probe, info.ok ? 10000 : 1500);
    };
    void probe();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [applyInfo, serverUrl]);

  const stopServerSession = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setServerListening(false);
    setServerConnecting(false);
    setWakeListening(false);
    setServerInterim('');
  }, []);

  const stopListening = useCallback(() => {
    wakeGenerationRef.current += 1;
    stopServerSession();
    stopWebListening();
    stopWebWake();
  }, [stopServerSession, stopWebListening, stopWebWake]);

  const startCommand = useCallback(
    (onFinal: (text: string) => void) => {
      wakeGenerationRef.current += 1;
      stopServerSession();
      stopWebWake();
      setVoiceError('');

      if (engine === 'server') {
        setServerConnecting(true);
        setServerListening(false);
        const { host, wsPort } = serverInfoRef.current;
        const session = new VoiceSession(host, wsPort, langRef.current, {
          onOpen: () => {
            setServerConnecting(false);
            setServerListening(true);
          },
          onPartial: (text) => setServerInterim(text),
          onDiagnostics: setDiagnostics,
          onFinal: (text) => {
            stopServerSession();
            if (text.trim()) onFinal(text.trim());
          },
          onError: (message) => {
            setVoiceError(message);
            stopServerSession();
          },
          onClose: () => {
            setVoiceError((current) => current || 'ws: connection closed');
            stopServerSession();
          }
        });
        sessionRef.current = session;
        void session.start();
      } else if (engine === 'webspeech') {
        startWebCommand(onFinal);
      }
    },
    [engine, startWebCommand, stopServerSession, stopWebWake]
  );

  const startWake = useCallback(
    (onWake: (command: string) => void) => {
      const generation = wakeGenerationRef.current + 1;
      wakeGenerationRef.current = generation;
      stopServerSession();
      stopWebListening();
      setVoiceError('');
      setWakeListening(true);

      if (engine === 'server') {
        const connect = () => {
          if (wakeGenerationRef.current !== generation) return;
          setServerConnecting(true);
          let retryScheduled = false;
          const retry = (message?: string) => {
            if (retryScheduled || wakeGenerationRef.current !== generation) return;
            retryScheduled = true;
            if (message) setVoiceError(message);
            sessionRef.current?.stop();
            sessionRef.current = null;
            setServerConnecting(false);
            setWakeListening(false);
            const delay = message?.startsWith('mic:') ? 15000 : 5000;
            window.setTimeout(() => {
              if (wakeGenerationRef.current === generation) {
                setWakeListening(true);
                connect();
              }
            }, delay);
          };

          const { host, wsPort } = serverInfoRef.current;
          const session = new VoiceSession(host, wsPort, langRef.current, {
            onOpen: () => {
              setServerConnecting(false);
              setWakeListening(true);
              setVoiceError('');
            },
            onDiagnostics: setDiagnostics,
            onFinal: (text) => {
              const wake = matchWakePhrase(text);
              if (!wake.matched) return;
              wakeGenerationRef.current += 1;
              stopServerSession();
              onWake(wake.command);
            },
            onError: retry,
            onClose: () => retry()
          });
          sessionRef.current = session;
          void session.start();
        };
        connect();
      } else if (engine === 'webspeech') {
        startWebWake((command) => {
          setWakeListening(false);
          onWake(command);
        });
      } else {
        setWakeListening(false);
      }
    },
    [engine, startWebWake, stopServerSession, stopWebListening]
  );

  const stopWake = useCallback(() => {
    wakeGenerationRef.current += 1;
    stopServerSession();
    stopWebWake();
    setWakeListening(false);
  }, [stopServerSession, stopWebWake]);

  useEffect(() => () => {
    wakeGenerationRef.current += 1;
    sessionRef.current?.stop();
  }, []);

  return {
    engine,
    serverReady: serverInfo.ok,
    gemmaReady: serverInfo.gemma,
    gemmaLoading: serverInfo.gemmaLoading,
    gemmaError: serverInfo.gemmaError,
    hfAuthenticated: serverInfo.hfAuthenticated,
    modelId: serverInfo.modelId,
    sttEngine: serverInfo.sttEngine,
    vadEngine: serverInfo.vadEngine,
    serverAudio: serverInfo.audio,
    diagnostics,
    voiceError,
    wakeListening,
    refresh,
    sttAvailable: engine !== 'none',
    connecting: engine === 'server' && serverConnecting,
    listening: engine === 'server' ? serverListening : webListening,
    interim: engine === 'server' ? serverInterim : webInterim,
    speaking,
    ttsSupported,
    startCommand,
    stopListening,
    startWake,
    stopWake,
    speak,
    cancelSpeak
  };
}
