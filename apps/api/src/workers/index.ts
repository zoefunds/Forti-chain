import { signalIngestionWorker } from './signalIngestion.js';
import { analysisWorker } from './analysis.js';
import { genBalanceSyncWorker } from './genBalanceSync.js';

export function startWorkers() {
  console.log('Starting background workers...');
  signalIngestionWorker();
  analysisWorker();
  genBalanceSyncWorker();
}
