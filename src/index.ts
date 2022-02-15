import { performance } from 'perf_hooks';
import Ledger from './ledger';
import { v4 } from 'uuid';

export default class TaskTracker {
  private map: Map<string, number> = new Map();
	private history: Ledger<string>;

	constructor(options?: { ledgerSize?: number }) {
		this.history = new Ledger(options?.ledgerSize);
	}
  
  /**
   * Start measuring a task
	 * @returns A stop function which can be called to stop the task
   */
  start(): ITask {
		const taskId = this.createId();
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

	/**
	 * Run and track a task during it's execution. 
	 * 
	 * Using this function will also keep a history of tasks
	 * that have been run by this `TaskRunner` instance. The
	 * history can be retrieved using the `history` property.
	 * 
	 * @param task The task you wish to execute and track.
	 * @param options Configuration options for the execution.
	 * @returns The task output.
	 */
	run<T>(task: TaskFunction<T>, options?: IRunTaskOptions): T {
		const taskName = options?.name || f.name;
		
		const log = (event: RunTaskEvent, message: string) => {
			const cb = options?.on[event];
			options.log && options.log(message);
			cb && cb();
		};

		const { id, stop } = this.start();
		log('start', `start: "${taskName}"`);
		// Although I can move the ledger functions to the start and stop
		// functions respectively, I'm leaving them here
		// so that they only trace tasks using the "run" command
		//
		// reason: I just did this to see what kinds of problems
		// could arise. Maybe this should stay an internal research ground,
		// and live in a separate branch
		this.ledger.push(`[${id}::${taskName}] start`);

		let result: T;
		let error;

		try {
			result = await f();
		} catch (err) {
			error = err;
			this.ledger.push(`[${id}::${taskName}] error: ${err.name} | ${err.message}`);
		} finally {
			const duration = stop();
			log('end', `stop: "${taskName}" ${duration.toPrecision(2)}`);
			this.ledger.push(`[${id}::${taskName}] stop: ${duration}`);
		}

		if (error) {
			throw error;
		}

		return result;
	}

	get history() {
		return this.ledger.getHistory();
	}

	private createId() {
		return v4();
	}
}

export interface ITask {
	id: string;
	stop(): number;
}

export type TaskFunction<T = unknown> = () => Promise<T> | T;

export interface IRunTaskOptions {
	/**
	 * A human readable task name. This will try to default to the function name
	 */
	name?: string,
	/**
	 * An optional logging function called to trace events 
	 */
	log?: (m: string) => void,
	/**
	 * Perform callbacks on given events
	 */
	on?: IRunTaskEventCallbacks
}

interface IRunTaskEventCallbacks {
	start?: () => void,
	end?: () => void,
}

type RunTaskEvent = Keys<IRunTaskEventCallbacks>;