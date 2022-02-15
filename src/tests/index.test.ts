import { performance } from 'perf_hooks';
import TaskTracker from '../';

jest.mock('perf_hooks', () => ({
	performance: {
		now: jest.fn(() => Date.now())
	}
}));

describe('Task', () => {
	test('has start method', () => {
		const tracker = new TaskTracker();
		expect(typeof tracker.start).toBe('function');
	});

	test('has stop method', () => {
		const tracker = new TaskTracker();
		expect(typeof tracker.stop).toBe('function');
	});

	test('calls performance.now', () => {
		const tracker = new TaskTracker();
		const task = tracker.start();
		expect(performance.now).toHaveBeenCalledTimes(1);
		task.stop();
		expect(performance.now).toHaveBeenCalledTimes(2);
	});

	test('start returns Task object', () => {
		const tracker = new TaskTracker();
		const task = tracker.start();
		expect(task).toHaveProperty('stop');
		expect(task).toHaveProperty('id');
		expect(typeof task.stop).toBe('function');
		expect(typeof task.id).toBe('string');
	});
});

describe('Task with Ledger', () => {
	test('writes to ledger after "run()"', async () => {
		const tracker = new TaskTracker({ ledgerSize: 10 });
		jest.spyOn(tracker, 'start');
		jest.spyOn(tracker, 'stop');
		const testTask = () => new Promise(resolve => setTimeout(resolve, 100));
		await tracker.run(testTask);
		expect(tracker.start).toHaveBeenCalledTimes(1);
		expect(tracker.stop).toHaveBeenCalledTimes(1);
		expect(tracker.ledger.length).toBe(2);
	});

	test('errors bubble up to caller', async () => {
		const tracker = new TaskTracker({ ledgerSize: 10 });
		const testTask = () => new Promise((_,reject) => reject(new Error('test error')));
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

	test('writes to ledger on errors', async () => {
		const tracker = new TaskTracker({ ledgerSize: 10 });
		jest.spyOn(tracker, 'start');
		jest.spyOn(tracker, 'stop');
		const testTask = () => new Promise((_, reject) => setTimeout(() => {
			reject(new Error('test error'))
		}, 100));
		
		try {
			await tracker.run(testTask);
		} catch (error) {
			// do nothing, an error should have been thrown
		}

		expect(tracker.start).toHaveBeenCalledTimes(1);
		expect(tracker.stop).toHaveBeenCalledTimes(1);
		expect(tracker.ledger.length).toBe(3);
	});

	test('reclaims memory after specified history size', async () => {
		const ledgerSize = 20;
		const iterations = ledgerSize + 2;
		
		const tracker = new TaskTracker({ ledgerSize });
		jest.spyOn(tracker, 'start');
		jest.spyOn(tracker, 'stop');
	
		const testTask = () => new Promise(resolve => setTimeout(resolve, 50));
		
		for (let index = 0; index < iterations; index++) {
			await tracker.run(testTask);
		}

		expect(tracker.start).toHaveBeenCalledTimes(iterations);
		expect(tracker.stop).toHaveBeenCalledTimes(iterations);
		expect(tracker.ledger.length).toBe(14);
	});

	test('calls persistLedger when reclaiming', async () => {
		const ledgerSize = 20;
		const iterations = ledgerSize + 2;
		const cb = jest.fn();
		
		const tracker = new TaskTracker({ 
			ledgerSize, 
			persistLedger: cb 
		});

		jest.spyOn(tracker, 'start');
		jest.spyOn(tracker, 'stop');
	
		const testTask = () => new Promise(resolve => setTimeout(resolve, 50));
		
		for (let index = 0; index < iterations; index++) {
			await tracker.run(testTask);
		}

		expect(tracker.start).toHaveBeenCalledTimes(iterations);
		expect(tracker.stop).toHaveBeenCalledTimes(iterations);
		expect(tracker.ledger.length).toBe(14);
		expect(cb).toHaveBeenCalledTimes(3);
	});

	test('does not write to ledger if isLedgerEnabled', async () => {
		const ledgerSize = 20;
		const iterations = ledgerSize + 2;
		const cb = jest.fn();
		
		const tracker = new TaskTracker({ 
			ledgerSize, 
			isLedgerEnabled: false,
			persistLedger: cb
		});

		jest.spyOn(tracker, 'start');
		jest.spyOn(tracker, 'stop');
	
		const testTask = () => new Promise(resolve => setTimeout(resolve, 50));
		
		for (let index = 0; index < iterations; index++) {
			await tracker.run(testTask);
		}

		expect(tracker.start).toHaveBeenCalledTimes(iterations);
		expect(tracker.stop).toHaveBeenCalledTimes(iterations);
		expect(tracker.ledger.length).toBe(0);
		expect(cb).toHaveBeenCalledTimes(0);
	});
});