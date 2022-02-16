import { performance } from "perf_hooks";
import Ledger, { LedgerRecord } from "./ledger";
import { v4 } from "uuid";

export default class TaskTracker {
	private map: Map<string, number> = new Map();
	private ledger: Ledger<string>;
	private isHistoryEnabled: boolean;
	private name?: string;
	private log?: ITaskRunnerOptions["log"];

	constructor(options?: ITaskRunnerOptions) {
		this.name = options?.name;
		this.isHistoryEnabled = options?.isHistoryEnabled ?? true;
		this.ledger = new Ledger(options?.maxHistorySize || 50);

		if (options?.persistEntry) {
			this.ledger.onInsert(options.persistEntry);
		}

		if (options?.persistHistory) {
			this.ledger.onReclaim(options.persistHistory);
		}
	}

	/**
	 * A history of tasks performed by this instance.
	 */
	get history() {
		return this.ledger.getHistory();
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

		const log = (message: string) => {
			this.log && this.log(message);
		};

		const { id, stop } = this.start();
		log(`start: "${taskName}"`);
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
			log(`stop: "${taskName}" ${duration.toPrecision(2)}ms`);
			this.record(id, `stop: ${duration}ms`, taskName);
		}

		if (error) {
			throw error;
		}

		return result as T;
	}

	private record(id: string, message: string, taskName?: string) {
		this.isHistoryEnabled &&
			this.ledger.push(`[${this.formatTask(id, taskName)}] ${message}`);
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
	isHistoryEnabled?: boolean;
	/**
	 * The size of the TaskRunner's history. This determines the limit of entries
	 * before memory is reclaimed.
	 */
	maxHistorySize?: number;
	/**
	 * A function which receives the latest ledger entry.
	 */
	persistEntry?: (entry: LedgerRecord<string>) => void;
	/**
	 * A function which receives the ledger entries being deleted.
	 */
	persistHistory?: (entries: LedgerRecord<string>[]) => void;
	/**
	 * An optional logging function called to trace events
	 */
	log?: (message: string) => void;
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
}
