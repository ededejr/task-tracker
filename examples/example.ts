// Disabling typescript for example file since this is just for presentation.
// @ts-nocheck
import TaskTracker from '@ededejr/task-tracker';

const log = (m: string) => console.log(m);

const RendererTaskRunner = new TaskTracker({ 
  name: 'Renderer', 
  ledgerSize: 1,
  persistLedger: (entries) => entries.forEach(e => log(JSON.stringify(e)))
});

const ReportingSvcTaskRunner = new TaskTracker({ 
  name: 'ReportingSvc',
  ledgerSize: 1,
  persistLedger: (entries) => entries.forEach(e => JSON.stringify(e))
});

const DataSvcTaskRunner = new TaskTracker({ 
  name: 'DataSvc',
  ledgerSize: 1,
  persistLedger: (entries) => entries.forEach(e => JSON.stringify(e))
});

function randomExecution() {
  const duration = Math.floor(Math.max(Math.random() * 10000, 500));
  return new Promise(resolve => setTimeout(resolve, duration));
}

function task(tracker: TaskTracker) {
  return new Promise(resolve => {
    let count = 100;

    while (count) {
      tracker.run(randomExecution);
      count--;
    }

    resolve(0);
  })
}

(async () => {
  await Promise.all([
    task(RendererTaskRunner),
    task(ReportingSvcTaskRunner),
    task(DataSvcTaskRunner)
  ]);
})();