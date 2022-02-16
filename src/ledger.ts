/**
 * An Array wrapper which only supports write operations.
 */
export default class Ledger<T = string> {
	private index: number = 0;
	private limit: number = 100;
	private history: LedgerRecord<T>[] = [];
	private listeners: ILedgerListeners<T> = {
		push: [],
		reclaim: [],
	};

	constructor(limit?: number) {
		if (limit) {
			this.limit = limit;
		}
	}

	/**
	 * Retrieve the current history, optionally transforming the output.
	 * @param transform An optional transform function for each history item.
	 */
	getHistory<RT = T>(
		transform?: (item: LedgerRecord<T>, index?: number) => RT
	): RT[] | LedgerRecord<T>[] {
		return transform ? this.history.map(transform) : this.history;
	}

	/**
	 * Insert items into the history.
	 * @param items The items to be inserted.
	 */
	push(...items: T[]) {
		this.history.push(
			...items.map((item) => {
				const record = {
					data: item,
					index: this.index++,
					timestamp: Date.now(),
				};

				this.listeners.push.forEach((cb) => {
					cb(record);
				});

				return record;
			})
		);

		if (this.history.length >= this.limit) {
			const deletedItems = this.history.splice(0, this.deletionCount);
			this.listeners.reclaim.forEach((cb) => {
				cb(deletedItems);
			});
		}
	}

	/**
	 * Add a callback to be called when an item is added to the history.
	 * @param cb The callback to be called.
	 */
	onInsert(cb: (item: LedgerRecord<T>) => void) {
		this.listeners.push.push(cb);
	}

	/**
	 * Add a callback to be called when items are removed from the history.
	 * @param cb The callback to be called.
	 */
	onReclaim(cb: (items: LedgerRecord<T>[]) => void) {
		this.listeners.reclaim.push(cb);
	}

	private get deletionCount() {
		return Math.floor(this.history.length / 2);
	}
}

export type LedgerRecord<T> = {
	index: number;
	timestamp: number;
	data: T;
};

interface ILedgerListeners<T> {
	push: ((item: LedgerRecord<T>) => void)[];
	reclaim: ((items: LedgerRecord<T>[]) => void)[];
}
