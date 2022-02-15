export default class Ledger<T> {
	private history: T[] = [];
	private listeners: ILedgerListeners<T> = {
		push: [],
		reclaim: [],
	};
	limit: number = 100;

	constructor(limit: number) {
		this.limit = limit;
	}

	getHistory(transform?: <RT>(item: T, index?: number) => RT) {
		return transform ? this.history.map(transform) : this.history;
	}

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

	onInsert(cb: (item: T, index?: number) => void) {
		this.listeners.push.push(cb);
	}

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