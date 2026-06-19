"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProcessorTrace = exports.estimateChannel = exports.buildSignalFrame = void 0;
const MEDIUMS = {
    fiber: { label: '光纖鏈路', speedMps: 2.04e8, attenuationDbPerKm: 0.28, baseMarginDb: 30 },
    copper: { label: '銅線鏈路', speedMps: 1.95e8, attenuationDbPerKm: 3.2, baseMarginDb: 24 },
    wireless: { label: '無線鏈路', speedMps: 2.99e8, attenuationDbPerKm: 1.1, baseMarginDb: 22 },
    acoustic: { label: '聲波通道', speedMps: 343, attenuationDbPerKm: 9.5, baseMarginDb: 18 }
};
const toBytes = (payload) => Array.from(new TextEncoder().encode(payload || 'Fusion'));
const byteToBits = (byte) => byte.toString(2).padStart(8, '0');
const byteToHex = (byte) => byte.toString(16).padStart(2, '0').toUpperCase();
const buildSignalFrame = (payload) => {
    const bytes = toBytes(payload);
    const bitStrings = bytes.map(byteToBits);
    const ones = bitStrings.join('').split('').filter((bit) => bit === '1').length;
    const parityBit = ones % 2 === 0 ? 0 : 1;
    const checksum = bytes.reduce((sum, byte) => (sum + byte) & 0xff, 0);
    const header = [0x7e, bytes.length & 0xff];
    const trailer = [parityBit, checksum];
    const frameBytes = [...header, ...bytes, ...trailer];
    return {
        payload: payload || 'Fusion',
        byteCount: bytes.length,
        bitCount: bytes.length * 8,
        binaryPreview: bitStrings.slice(0, 8).join(' '),
        parity: 'even',
        parityBit,
        hexChecksum: byteToHex(checksum),
        frameHex: frameBytes.map(byteToHex).join(' ')
    };
};
exports.buildSignalFrame = buildSignalFrame;
const estimateChannel = (input) => {
    const medium = MEDIUMS[input.medium] ?? MEDIUMS.fiber;
    const distanceMeters = Math.max(1, input.distanceMeters);
    const dataRateMbps = Math.max(0.1, input.dataRateMbps);
    const carrierFrequencyHz = Math.max(1, input.carrierFrequencyMhz) * 1_000_000;
    const distanceKm = distanceMeters / 1000;
    const attenuationDb = medium.attenuationDbPerKm * distanceKm;
    const signalMarginDb = medium.baseMarginDb - attenuationDb - Math.max(0, input.noiseDb - 10) * 0.45;
    const reliabilityLevel = signalMarginDb >= 14 ? 'steady' : signalMarginDb >= 8 ? 'watch' : 'review';
    return {
        medium: input.medium,
        mediumLabel: medium.label,
        propagationDelayUs: (distanceMeters / medium.speedMps) * 1_000_000,
        transmissionDelayUs: (1500 * 8 / (dataRateMbps * 1_000_000)) * 1_000_000,
        wavelengthMeters: medium.speedMps / carrierFrequencyHz,
        attenuationDb,
        signalMarginDb,
        reliabilityLevel
    };
};
exports.estimateChannel = estimateChannel;
const runProcessorTrace = (frame) => {
    const parityValue = frame.parityBit;
    const byteValue = frame.byteCount;
    const bitValue = frame.bitCount;
    return {
        registers: [
            { name: 'R0', value: `0x${byteToHex(byteValue)}`, note: '負載位元組' },
            { name: 'R1', value: `0x${frame.hexChecksum}`, note: '校驗碼' },
            { name: 'R2', value: `${bitValue}`, note: '負載位元' },
            { name: 'R3', value: `${parityValue}`, note: '偶同位元' }
        ],
        steps: [
            { instruction: 'LOAD R0, PAYLOAD_LEN', register: 'R0', result: `${byteValue} 位元組` },
            { instruction: 'LOAD R1, CHECKSUM', register: 'R1', result: `0x${frame.hexChecksum}` },
            { instruction: 'XOR R3, PARITY', register: 'R3', result: parityValue === 0 ? '已平衡' : '已加入同位元' },
            { instruction: 'SHL R2, 3', register: 'R2', result: `${bitValue} 位元` },
            { instruction: 'STORE FRAME_BUFFER, R0:R3', register: 'MEM', result: `${byteValue + 4} 訊框位元組` }
        ]
    };
};
exports.runProcessorTrace = runProcessorTrace;
