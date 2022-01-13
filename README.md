# @ededejr/task-tracker
A small utility for tracking task execution.

## Usage

### Creating a tracker
```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();
```

### Tracking a task
```ts
const task = tracker.start();
// do some stuff
const timeElapsed = task.stop();
```

### Combining with a simple logger
```ts
function startTask(name: string) {
  log(`start: ${name}`);
  const { stop } = tracker.start();
  return () => {
    log(`stop: ${name} ${stop().toPrecision(2)}`);
  }
}

// now in use
const stopReadFileTask = startTask('read file');
// read the file
stopReadFileTask();
```

### Extending to encompass execution
```ts
async function runTask<T extends () => Promise<any>>(f: T, options?: { name: string }): ReturnType<T> {
  const _name = f.name || options?.name;
  log(`start: ${_name}()`);
  const { stop } = tracker.start();
  const result = await f();
  log(`stop: ${_name} ${stop().toPrecision(2)}`);
  return result;
}

// now in use
(async () => {
  async function fetchData() {
    // make some eternal request
  }
  await runTask(fetchData);
})
```