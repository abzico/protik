// functions related to making request to API
// dependency: constants.js, storage.js

/**
 * When we make a request towards API, there's a chance that token is expired thus this is an exact chance to remove such cached token. So we could renew token again.
 * @param {string} token Token to be removed
 * @param {function} callback Callback when it finishes removing such token. Callback is in function() {...}.
 */
function removeCachedOAuthToken(token, callback) {
  chrome.identity.removeCachedAuthToken({'token': token}, function() {
    if (callback) {
      callback();
    }
  });
}

/**
 * Try to request for user's oauth token. It might trigger allowing permission popup for user if it failed.
 * @param {function} failureCallback (optional) Callback when it failed. It's function() { ... }
 * @param {function} completeCallback (optional) Callback function when it succeeded. It's function(token) { ... }
 */
function askForUserOAuthTokenButMightTriggerAllowPermPopupIfFailed(failureCallback=null, completeCallback=null) {
  // try to get user's token silently
  // note: we allow grace period until user click on our icon button thus it will *actually* check for user's token
  // so as long as user doesn't click, he/she can continue using
  chrome.identity.getAuthToken({'interactive': false}, function(token) {
    // if fail to get, then we ask user to allow permission
    if (token == null || chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError);
      console.log('we need to explicitly ask for token');
      
      chrome.identity.getAuthToken({'interactive': true}, function(_token) {
        // if failed
        if (_token == null || chrome.runtime.lastError) {
          if (failureCallback) {
            failureCallback();
          }
        }
        else if (_token) {
          if (completeCallback) {
            completeCallback(_token);
          }
        }
        // all othe cases
        else {
          if (failureCallback) {
            failureCallback();
          }
        }
      });
    }
    // got token
    else if (token) {
      if (completeCallback) {
        completeCallback(token);
      }
    }
    // all other cases
    else {
      if (failureCallback) {
        failureCallback();
      }
    }
  });
}

/**
 * Make a request to license API.
 * @param {string} token User's token
 * @param {function} failureCallback (optional) Callback function from a request when failure happens. It's in function() {...}.
 * @param {function} completeCallback (optional) Callback function from a request when succeeded. It's in function(licenseObject) {...} in which licenseObject is license response from API.
 */
function requestLicense(token, failureCallback=null, completeCallback=null) {
  var req = new XMLHttpRequest();
  req.open('GET', 'https://www.googleapis.com/chromewebstore/v1.1/userlicenses/' + chrome.runtime.id);
  req.setRequestHeader('Authorization', 'Bearer ' + token);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      var license = JSON.parse(req.responseText);
      if (completeCallback) {
        completeCallback(license);
      }
    }
    // status may indicates token is expired
    else if (this.status == 401) {
      // remove cached token
      removeCachedOAuthToken(token, function() {
        // request a new token
        askForUserOAuthTokenButMightTriggerAllowPermPopupIfFailed(function() {
          console.log('failed to get a new token after previous one is invalid');
        }, function(new_token) {
          console.log('got a new token after previous one is invalid: ' + new_token);

          // save token to storage
          saveValueToStorage(constants.storageKeys.kUserOAuthToken, new_token,
            function() {
              console.log('failed to save token to storage');
            },
            function() {
              console.log('successfully saved token to storage');
            }
          );

          // request a license again with a new token we just got
          requestLicense(new_token, failureCallback, completeCallback);
        });
      });
    }
    // otherwise it's failure
    else {
      if (failureCallback) {
        failureCallback();
      }
    }
  }
  req.send();
}

/**
 * Buy lifetime IAP.
 * @param {function} failure (Optional) Callback function when it fails to buy. It's in function() {...}.
 * @param {function} success (Optional) Callback function when it succeeds to buy. It's in function(response) {...}.
 */
function buyLifetimeIAP(failure=null, success=null) {
  google.payments.inapp.buy({
    'parameters': {'env': 'prod'},
    'sku': constants.trialSettings.kLifetimeSKU,
    'success': function(response) {
      if (success) success(response);
    },
    'failure': function() {
      if (chrome.runtime.lastError) console.log(chrome.runtime.lastError);
      if (failure) failure();
    }
  });
}

/**
 * Verify that user has purchased lifetime IAP.
 * Note: It's only one IAP for lifetime usage of this chrome extension. So we could hard-coded this a little bit, no need to query for list of active IAPs. I know it's not that cleanest, but balance and compromise for fast turn around :)
 * @param {function} callback (Optional) Callback function returning verifying result of whether or not user has purchased lifetime IAP. If there's error or user hasn't purchased yet, it return false in callback, otherwise return true. Callback is in function(purchased) {...} in which 'purchased' is boolean.
 */
function verifyPurchasedLifetimeIAP(callback=null) {
  google.payments.inapp.getPurchases({
    'parameters': {'env': 'prod'},
    'success': function(response) {
      console.log(response);

      // if there's some purchase list to check
      if (response.response.details.length > 0) {
        var found = false;
        var list = response.response.details;
        // check its response
        for (var i=0; i<list.length; i++) {
          var item = list[i];
          if (item.sku == constants.trialSettings.kLifetimeSKU) {
            found = true;
            break;
          }
        }
           
        // returning result via callback
        if (callback) {
          callback(found);
        }
      }
      // no purchase
      else {
        if (callback) callback(false);
      }
    },
    'failure': function() {
      if (callback) callback(false);
    }
  });
}