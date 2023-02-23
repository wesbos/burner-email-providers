async function sleep(milliseconds) {
  await new Promise((resolve, reject) => {
    setInterval(() => {
      resolve()
    }, milliseconds)
  })
}

async function executeSingleItem(retryFilters, callbacks, greedyRetry, { func, args }) {
  const { onSuccess, onFailure, onRetry, ignoreFailures } = callbacks;
  try {
    const result = await func(...args)
    await onSuccess(args, result)
    return {
      shouldRetry: false,
      value: result,
    }
  } catch (err) {
    var shouldRetry = false;
    for (i = 0; i < retryFilters.length; i++) {
      if (retryFilters[i](err)) {
        shouldRetry = true;
        break;
      }
    }
    if (greedyRetry || shouldRetry) {
      await onRetry(args)
      return {
        shouldRetry: true,
        value: { func, args },
      }
    } else {
      // handling failures is a special case. without this, code fails silently
      // without the user realising it.
      if (onFailure) {
        // user knows enough to add an onFailure handler
        await onFailure(args, err);
      } else if (ignoreFailures) {
        // user knows enough to specify that they wish to ignore failures
        // do nothing
      } else if (!ignoreFailures && !onFailure) {
        // user does not ignore failure, but also does not have a handler present
        // default safeguard condition
        console.error('One of your promises has failed. Normally this is handled by the onFailure error handler, but this is not defined in your code.')
        console.error('Either')
        console.error('(1) define an onFailure handler in options to handle all failures, or')
        console.error('(2) set ignoreFailures: true in options to skip errors (not recommended).')
        throw err;
      }
      return {
        shouldRetry: false,
        value: null,
      }
    }
  }
}

module.exports = async (queuedPromises, options) => {
  // put all promises into a queue,
  // execute N number at a time, every S seconds,
  // put failed ones into the back of the queue
  const {
    batchSize = 1,
    delayBetweenBatches = 1,
    retryFilters = [],
    greedyRetry = false,
    ignoreFailures = false,
    onSuccess = () => {},
    onFailure = null,
    onRetry = () => {},
    onBatchStart = () => {},
    onBatchEnd = () => {},
    // strategy = 'naive', // naive / indexed
  } = options || {};

  const callbacks = {
    onSuccess,
    onFailure,
    onRetry,
    onBatchStart,
    onBatchEnd,
    ignoreFailures,
  }

  while (queuedPromises.length) {
    await onBatchStart()
    const currBatch = queuedPromises.splice(0, batchSize);
    const results = await Promise.all(
      currBatch.map(
        executeSingleItem.bind(null, retryFilters, callbacks, greedyRetry)
      )
    )
    results.forEach(result => {
      if (result['shouldRetry'] == true) {
        queuedPromises.push(result['value'])
      }
    })
    await onBatchEnd()
    if (queuedPromises.length <= 0) {
      break;
    }
    await sleep(delayBetweenBatches)
  }
  return true;
}
