# Batch Promises with Delay

This module is for batching promises that need delays between batches. It also allows users to retry promises that have failed. One situation this can be useful is when dealing with unreliable api calls that have rate limits.

## Installation

```sh
npm install --save batch-promises-with-delay
```

or

```sh
yarn add batch-promises-with-delay
```

## Simple Usage

```js
// simple-example.js

const batchPromisesWithDelay = require('batch-promises-with-delay')

const promises = [
  {
    func: async (a, b) => {
      /* some api call */
      /* some database save call */
    },
    args: ['A', 'B'],
  },
  {
    func: async (c, d) => {
      /* some api call */
      /* some database save call */
    },
    args: ['C', 'D'],
  },
]

const options = {
  batchSize: 3,
  delayBetweenBatches: 1000, // in ms
}

batchPromisesWithDelay(promises, options)
```


## Options

| Property            | Description                           | Type               | Default Value |
|---------------------|---------------------------------------|--------------------|---------------|
| batchSize           | Size of the batch                     | number             | `1`           |
| delayBetweenBatches | Time delay between batches in ms      | number             | `1`           |
| retryFilters        | Filters to enable retry (see below)   | array of functions | `[]`          |
| greedyRetry         | Retry all promises, even if they fail | boolean            | `false`       |
| ignoreFailures      | Quietly ignore all promise failures   | boolean            | `false`       |
| onSuccess           | Lifecycle hook (see below)            | f(args, result)    | `() => {}`    |
| onFailure           | Lifecycle hook (see below)            | f(args, err)       | `null`        |
| onRetry             | Lifecycle hook (see below)            | f(args)            | `() => {}`    |
| onBatchStart        | Lifecycle hook (see below)            | f()                | `() => {}`    |
| onBatchEnd          | Lifecycle hook (see below)            | f()                | `() => {}`    |

## Retrying Promises

In certain circumstances, there will be a need to retry promises when they throw a fail condition. Such promises are thrown to the back of the queue to be retried.

The way we decide if a fail condition should be retried is by using an array of filters. As long as one filter in an array passes, the promise is retried.

```js
const retryFilters = [
  (err) => {
    err.message == 'retry me'
  },
  (err) => {
    err.statusCode == 418
  },
]
```

## Lifecycle hooks

These are functions that are called at certain points in the lifecycle of each batch or promise.

The following arguments are worth mention:
- `args` refers to the arguments that are passed as part of the "promises". The reason this is here is partly to give context to the result, and partly to identify which promises are failing by providing some data for logging.
- `result` is the result that is gotten from the promise that has been executed.
- `err` is the error object.
