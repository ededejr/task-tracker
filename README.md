# @ededejr/task-tracker

A small utility for tracking task execution.

## Installation

```sh
npm install @ededejr/task-tracker
```

## Usage

### `TaskTracker.run`

The `run` method is the easiest and most consistent way to get started using the `TaskTracker`. It handles a bunch of functionality around running tasks, and utilizes best practices while providing an accessible API.

Let's take a look at a basic example, which will run your task and print out some logs to the console:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker({
  log: (message: string) => console.log(message),
});

async function downloadEmails() {
  return tracker.run(async () => await EmailService.downloadEmails());
}
```

#### Tracing

Using the `run` method keeps a history of all events, which can be useful for tracing (this can be disabled). This history can be accessed with the `TaskTracker.history` property. In real world use cases it may be more practical to consume the history before items are deleted from memory. This process of deletion is called "reclaiming", and memory is reclaimed when the `maxHistorySize` is reached.

The following is an example which allows persisting the history on reclaim:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker({
  maxHistorySize: 3, // Persist every 3 entries
  persistHistory: (entries) => {
    for (const entry of entires) {
      appendToFile(JSON.stringify(entry));
    }
  },
});

async function processEmails(emails: Email) {
  for (const email of emails) {
    tracker.run(async () => await EmailService.process(email));
  }
}
```

Persisting is also possible on insertion, which may be preferred to prevent data loss if the program exits before reclaiming occurs:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker({
  maxHistorySize: 100, // The size of the ledger before being reclaimed
  persistEntry: (entry) => {
    // publish to remote source, or save to disk...
    appendToFile(JSON.stringify(entry));
  },
});

async function processEmails(emails: Email) {
  for (const email of emails) {
    tracker.run(async () => await EmailService.process(email), {
      name: 'processEmail',
    });
  }
}
```

The above examples will generate a convenient log format:

```json
{
  "data": {
    "id": "214013d1-6f3e-40bc-9b0f-4106d29e46af",
    "signature": "214013d1-6f3e-40bc-9b0f-4106d29e46af::processEmail",
    "taskName": "processEmail",
    "message": "start"
  },
  "index": 190,
  "timestamp": 1674056687784
}
```

These logs can also include the name of the `TaskTracker` if supplied:

```ts
import TaskTracker from "@ededejr/task-tracker";

const tracker = new TaskTracker({
  name: "Renderer",
  maxHistorySize: 1 00,
  persistEntry: (entry) => {
    appendToFile(JSON.stringify(entry));
  },
});
```

will generate:

```json
{
  "data": {
    "id": "214013d1-6f3e-40bc-9b0f-4106d29e46af",
    "signature": "Renderer::214013d1-6f3e-40bc-9b0f-4106d29e46af::processEmail",
    "tracker": "Renderer",
    "taskName": "processEmail",
    "message": "start"
  },
  "index": 190,
  "timestamp": 1674056687784
}
```

> The [examples](https://github.com/ededejr/task-tracker/tree/feat/task-tracker-ledger/examples) folder contains a script which uses the `run` method to generate a log file using some of the concepts discussed here.

### Manually tracking tasks

In some situations you may want to track a task independent of function execution. This could be business logic that requires a number of different operations before being completed.

This is intentionally left open-ended to allow consumers decide what works best for their use case.

```ts
const task = tracker.start();
// some stuff later...
const duration = task.stop();
```

> Important: Ensure the `stop` function is called for your tasks to prevent memory build up.

The `TaskTracker` can be also be used in combination with other methods to accomplish more functionality. A good example of this is including a logger:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();

// A convenient wrapper for tasks
function startTask(name: string) {
  log(`start: ${name}`);
  const { stop } = tracker.start();
  return {
    stop: () => {
      log(`stop: ${name} ${stop().toPrecision(2)}`);
    },
  };
}

function main() {
  // create a task
  const readFileTask = startTask('read file');

  // do some work

  // stop the task
  readFileTask.stop();
}
```
