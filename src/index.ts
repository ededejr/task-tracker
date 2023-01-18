import { performance } from 'perf_hooks';
import Ledger, { LedgerRecord } from './ledger';
import { v4 } from 'uuid';

export default class TaskTracker {
  private map: Map<string, number> = new Map();
  private ledger: Ledger<ITaskRecord>;
  private isHistoryEnabled: boolean;
  private name: ITaskTrackerOptions['name'];
  private log: ITaskTrackerOptions['log'];

  constructor(options?: ITaskTrackerOptions) {
    this.name = options?.name;
    this.isHistoryEnabled = options?.isHistoryEnabled ?? true;
    this.ledger = new Ledger(options?.maxHistorySize || 50);
    this.log = options?.log;

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
      stop: () => this.stop(taskId),
    };
  }

  /**
   * Stop measuring a task
   * @param taskId
   * @returns The time elapsed in milliseconds
   */
  stop(taskId: string): number | null {
    if (this.map.has(taskId)) {
      const now = performance.now();
      const startTime = this.map.get(taskId) || 0;
      this.map.delete(taskId);
      return now - startTime;
    }

    return null;
  }

  /**
   * Run and track a task during it's execution.
   *
   * Using this function will also keep a history of tasks
   * that have been run by this `TaskTracker` instance. The
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
    this.record({
      id,
      message: 'start',
      taskName,
    });

    let error;
    let result;

    try {
      result = await task();
    } catch (err: any) {
      error = err;
      this.record({
        id,
        message: `error: ${err.name} | ${err.message}`,
        taskName,
      });
    } finally {
      const duration = stop();
      if (duration) {
        log(`stop: "${taskName}" ${duration.toPrecision(2)}ms`);
        this.record({
          id,
          message: `stop: ${duration.toPrecision(2)}ms`,
          taskName,
          duration,
        });
      }
    }

    if (error) {
      throw error;
    }

    return result as T;
  }

  private record({ id, message, taskName, duration }: ITaskRecordParams) {
    this.isHistoryEnabled &&
      this.ledger.push({
        id,
        signature: this.formatTask(id, taskName),
        tracker: this.name,
        taskName,
        message,
        duration,
      });
  }

  private formatTask(id: string, taskName?: string) {
    return `${this.name ? `${this.name}::` : ''}${id}::${
      taskName || 'unknown'
    }`;
  }

  private createId() {
    return v4();
  }
}

export interface ITaskTrackerOptions {
  /**
   * Providing a name to a TaskTracker instance will include the
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
   * The size of the TaskTracker's history. This determines the limit of entries
   * before memory is reclaimed.
   */
  maxHistorySize?: number;
  /**
   * A function which receives the latest ledger entry.
   */
  persistEntry?: (entry: LedgerRecord<ITaskRecord>) => void;
  /**
   * A function which receives the ledger entries being deleted.
   */
  persistHistory?: (entries: LedgerRecord<ITaskRecord>[]) => void;
  /**
   * An optional logging function called to trace events
   */
  log?: (message: string) => void;
}

export interface ITaskRecord {
  id: string;
  signature: string;
  tracker?: string;
  taskName?: string;
  message: string;
  duration?: number;
}

interface ITaskRecordParams {
  id: string;
  message: string;
  taskName?: string;
  duration?: number;
}

export interface ITask {
  id: string;
  stop(): number | null;
}

export type TaskFunction<T = unknown> = () => Promise<T> | T;

export interface IRunTaskOptions {
  /**
   * A human readable task name. This will try to default to the function name
   */
  name?: string;
}
