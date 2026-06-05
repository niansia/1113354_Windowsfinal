export interface AudioInputDevice {
  deviceId: string;
  kind: string;
  label: string;
}

export type MicrophoneSignal = 'silent' | 'audible' | 'speech';

const VIRTUAL_DEVICE_MARKERS = [
  'virtual',
  'voice changer',
  'hitpaw',
  'vb-audio',
  'voicemeeter',
  'cable input',
  'cable output',
  'magicmic'
];

const PHYSICAL_DEVICE_MARKERS = [
  'realtek',
  'microphone array',
  'mic array',
  '麥克風排列',
  '麦克风阵列',
  'usb microphone',
  'usb mic',
  'headset',
  'webcam'
];

function microphoneScore(device: AudioInputDevice): number {
  const label = device.label.trim().toLocaleLowerCase();
  let score = label ? 10 : 0;

  if (VIRTUAL_DEVICE_MARKERS.some((marker) => label.includes(marker))) score -= 100;
  if (PHYSICAL_DEVICE_MARKERS.some((marker) => label.includes(marker))) score += 60;
  if (device.deviceId === 'default') score -= 5;

  return score;
}

export function choosePreferredMicrophone(devices: AudioInputDevice[]): AudioInputDevice | undefined {
  return devices
    .filter((device) => device.kind === 'audioinput')
    .map((device, index) => ({ device, index, score: microphoneScore(device) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.device;
}

export function classifyMicrophoneSignal(dbfs: number): MicrophoneSignal {
  if (!Number.isFinite(dbfs) || dbfs < -75) return 'silent';
  if (dbfs < -42) return 'audible';
  return 'speech';
}
