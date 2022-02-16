// Disabling typescript for example file since this is just for presentation.
// @ts-nocheck
import { appendFile } from "fs/promises";
import randomatic from "randomatic";
import TaskTracker from "@ededejr/task-tracker";

const onInsertFile = "./onInsert-log.txt";
const onReclaimFile = "./onReclaim-log.txt";

async function write(type: "insert" | "reclaim", entry: any) {
	const data = JSON.stringify(entry);
	console.log(data);
	await appendFile(
		type === "insert" ? onInsertFile : onReclaimFile,
		data + "\n"
	);
}

function createTaskRunner(name: string) {
	return new TaskTracker({
		name,
		maxHistorySize: 10,
		persistEntry: (entry) => write("insert", entry),
		persistHistory: (entries) =>
			entries.forEach((entry) => write("reclaim", entry)),
	});
}

function task(tracker: TaskTracker) {
	return new Promise(async (resolve) => {
		let count = 100;

		while (count) {
			await tracker.run(
				() => {
					const duration = Math.floor(Math.max(Math.random() * 10000, 500));
					return new Promise((resolve) => setTimeout(resolve, duration));
				},
				{ name: randomatic("A0", 7) }
			);
			count--;
		}

		resolve(0);
	});
}

(async () => {
	await Promise.all([
		task(createTaskRunner("Renderer")),
		task(createTaskRunner("ReportingSvc")),
		task(createTaskRunner("DataSvc")),
	]);
})();
