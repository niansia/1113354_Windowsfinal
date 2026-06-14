"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const powerActions_js_1 = require("../src/system/powerActions.js");
(0, node_test_1.default)('exposes the four desktop power actions in reference order', () => {
    strict_1.default.deepEqual(powerActions_js_1.POWER_ACTIONS.map((action) => action.id), ['lock', 'sleep', 'shutdown', 'restart']);
});
(0, node_test_1.default)('routes only host lifecycle actions through the WinForms bridge', () => {
    strict_1.default.deepEqual((0, powerActions_js_1.toHostSystemAction)('shutdown'), {
        type: 'FUSION_SYSTEM_ACTION',
        data: { action: 'shutdown' }
    });
    strict_1.default.deepEqual((0, powerActions_js_1.toHostSystemAction)('restart'), {
        type: 'FUSION_SYSTEM_ACTION',
        data: { action: 'restart' }
    });
    strict_1.default.equal((0, powerActions_js_1.toHostSystemAction)('lock'), null);
    strict_1.default.equal((0, powerActions_js_1.toHostSystemAction)('sleep'), null);
});
