// storage helper functions
// dependency: constants.js

/**
 * Load exception list from storage, then return via callback.
 * @param {function} callback Callback function in function(exceptionsString) { ... }. Return null if there's error or target key cannot be found.
 */
function loadExceptionsFromStorage(callback) {
  chrome.storage.sync.get(constants.storageKeys.kExceptionTwitterHandlesKey, function(items) {
    callback(chrome.runtime.lastError ? null : items[constants.storageKeys.kExceptionTwitterHandlesKey]);
  })
}

/** Load user's cached oauth token from storage, then return via callback.
 * @param {function} callback Callback function in function(token) { ... }. Return null if there's error or target key cannot be found.
 */
function loadCachedUserOAuthTokenFromStorage(callback) {
  chrome.storage.sync.get(constants.storageKeys.kUserOAuthToken, function(items) {
    callback(chrome.runtime.lastError ? null : items[constants.storageKeys.kUserOAuthToken]);
  });
}

/**
 * Load user's cached license object from storage, then return via callback.
 * @param {function} callback Callback function in function(licenseObject) { ... }. Return null if there's error or target key cannot be found.
 */
function loadUserLicenseObject(callback) {
  chrome.storage.sync.get(constants.storageKeys.kUserLicense, function(items) {
    callback(chrome.runtime.lastError ? null : items[constants.storageKeys.kUserLicense]);
  });
}

/**
 * Load user's verified license, then return via callback.
 * @param {function} callback Callback function in function(verified) { ... }. Return null if there's error or target key cannot be found.
 */
function loadUserVerifiedLicense(callback) {
  chrome.storage.sync.get(constants.storageKeys.kUserVerifiedLicense, function(items) {
    callback(chrome.runtime.lastError ? null : items[constants.storageKeys.kUserVerifiedLicense]);
  });
}

/**
 * Load user's purchased lifetime iAP status, then return via callback.
 * @param {function} callback Callback function in function(purchased) { ... }. Return null if there's error or target key cannot be found.
 */
function loadUserPurchasedLifetimeIAP(callback) {
  chrome.storage.sync.get(constants.storageKeys.kUserPurchasedLifetimeIAP, function(items) {
    callback(chrome.runtime.lastError ? null : items[constants.storageKeys.kUserPurchasedLifetimeIAP]);
  });
}

/**
 * Save data to storage.
 * @param {string} key Key of data
 * @param {any} Value Data to be saved to storage.
 * @param {function} failureCallback (optional) Callback when saving is failed. It's in function() {...}.
 * @param {function} completeCallback (optional) Callback when saving is successful. It's in function() {...}.
 */
function saveValueToStorage(key, value, failureCallback=null, completeCallback=null) {
  var items = {};
  items[key] = value;
  chrome.storage.sync.set(items, function() {
    if (chrome.runtime.lastError != null) {
      if (failureCallback) {
        failureCallback();
      }
    }
    else {
      if (completeCallback) {
        completeCallback();
      }
    }
  });
}