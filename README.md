# @ededejr/task-tracker
A small utility for tracking task execution.

## Usage

### Creating a tracker
```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();
```

### Track a task
The simplest usecase.

```ts
const task = tracker.start();

// do some stuff

const timeElapsed = task.stop();
```

### Extending use cases
The `TaskTracker` can be used in combination with other methods to accomplish more functionality.

#### Combine with a logger

Use human readable strings for tasks being run with a logger.

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

#### Combine with an executor

Wrap the task measurement in a function that can handle logging, execution, or even retries (if that's your thing).

```ts
interface Options {
  name: string;
}

async function runTask(f: () => Promise<any>, options?: Options) {
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
  const data = await runTask(fetchData);
})
```
