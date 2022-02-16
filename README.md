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

# Usage

## Using `TaskRunner.run`
The `run` method is the easiest and most consistent way to get started using the `TaskRunner`. It handles a bunch of functionality around running tasks, and utilizes best practices while providing an accessible API.

Let's take a look at a basic example, which will run your task and print out some logs to the console:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();

async function downloadEmails() {
  const emails = tracker.run(
    async () => await EmailService.downloadEmails(),
    {
      log: (message: string) => console.log(message)
    }
  );
}
```

Using the `run` method also keeps a ledger of all tasks run, which can be useful for tracing. This ledger can be accessed with the `TaskRunner.ledger` property. In real world use cases it may be more practical to consume the ledger when memory is being reclaimed. The `Ledger` stores records in memory until a limit is reached. When the limit is reached, the ledger reclaims more space.

The following is an example which allows persisting the ledger when reclaimed:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();

async function processEmails(emails: Email) {
  for (const email of emails) {
    tracker.run(
      async () => await EmailService.process(email),
      {
        log: (message: string) => console.log(message),
        ledgerSize: 3, // Persist every 3 entries
        persistLedger: (entries) => {
          // publish to remote source, or save to disk...
          for (const entry of entires) {
            appendToFile(JSON.stringify(entry))
          }
        }
      }
    );
  }
}
```

Persisting is also possible on insertion:

```ts
import TaskTracker from '@ededejr/task-tracker';

const tracker = new TaskTracker();

async function processEmails(emails: Email) {
  for (const email of emails) {
    tracker.run(
      async () => await EmailService.process(email),
      {
        log: (message: string) => console.log(message),
        ledgerSize: 100, // The size of the ledger before being reclaimed
        persist: (entry) => {
          // publish to remote source, or save to disk...
        }
      }
    );
  }
}
```


> The `./examples` folder contains a script which uses the `run` method to generate a log file using some of the concepts discussed here.


## Manually tracking tasks
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

// Use human readable strings for tasks being run with a logger.
function startTask(name: string) {
  log(`start: ${name}`);
  const { stop } = tracker.start();
  return () => {
    log(`stop: ${name} ${stop().toPrecision(2)}`);
  }
}

// now in use
const stopReadFileTask = startTask('read file');
// read the file...
stopReadFileTask();
```
