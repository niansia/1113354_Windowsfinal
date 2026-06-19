"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHostSystemAction = exports.POWER_ACTIONS = void 0;
exports.POWER_ACTIONS = [
    { id: 'lock', label: '鎖定' },
    { id: 'sleep', label: '睡眠' },
    { id: 'shutdown', label: '關機' },
    { id: 'restart', label: '重新啟動' }
];
const toHostSystemAction = (action) => action === 'shutdown' || action === 'restart'
    ? {
        type: 'FUSION_SYSTEM_ACTION',
        data: { action }
    }
    : null;
exports.toHostSystemAction = toHostSystemAction;
