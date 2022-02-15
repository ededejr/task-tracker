export default class Ledger<T> {
	private history: T[] = [];
	limit: number = 100;

	constructor(limit: number) {
		this.limit = number;
	}

	getHistory(transform?: <RT>(item: T, index?: number) => RT) {
		return transform ? this.history.map(transform) : this.history;
	}

	push(...items: T[]) {
		this.history.push(items);
		
		if (this.history.length >= this.limit) {
			this.history.splice(0, this.deletionCount)
		}
	}

	private get deletionCount() {
		return Math.floor(this.history.length/2);
	}
}