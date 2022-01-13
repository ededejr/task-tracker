import { performance } from 'perf_hooks';
import TaskTracker from '../';

jest.mock('perf_hooks', () => ({
	performance: {
		now: jest.fn()
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