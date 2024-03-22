'use strict';

const _ = require('lodash');
const Promise = require('../../promise');

let transactionCache = null;
const CACHE_KEY = 'sequelize-sql-cache';
const STATS_KEY = 'sequelize-sql-cache-stats';

function enableQueryCache(TransactionCache) {
  transactionCache = TransactionCache;
  transactionCache.set(CACHE_KEY, new Map());
  transactionCache.set(STATS_KEY, { queryCount: 0, hitCount: 0 });
}

function queryCache(sql, query) {
  // If no cache, feature is disabled.
  // If not a SELECT query, don't attempt to cache
  if (!transactionCache || !sql.startsWith('SELECT')) {
    return new Promise((resolve, reject) => query((error, result) => error ? reject(error) : resolve(result)));
  }

  const sqlCache = transactionCache ? transactionCache.get(CACHE_KEY) : null;
  const stats = transactionCache ? transactionCache.get(STATS_KEY) : null;
  if (stats) stats.queryCount += 1;

  // If cache hit, resolve with value from the cache
  if (sqlCache && sqlCache.get(sql)) {
    // console.log('hit --> ', sql);
    if (stats) stats.hitCount += 1;

    // If promise-like, return the promise; otherwise wrap the cached object in a promise
    if (sqlCache.get(sql).then) {
      return sqlCache.get(sql);
    } else {
      return new Promise(resolve => resolve(sqlCache.get(sql)));
    }
  }

  // If cache miss...
  // 1. store the promise so we can share the promise for duplicate requests
  // 2. after promise resolves, replace the promise with a deep clone of the result
  const promise = new Promise((resolve, reject) =>
    query((error, result) => {
      if (error) {
        reject(error);
      } else {
        if (sqlCache) sqlCache.set(sql, _.cloneDeep(result));
        // console.log('miss --> ', sql);
        resolve(result);
      }
    })
  );

  if (sqlCache) sqlCache.set(sql, promise);

  return promise;
}

function getQueryCacheStatistics() {
  const stats = transactionCache ? transactionCache.get(STATS_KEY) : null;
  if (!stats) return;
  if (stats.queryCount === 0) return stats;
  return Object.assign({}, stats, {
    hitPercent: stats.hitCount / stats.queryCount * 100
  });
}

module.exports.enableQueryCache = enableQueryCache;
module.exports.getQueryCacheStatistics = getQueryCacheStatistics;
module.exports.queryCache = queryCache;
