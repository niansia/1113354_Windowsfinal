import { simulateMatch, type SportsPredictionInput } from './sportsSimulation';

interface PredictionWorkerRequest {
  requestId: number;
  input: SportsPredictionInput;
}

self.onmessage = (event: MessageEvent<PredictionWorkerRequest>) => {
  const { requestId, input } = event.data;
  try {
    self.postMessage({ requestId, result: simulateMatch(input) });
  } catch (reason) {
    self.postMessage({
      requestId,
      error: reason instanceof Error ? reason.message : 'Prediction failed.'
    });
  }
};

