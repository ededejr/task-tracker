/**
 * An Array wrapper which only supports write operations.
 */
export default class Ledger<T> {
	private history: T[] = [];
	private listeners: ILedgerListeners<T> = {
		push: [],
		reclaim: [],
	};

	limit: number = 100;

	constructor(limit?: number) {
		if (limit) {
			this.limit = limit;
		}
	}

	/**
	 * Retrieve the current history, optionally transforming the output.
	 * @param transform An optional transform function for each history item.
	 */
	getHistory<RT = T>(transform?: (item: T, index?: number) => RT): RT[] | T[] {
		return transform ? this.history.map(transform) : this.history;
	}

	/**
	 * Insert items into the history.
	 * @param items The items to be inserted. 
	 */
	push(...items: T[]) {
		this.history.push(...items);
		this.listeners.push.forEach(cb => {
			for (const item of items) {
				cb(item);
			}
		});

		if (this.history.length >= this.limit) {
			const deletedItems = this.history.splice(0, this.deletionCount);
			this.listeners.reclaim.forEach(cb => {
				cb(deletedItems);
			});
		}
	}

	/**
	 * Add a callback to be called when an item is added to the history.
	 * @param cb The callback to be called.
	 */
	onInsert(cb: (item: T, index?: number) => void) {
		this.listeners.push.push(cb);
	}

	/**
	 * Add a callback to be called when items are removed from the history.
	 * @param cb The callback to be called.
	 */
	onReclaim(cb: (items: T[]) => void) {
		this.listeners.reclaim.push(cb);
	}

	private get deletionCount() {
		return Math.floor(this.history.length/2);
	}
}

interface ILedgerListeners<T> {
	push: ((item: T, index?: number) => void)[];
	reclaim: ((items: T[]) => void)[];
}