# @ededejr/task-tracker

A small utility for tracking task execution.

## Installation

This is hosted using Github packages, which means you may have to include an `.npmrc` file.

In your `.npmrc` file include the following:

```
@ededejr:registry=https://npm.pkg.github.com/ededejr
```

Afterwards, you can now install using `npm`:

```
npm install @ededejr/task-runner
```

## Usage

### `TaskTracker.run`

The `run` method is the easiest and most consistent way to get started using the `TaskRunner`. It handles a bunch of functionality around running tasks, and utilizes best practices while providing an accessible API.

Let's take a look at a basic example, which will run your task and print out some logs to the console:

```ts
import TaskTracker from "@ededejr/task-tracker";

const tracker = new TaskTracker({
  log: (message: string) => console.log(message),
});

async function downloadEmails() {
  return tracker.run(async () => await EmailService.downloadEmails());
}
```

#### Tracing

Using the `run` method keeps a history of all events, which can be useful for tracing (this can be disabled). This history can be accessed with the `TaskRunner.history` property. In real world use cases it may be more practical to consume the history before items are deleted from memory. This process of deletion is called "reclaiming", and memory is reclaimed when the `maxHistorySize` is reached.

The following is an example which allows persisting the history on reclaim:

```ts
import TaskTracker from "@ededejr/task-tracker";

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

Persisting is also possible on insertion:

```ts
import TaskTracker from "@ededejr/task-tracker";

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
      name: "processEmail",
    });
  }
}
```

The above examples will generate a convenient log format:

```json
{"data":"[3480484d-f468-4e08-b70f-e0bc009aacbd::processEmail] start","index":197,"timestamp":1644981910473}
{"data":"[3480484d-f468-4e08-b70f-e0bc009aacbd::processEmail] start","index":198,"timestamp":1644981910480}
```

These logs can also include the name of the `TaskRunner` if supplied:

```ts
import TaskTracker from "@ededejr/task-tracker";

const tracker = new TaskTracker({
  name: "DataSvc",
  maxHistorySize: 100,
  persistEntry: (entry) => {
    appendToFile(JSON.stringify(entry));
  },
});
```

will generate:

```json
{"data":"[<DataSvc>3480484d-f468-4e08-b70f-e0bc009aacbd::processEmail] start","index":197,"timestamp":1644981910473}
{"data":"[<DataSvc>3480484d-f468-4e08-b70f-e0bc009aacbd::processEmail] start","index":198,"timestamp":1644981910480}
```

> The [examples](https://github.com/ededejr/task-tracker/tree/feat/task-runner-ledger/examples) folder contains a script which uses the `run` method to generate a log file using some of the concepts discussed here.

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
import TaskTracker from "@ededejr/task-tracker";

const tracker = new TaskTracker();

// Use human readable strings for tasks being run with a logger.
function startTask(name: string) {
  log(`start: ${name}`);
  const { stop } = tracker.start();
  return () => {
    log(`stop: ${name} ${stop().toPrecision(2)}`);
  };
}

// now in use
const stopReadFileTask = startTask("read file");
// read the file...
stopReadFileTask();
```
