const assert = require('assert');
const sinon = require('sinon');
const sandbox = sinon.createSandbox();

const batchPromisesWithRetry = require('./index.js');

describe('index.spec.js', function () {
  var successCount = 0;
  var failureCount = 0;
  var retryCount = 0;
  var batchStartCount = 0;
  var batchEndCount = 0;

  const successPromise = {
    func: (successValue) => {
      successCount++;
      return Promise.resolve(successValue); // this value is used by the onSuccess callback
    },
    args: ['successful value'],
  }

  const failurePromise = {
    func: (rejectedValue) => {
      failureCount++;
      return Promise.reject(new Error('some-error-message'));
    },
    args: ['rejected'],
  }

  const retryPromiseGenerator = (retryTimes) => {
    var toRetry = retryTimes;
    return {
      func: (successValue, retryValue) => {
        if (toRetry <= 0) {
          successCount++;
          return Promise.resolve(successValue)
        } else {
          toRetry --;
          retryCount++;
          return Promise.reject(new Error(retryValue));
        }
      },
      args: ['successful value', 'retry value'],
    }
  }

  const retryFilters = [
    (err) => err.message == 'retry value',
  ]

  beforeEach(() => {
    successCount = 0;
    failureCount = 0;
    retryCount = 0;
  })

  it('all promises succeed in execution', async () => {
    const promises = [
      successPromise,
      successPromise,
      successPromise,
    ];

    await batchPromisesWithRetry(promises)
    assert.equal(successCount, 3)
    assert.equal(retryCount,   0)
    assert.equal(failureCount, 0)
  })

  it('all promises fail in execution', async () => {
    const promises = [
      failurePromise,
      failurePromise,
      failurePromise,
    ];
    await batchPromisesWithRetry(promises, { ignoreFailures: true })
    assert.equal(successCount, 0)
    assert.equal(failureCount, 3)
    assert.equal(retryCount,   0)
  })

  it('all promises fail in execution without ignoreFailures set to true', async () => {
    const promises = [
      failurePromise,
      failurePromise,
      failurePromise,
    ];
    var hasError = false
    try {
      await batchPromisesWithRetry(promises)
    } catch (err) {

      console.log(err.message)

      if (err.message == 'some-error-message') {
        hasError = true
      }
    }
    assert.equal(hasError, true)
  })

  it('some promises retry', async () => {
    const promises = [
      successPromise,
      retryPromiseGenerator(4),
      retryPromiseGenerator(1),
    ]

    await batchPromisesWithRetry(promises, { retryFilters })
    assert.equal(successCount, 3)
    assert.equal(failureCount, 0)
    assert.equal(retryCount,   5)
  })

  it('mix of all scenarios', async () => {
    const promises = [
      retryPromiseGenerator(3),
      retryPromiseGenerator(5),
      failurePromise,
      successPromise,
      failurePromise,
    ]

    const retryFilters = [
      (err) => err.message == 'retry value',
    ]

    await batchPromisesWithRetry(promises, { retryFilters, ignoreFailures: true })
    assert.equal(successCount, 3)
    assert.equal(failureCount, 2)
    assert.equal(retryCount,   8)
  })

  it('test use of batchSize and delayBetweenBatches options', async () => {
    const promises = [
      successPromise,
      successPromise,
      successPromise,
    ];

    const options = {
      batchSize: 2,
      delayBetweenBatches: 10,
    }

    await batchPromisesWithRetry(promises, options)
    assert.equal(successCount, 3)
    assert.equal(retryCount,   0)
    assert.equal(failureCount, 0)
  })

  it('test onSuccess callbacks', async () => {
    const promises = [
      successPromise,
      successPromise,
      failurePromise,
    ];

    var onSuccessCount = 0;
    const onSuccess = async (args, result) => {
      onSuccessCount++;
      assert.equal(args[0], 'successful value')
      assert.equal(result, 'successful value')
      return true;
    }

    await batchPromisesWithRetry(promises, { onSuccess, ignoreFailures: true })
    assert.equal(successCount,   2)
    assert.equal(retryCount,     0)
    assert.equal(failureCount,   1)
    assert.equal(onSuccessCount, 2)
  })

  it('test onFailure callbacks', async () => {
    const promises = [
      successPromise,
      failurePromise,
      failurePromise,
    ];

    var onFailureCount = 0;
    const onFailure = async (args, err) => {
      onFailureCount++;
      assert.equal(args[0], 'rejected')
      assert.equal(err.message, 'some-error-message')
      return true;
    }

    await batchPromisesWithRetry(promises, { onFailure })
    assert.equal(successCount,   1)
    assert.equal(retryCount,     0)
    assert.equal(failureCount,   2)
    assert.equal(onFailureCount, 2)
  })

  it('test onRetry callbacks', async () => {
    const promises = [
      retryPromiseGenerator(1),
      retryPromiseGenerator(3),
      failurePromise,
    ];

    var onRetryCount = 0;
    const onRetry = async (args) => {
      onRetryCount++;
      assert.equal(args[0], 'successful value')
      return true;
    }

    await batchPromisesWithRetry(promises, { onRetry, retryFilters, ignoreFailures: true })
    assert.equal(successCount,   2)
    assert.equal(retryCount,     4)
    assert.equal(failureCount,   1)
    assert.equal(onRetryCount,   4)
  })

  it('test onBatchStart and onBatchEnd callbacks', async () => {
    const promises = [
      successPromise,
      successPromise,
      successPromise,
      retryPromiseGenerator(3),
      successPromise,
      successPromise,
    ];

    var onBatchStartCount = 0;
    const onBatchStart = async () => {
      onBatchStartCount++;
      return true;
    }

    var onBatchEndCount = 0;
    const onBatchEnd = async () => {
      onBatchEndCount++;
      return true;
    }

    const batchSize = 2

    await batchPromisesWithRetry(promises, { batchSize, retryFilters, onBatchStart, onBatchEnd })
    assert.equal(successCount,   6)
    assert.equal(retryCount,     3)
    assert.equal(failureCount,   0)
    assert.equal(onBatchStartCount, 6) // because the retry can only do one per batch if only one left
    assert.equal(onBatchEndCount, 6)
  })

  it('test useRetryFilters options', async () => {
    const promises = [
      retryPromiseGenerator(1),
      retryPromiseGenerator(3),
      successPromise,
    ];

    var onRetryCount = 0;
    const onRetry = async (args) => {
      onRetryCount++;
      assert.equal(args[0], 'successful value')
      return true;
    }

    await batchPromisesWithRetry(promises, { onRetry, greedyRetry: true, ignoreFailures: true })
    assert.equal(successCount,   3)
    assert.equal(retryCount,     4)
    assert.equal(failureCount,   0)
    assert.equal(onRetryCount,   4)
  })
})
