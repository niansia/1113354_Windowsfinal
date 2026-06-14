"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.choosePreferredMicrophone = choosePreferredMicrophone;
exports.classifyMicrophoneSignal = classifyMicrophoneSignal;
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
function microphoneScore(device) {
    const label = device.label.trim().toLocaleLowerCase();
    let score = label ? 10 : 0;
    if (VIRTUAL_DEVICE_MARKERS.some((marker) => label.includes(marker)))
        score -= 100;
    if (PHYSICAL_DEVICE_MARKERS.some((marker) => label.includes(marker)))
        score += 60;
    if (device.deviceId === 'default')
        score -= 5;
    return score;
}
function choosePreferredMicrophone(devices) {
    return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({ device, index, score: microphoneScore(device) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.device;
}
function classifyMicrophoneSignal(dbfs) {
    if (!Number.isFinite(dbfs) || dbfs < -75)
        return 'silent';
    if (dbfs < -42)
        return 'audible';
    return 'speech';
}
