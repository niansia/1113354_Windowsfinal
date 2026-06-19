"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sportsSimulation_1 = require("./sportsSimulation");
self.onmessage = (event) => {
    const { requestId, input } = event.data;
    try {
        self.postMessage({ requestId, result: (0, sportsSimulation_1.simulateMatch)(input) });
    }
    catch (reason) {
        self.postMessage({
            requestId,
            error: reason instanceof Error ? reason.message : 'Prediction failed.'
        });
    }
};
