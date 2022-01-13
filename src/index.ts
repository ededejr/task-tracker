import { performance } from 'perf_hooks';
import { v4 } from 'uuid';

export default class TaskTracker {
  private map: Map<string, number> = new Map();
  
  /**
   * Start measuring a task
	 * @returns A stop function which can be called to stop the task
   */
  start(): ITask {
		const taskId = v4();
		const now = performance.now();
		this.map.set(taskId, now);
		return {
			id: taskId,
			stop: () => (this.stop(taskId) as number),
		};
  }

	/**
	 * Stop measuring a task
	 * @param taskId
	 * @returns The time elapsed in milliseconds
	 */
  stop(taskId: string): number | void {
  	if (this.map.has(taskId)) {
  		const now = performance.now();
  		const startTime = this.map.get(taskId) || 0;
  		this.map.delete(taskId);
  		return now - startTime;
  	}
  }
}
export interface ITask {
	id: string;
	stop(): number;
}