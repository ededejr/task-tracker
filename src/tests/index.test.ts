import { performance } from 'perf_hooks';
import TaskTracker from '../';

jest.mock('perf_hooks', () => ({
  performance: {
    now: jest.fn(() => Date.now()),
  },
}));

describe('TaskTracker', () => {
  describe('properties', () => {
    test('has start method', () => {
      const tracker = new TaskTracker();
      expect(typeof tracker.start).toBe('function');
    });

    test('has stop method', () => {
      const tracker = new TaskTracker();
      expect(typeof tracker.stop).toBe('function');
    });

    test('has run method', () => {
      const tracker = new TaskTracker();
      expect(typeof tracker.run).toBe('function');
    });
  });

  describe('start', () => {
    test('calls performance.now', () => {
      const tracker = new TaskTracker();
      const task = tracker.start();
      expect(performance.now).toHaveBeenCalledTimes(1);
      task.stop();
      expect(performance.now).toHaveBeenCalledTimes(2);
    });

    test('returns Task object', () => {
      const tracker = new TaskTracker();
      const task = tracker.start();
      expect(task).toHaveProperty('stop');
      expect(task).toHaveProperty('id');
      expect(typeof task.stop).toBe('function');
      expect(typeof task.id).toBe('string');
    });
  });

  describe('run', () => {
    test('writes to ledger after "run()"', async () => {
      const tracker = new TaskTracker({ maxHistorySize: 10 });
      jest.spyOn(tracker, 'start');
      jest.spyOn(tracker, 'stop');
      const testTask = () => new Promise((resolve) => setTimeout(resolve, 100));
      await tracker.run(testTask);
      expect(tracker.start).toHaveBeenCalledTimes(1);
      expect(tracker.stop).toHaveBeenCalledTimes(1);
      expect(tracker.history.length).toBe(2);
    });

    test('errors bubble up to caller', async () => {
      const tracker = new TaskTracker({ maxHistorySize: 10 });
      const testTask = () =>
        new Promise((_, reject) => reject(new Error('test error')));
      let err: Error | undefined;

      try {
        await tracker.run(testTask);
      } catch (error: any) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe('Error');
      expect(err?.message).toBe('test error');
    });
  });

  describe('ledger', () => {
    test('writes to ledger on errors', async () => {
      const tracker = new TaskTracker({ maxHistorySize: 10 });
      jest.spyOn(tracker, 'start');
      jest.spyOn(tracker, 'stop');
      const testTask = () =>
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(new Error('test error'));
          }, 100)
        );

      try {
        await tracker.run(testTask);
      } catch (error) {
        // do nothing, an error should have been thrown
      }

      expect(tracker.start).toHaveBeenCalledTimes(1);
      expect(tracker.stop).toHaveBeenCalledTimes(1);
      expect(tracker.history.length).toBe(3);
    });

    test('reclaims memory after specified history size', async () => {
      const ledgerSize = 20;
      const iterations = ledgerSize + 2;

      const tracker = new TaskTracker({ maxHistorySize: ledgerSize });
      jest.spyOn(tracker, 'start');
      jest.spyOn(tracker, 'stop');

      const testTask = () => new Promise((resolve) => setTimeout(resolve, 50));

      for (let index = 0; index < iterations; index++) {
        await tracker.run(testTask);
      }

      expect(tracker.start).toHaveBeenCalledTimes(iterations);
      expect(tracker.stop).toHaveBeenCalledTimes(iterations);
      expect(tracker.history.length).toBe(14);
    });

    test('calls persistLedger when reclaiming', async () => {
      const ledgerSize = 20;
      const iterations = ledgerSize + 2;
      const cb = jest.fn();

      const tracker = new TaskTracker({
        maxHistorySize: ledgerSize,
        persistHistory: cb,
      });

      jest.spyOn(tracker, 'start');
      jest.spyOn(tracker, 'stop');

      const testTask = () => new Promise((resolve) => setTimeout(resolve, 50));

      for (let index = 0; index < iterations; index++) {
        await tracker.run(testTask);
      }

      expect(tracker.start).toHaveBeenCalledTimes(iterations);
      expect(tracker.stop).toHaveBeenCalledTimes(iterations);
      expect(tracker.history.length).toBe(14);
      expect(cb).toHaveBeenCalledTimes(3);
    });

    test('does not write to ledger if isLedgerEnabled', async () => {
      const ledgerSize = 20;
      const iterations = ledgerSize + 2;
      const cb = jest.fn();

      const tracker = new TaskTracker({
        maxHistorySize: ledgerSize,
        isHistoryEnabled: false,
        persistHistory: cb,
      });

      jest.spyOn(tracker, 'start');
      jest.spyOn(tracker, 'stop');

      const testTask = () => new Promise((resolve) => setTimeout(resolve, 50));

      for (let index = 0; index < iterations; index++) {
        await tracker.run(testTask);
      }

      expect(tracker.start).toHaveBeenCalledTimes(iterations);
      expect(tracker.stop).toHaveBeenCalledTimes(iterations);
      expect(tracker.history.length).toBe(0);
      expect(cb).toHaveBeenCalledTimes(0);
    });

    test('name is included in ledger entry', async () => {
      const tracker = new TaskTracker({ maxHistorySize: 10, name: 'Monolith' });
      const testTask = () => new Promise((resolve) => setTimeout(resolve, 100));
      await tracker.run(testTask);
      const entry = tracker.history[0];
      expect(JSON.stringify(entry)).toContain('Monolith::');
    });

    test('entry includes metadata', async () => {
      const tracker = new TaskTracker({ maxHistorySize: 10, name: 'Monolith' });
      const testTask = () => new Promise((resolve) => setTimeout(resolve, 100));
      await tracker.run(testTask);
      const entry = tracker.history[0];
      expect(entry).toHaveProperty('index');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('data');
    });

    describe('formats entries', () => {
      test('correctly provides fields on entries', () => {
        const tracker = new TaskTracker({ maxHistorySize: 10 });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        tracker.run(testTask);
        const entry = tracker.history[0];

        // top level properties
        expect(entry).toHaveProperty('index');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('data');

        // data properties
        expect(entry.data).toHaveProperty('id');
        expect(entry.data).toHaveProperty('signature');
        expect(entry.data).toHaveProperty('tracker');
        expect(entry.data).toHaveProperty('taskName');
        expect(entry.data).toHaveProperty('message');
        expect(entry.data).toHaveProperty('duration');
      });

      test('combines fields into signature', async () => {
        const tracker = new TaskTracker({
          maxHistorySize: 10,
          name: 'Monolith',
        });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask);
        const entry = tracker.history[0];
        expect(entry.data.signature).toContain(entry.data.id);
        expect(entry.data.signature).toContain(entry.data.tracker);
        expect(entry.data.signature).toContain(entry.data.taskName);
      });

      test('includes tracker if set', async () => {
        const tracker = new TaskTracker({
          maxHistorySize: 10,
          name: 'Monolith',
        });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask);
        const entry = tracker.history[0];
        expect(entry.data.tracker).toBe('Monolith');
      });

      test('does not include tracker if not set', async () => {
        const tracker = new TaskTracker({
          maxHistorySize: 10,
        });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask);
        const entry = tracker.history[0];
        expect(entry.data.tracker).toBeUndefined();
      });

      test('includes task name via inference', async () => {
        const tracker = new TaskTracker({ maxHistorySize: 10 });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask);
        const entry = tracker.history[0];
        expect(entry.data.taskName).toBe('testTask');
      });

      test('includes task name if set', async () => {
        const tracker = new TaskTracker({ maxHistorySize: 10 });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask, { name: 'some task' });
        const entry = tracker.history[0];
        expect(entry.data.taskName).toBe('some task');
      });

      test('does not include task name if not set and unavailable', async () => {
        const tracker = new TaskTracker({ maxHistorySize: 10 });
        await tracker.run(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
        const entry = tracker.history[0];
        expect(entry.data.taskName).toBe('');
      });

      test('includes duration if stopping', async () => {
        const tracker = new TaskTracker({ maxHistorySize: 10 });
        const testTask = () =>
          new Promise((resolve) => setTimeout(resolve, 100));
        await tracker.run(testTask);
        const [first, second] = tracker.history;
        expect(first.data.duration).toBeUndefined();
        expect(second.data.duration).toBeDefined();
        expect(second.data.duration).toBeGreaterThan(0);
      });
    });
  });
});
