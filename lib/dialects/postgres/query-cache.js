const _ = require('lodash');
const Promise = require('../../promise');

let cache = null;

function enableQueryCache() {
	cache = new Map();
}

function disableQueryCache() {
	cache = null;
}

function queryCache(sql, query) {
	// If no cache, feature is disabled.
	// If not a SELECT query, don't attempt to cache
  if (!cache || !sql.startsWith('SELECT')) {
    return new Promise((resolve, reject) => query((error, result) => error ? reject(error) : resolve(result)));
  }

	// If cache hit, resolve with value from the cache
  if (cache[sql]) {
    return new Promise(resolve => resolve(cache[sql]));
  }

	// If cache miss, store a deep clone of the result before resolving the promise
	return new Promise((resolve, reject) =>
		query((error, result) => {
			if (error) {
				reject(error)
			} else {
				if (cache) cache[sql] = _.cloneDeep(result);
				resolve(result)
			}
		})
	);
}

module.exports.enableQueryCache = enableQueryCache;
module.exports.disableQueryCache = disableQueryCache;
module.exports.queryCache = queryCache;
