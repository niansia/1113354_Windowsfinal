import type { Lang } from '../i18n/strings';
import {
  choosePreferredMicrophone,
  classifyMicrophoneSignal,
  type MicrophoneSignal
} from './microphoneSelection';

export interface VoiceServerAudioInfo {
  activeSessions: number;
  totalPackets: number;
  totalBytes: number;
  deviceLabel: string;
  deviceId: string;
  clientSampleRate: number;
  rmsDbfs: number;
  peakDbfs: number;
  speechActive: boolean;
  lastPacketAt: string;
  lastText: string;
  lastError: string;
}

export interface VoiceServerInfo {
  ok: boolean;
  gemma: boolean;
  gemmaLoading: boolean;
  gemmaError: string;
  hfAuthenticated: boolean;
  modelId: string;
  sttEngine: string;
  vadEngine: string;
  wsPort: number;
  host: string;
  audio: VoiceServerAudioInfo;
}

export interface VoiceDiagnostics {
  deviceLabel: string;
  deviceId: string;
  rmsDbfs: number;
  peakDbfs: number;
  signal: MicrophoneSignal;
  speechActive: boolean;
  packets: number;
  updatedAt: number;
}

const EMPTY_AUDIO: VoiceServerAudioInfo = {
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
};

const parseHost = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).hostname || 'localhost';
  } catch {
    return 'localhost';
  }
};

const numberOr = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function parseAudioInfo(data: any): VoiceServerAudioInfo {
  const audio = data?.audio ?? {};
  return {
    activeSessions: numberOr(audio.active_sessions, 0),
    totalPackets: numberOr(audio.total_packets, 0),
    totalBytes: numberOr(audio.total_bytes, 0),
    deviceLabel: String(audio.device_label ?? ''),
    deviceId: String(audio.device_id ?? ''),
    clientSampleRate: numberOr(audio.client_sample_rate, 0),
    rmsDbfs: numberOr(audio.rms_dbfs, -120),
    peakDbfs: numberOr(audio.peak_dbfs, -120),
    speechActive: Boolean(audio.speech_active),
    lastPacketAt: String(audio.last_packet_at ?? ''),
    lastText: String(audio.last_text ?? ''),
    lastError: String(audio.last_error ?? '')
  };
}

export async function checkVoiceServer(serverUrl: string): Promise<VoiceServerInfo> {
  const host = parseHost(serverUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1300);
  try {
    const res = await fetch(`${serverUrl.replace(/\/$/, '')}/health`, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ok: Boolean(data?.ok),
      gemma: Boolean(data?.gemma),
      gemmaLoading: Boolean(data?.gemma_loading),
      gemmaError: String(data?.gemma_error ?? ''),
      hfAuthenticated: Boolean(data?.hf_authenticated),
      modelId: String(data?.gemma_model ?? ''),
      sttEngine: String(data?.stt_engine ?? 'Vosk'),
      vadEngine: String(data?.vad_engine ?? 'WebRTC VAD'),
      wsPort: Number(data?.ws_port) || 8771,
      host,
      audio: parseAudioInfo(data)
    };
  } catch {
    return {
      ok: false,
      gemma: false,
      gemmaLoading: false,
      gemmaError: '',
      hfAuthenticated: false,
      modelId: '',
      sttEngine: 'Vosk',
      vadEngine: 'WebRTC VAD',
      wsPort: 8771,
      host,
      audio: { ...EMPTY_AUDIO }
    };
  } finally {
    clearTimeout(timer);
  }
}

interface VoiceSessionCallbacks {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onDiagnostics?: (diagnostics: VoiceDiagnostics) => void;
}

const audioConstraints = (deviceId?: string): MediaTrackConstraints => ({
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  channelCount: 1,
  sampleRate: 16000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
});

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return out.buffer;
}

function downsampleTo16k(input: Float32Array, inRate: number): Float32Array {
  if (inRate === 16000) return input;
  const ratio = inRate / 16000;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) out[i] = input[Math.floor(i * ratio)];
  return out;
}

function floatDbfs(input: Float32Array): { rms: number; peak: number } {
  if (!input.length) return { rms: -120, peak: -120 };
  let sumSquares = 0;
  let peak = 0;
  for (const sample of input) {
    const amplitude = Math.abs(sample);
    sumSquares += sample * sample;
    if (amplitude > peak) peak = amplitude;
  }
  const rms = Math.sqrt(sumSquares / input.length);
  const toDbfs = (value: number) => (value > 0 ? Math.max(-120, 20 * Math.log10(value)) : -120);
  return { rms: Number(toDbfs(rms).toFixed(1)), peak: Number(toDbfs(peak).toFixed(1)) };
}

export class VoiceSession {
  private host: string;
  private wsPort: number;
  private lang: Lang;
  private cb: VoiceSessionCallbacks;
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stopped = false;
  private packetCount = 0;
  private lastDiagnosticsAt = 0;
  private diagnostics: VoiceDiagnostics = {
    deviceLabel: '',
    deviceId: '',
    rmsDbfs: -120,
    peakDbfs: -120,
    signal: 'silent',
    speechActive: false,
    packets: 0,
    updatedAt: 0
  };

  constructor(host: string, wsPort: number, lang: Lang, cb: VoiceSessionCallbacks) {
    this.host = host;
    this.wsPort = wsPort;
    this.lang = lang;
    this.cb = cb;
  }

