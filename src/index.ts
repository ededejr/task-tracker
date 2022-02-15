import { performance } from 'perf_hooks';
import Ledger from './ledger';
import { v4 } from 'uuid';

export default class TaskTracker {
  private map: Map<string, number> = new Map();
	private $ledger: Ledger<string>;
	private isLedgerEnabled: boolean;

	constructor(options?: ITaskRunnerOptions) {
		this.isLedgerEnabled = options?.isLedgerEnabled ?? true;
		this.$ledger = new Ledger(options?.ledgerSize || 50);
		
		if (options?.persistLedger) {
			this.$ledger.onReclaim(options.persistLedger);
		}
	}

	/**
	 * A history of tasks performed by this instance.
	 */
	get ledger() {
		return this.$ledger.getHistory();
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
	async run<T>(task: TaskFunction<T>, options?: IRunTaskOptions): Promise<T> {
		const taskName = options?.name || task.name;
		
		const log = (event: RunTaskEvent, message: string) => {
			const cb = options?.on && options.on[event];
			options?.log && options.log(message);
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
		this.record(`[${id}::${taskName || 'unknown'}] start`);

		let error;
		let result;

		try {
			result = await task();
		} catch (err: any) {
			error = err;
			this.record(`[${id}::${taskName || 'unknown'}] error: ${err.name} | ${err.message}`);
		} finally {
			const duration = stop();
			log('end', `stop: "${taskName}" ${duration.toPrecision(2)}ms`);
			this.record(`[${id}::${taskName || 'unknown'}] stop: ${duration}ms`);
		}

		if (error) {
			throw error;
		}

		return result as T;
	}

	private record(message: string) {
		this.isLedgerEnabled && this.$ledger.push(message);
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

type RunTaskEvent = keyof IRunTaskEventCallbacks;

export interface ITaskRunnerOptions { 
	isLedgerEnabled?: boolean,
	ledgerSize?: number,
	persistLedger?: (entries: string[]) => void,
}