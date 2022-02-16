import { performance } from "perf_hooks";
import Ledger, { LedgerRecord } from "./ledger";
import { v4 } from "uuid";

export default class TaskTracker {
	private name?: string;
	private map: Map<string, number> = new Map();
	private $ledger: Ledger<string>;
	private isLedgerEnabled: boolean;

	constructor(options?: ITaskRunnerOptions) {
		this.name = options?.name;
		this.isLedgerEnabled = options?.isLedgerEnabled ?? true;
		this.$ledger = new Ledger(options?.ledgerSize || 50);

		if (options?.persist) {
			this.$ledger.onInsert(options.persist);
		}

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
			stop: () => this.stop(taskId) as number,
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
		log("start", `start: "${taskName}"`);
		// Although I can move the ledger functions to the start and stop
		// functions respectively, I'm leaving them here
		// so that they only trace tasks using the "run" command
		//
		// reason: I just did this to see what kinds of problems
		// could arise. Maybe this should stay an internal research ground,
		// and live in a separate branch
		this.record(id, "start", taskName);

		let error;
		let result;

		try {
			result = await task();
		} catch (err: any) {
			error = err;
			this.record(id, `error: ${err.name} | ${err.message}`, taskName);
		} finally {
			const duration = stop();
			log("stop", `stop: "${taskName}" ${duration.toPrecision(2)}ms`);
			this.record(id, `stop: ${duration}ms`, taskName);
		}

		if (error) {
			throw error;
		}

		return result as T;
	}

	private record(id: string, message: string, taskName?: string) {
		this.isLedgerEnabled &&
			this.$ledger.push(`[${this.formatTask(id, taskName)}] ${message}`);
	}

	private formatTask(id: string, taskName?: string) {
		return `<${this.name ? `${this.name}>` : ""}${id}::${
			taskName || "unknown"
		}`;
	}

	private createId() {
		return v4();
	}
}

export interface ITaskRunnerOptions {
	/**
	 * Providing a name to a TaskRunner instance will include the
	 * name in every ledger entry. This is useful for debugging
	 * within specific domains.
	 *
	 * Sample: [<{name}>{task-id}::{task-name}]
	 */
	name?: string;
	/**
	 * Disable using the ledger.
	 */
	isLedgerEnabled?: boolean;
	/**
	 * The size of the ledger. This determines the limit of entries
	 * before memory is reclaimed.
	 */
	ledgerSize?: number;
	/**
	 * A function which receives the latest ledger entry.
	 */
	persist?: (entry: LedgerRecord<string>) => void;
	/**
	 * A function which receives the ledger entries being deleted.
	 */
	persistLedger?: (entries: LedgerRecord<string>[]) => void;
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
	name?: string;
	/**
	 * An optional logging function called to trace events
	 */
	log?: (m: string) => void;
	/**
	 * Perform callbacks on given events
	 */
	on?: IRunTaskEventCallbacks;
}

interface IRunTaskEventCallbacks {
	start?: () => void;
	stop?: () => void;
}

type RunTaskEvent = keyof IRunTaskEventCallbacks;