  async start(): Promise<void> {
    try {
      this.stream = await this.openPreferredMicrophone();
    } catch (err) {
      this.cb.onError?.(`mic: ${(err as Error)?.message ?? 'denied'}`);
      return;
    }
    if (this.stopped) {
      this.cleanup();
      return;
    }

    const track = this.stream.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    this.diagnostics = {
      ...this.diagnostics,
      deviceLabel: track?.label || '',
      deviceId: String(settings.deviceId ?? ''),
      updatedAt: Date.now()
    };
    this.cb.onDiagnostics?.(this.diagnostics);

    const wsUrl = `ws://${this.host}:${this.wsPort}/stt?lang=${encodeURIComponent(this.lang)}`;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';
    } catch (err) {
      this.cb.onError?.(`ws: ${(err as Error)?.message ?? 'failed'}`);
      this.cleanup();
      return;
    }

    this.ws.onopen = () => {
      if (this.stopped || !this.ws) return;
      this.ws.send(JSON.stringify({
        action: 'session_info',
        device_label: this.diagnostics.deviceLabel,
        device_id: this.diagnostics.deviceId,
        sample_rate: Number(settings.sampleRate) || 16000,
        channel_count: Number(settings.channelCount) || 1
      }));
      this.cb.onOpen?.();
      this.startAudio();
    };
    this.ws.onmessage = (event) => {
      let data: {
        event?: string;
        partial?: string;
        text?: string;
        error?: string;
        rms_dbfs?: number;
        peak_dbfs?: number;
        speech?: boolean;
        packets?: number;
      };
      try {
        data = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      if (data.event === 'audio_level') {
        this.emitDiagnostics({
          rmsDbfs: numberOr(data.rms_dbfs, this.diagnostics.rmsDbfs),
          peakDbfs: numberOr(data.peak_dbfs, this.diagnostics.peakDbfs),
          speechActive: Boolean(data.speech),
          packets: numberOr(data.packets, this.diagnostics.packets)
        }, true);
      } else if (data.event === 'speech_start') {
        this.emitDiagnostics({ speechActive: true }, true);
      } else if (data.event === 'speech_end') {
        this.emitDiagnostics({ speechActive: false }, true);
      }
      if (data.error) this.cb.onError?.(data.error);
      if (typeof data.partial === 'string' && data.partial) this.cb.onPartial?.(data.partial);
      if (typeof data.text === 'string' && data.text) this.cb.onFinal?.(data.text);
    };
    this.ws.onerror = () => this.cb.onError?.('ws: connection error');
    this.ws.onclose = () => {
      if (!this.stopped) {
        this.cleanup();
        this.cb.onClose?.();
      }
    };
  }

  private async openPreferredMicrophone(): Promise<MediaStream> {
    const initial = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints(),
      video: false
    });

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const preferred = choosePreferredMicrophone(devices);
      const currentId = initial.getAudioTracks()[0]?.getSettings?.().deviceId;
      if (!preferred?.deviceId || preferred.deviceId === currentId || preferred.deviceId === 'default') return initial;

      const selected = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(preferred.deviceId),
        video: false
      });
      initial.getTracks().forEach((track) => track.stop());
      return selected;
    } catch {
      return initial;
    }
  }

  private emitDiagnostics(
    next: Partial<Pick<VoiceDiagnostics, 'rmsDbfs' | 'peakDbfs' | 'speechActive' | 'packets'>>,
    force = false
  ) {
    const now = Date.now();
    this.diagnostics = {
      ...this.diagnostics,
      ...next,
      signal: classifyMicrophoneSignal(next.rmsDbfs ?? this.diagnostics.rmsDbfs),
      updatedAt: now
    };
    if (force || now - this.lastDiagnosticsAt >= 180) {
      this.lastDiagnosticsAt = now;
      this.cb.onDiagnostics?.(this.diagnostics);
    }
  }

  private startAudio() {
    if (!this.stream) return;
    const AudioCtor: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtor({ sampleRate: 16000 });
    if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
    const rate = this.audioCtx.sampleRate;
    this.processor.onaudioprocess = (event) => {
      if (this.stopped || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const channel = event.inputBuffer.getChannelData(0);
      const resampled = downsampleTo16k(channel, rate);
      this.packetCount += 1;
      const level = floatDbfs(resampled);
      this.emitDiagnostics({
        rmsDbfs: level.rms,
        peakDbfs: level.peak,
        packets: this.packetCount
      });
      this.ws.send(floatTo16BitPCM(resampled));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  flush() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ action: 'eof' }));
      } catch {
        // The socket is already closing.
      }
    }
  }

  stop() {
    this.stopped = true;
    this.cleanup();
  }

  private cleanup() {
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch {
      // Audio nodes may already be disconnected.
    }
    try {
      if (this.audioCtx && this.audioCtx.state !== 'closed') void this.audioCtx.close();
    } catch {
      // The audio context may already be closed.
    }
    try {
      this.stream?.getTracks().forEach((track) => track.stop());
    } catch {
      // The device may have disappeared.
    }
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) this.ws.close();
    } catch {
      // The socket may already be closed.
    }
    this.processor = null;
    this.source = null;
    this.audioCtx = null;
    this.stream = null;
    this.ws = null;
  }
}
