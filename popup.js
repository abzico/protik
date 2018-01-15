var textArea = null;
var exceptionList = [];
var kTrialPeriodDays = 15;
var kTextAreaInitialValue = "// Enter twitteruser1, twitteruser2. Case-insensitive.\r\n";
var kExceptionTwitterHandlesKey = 'exception-twitter-handles';
var kUserOAuthToken = 'userOAuthToken';

/**
 * Load exception list from storage, then return via callback.
 * @param {function} callback Callback function in function(exceptionsString) { ... }. Return null if there's error or target key cannot be found.
 */
function loadExceptionsFromStorage(callback) {
  chrome.storage.sync.get(kExceptionTwitterHandlesKey, function(items) {
    callback(chrome.runtime.lastError ? null : items[kExceptionTwitterHandlesKey]);
  })
}

/** Load user's cached oauth token from storage, then return via callback.
 * @param {function} callback Callback function in function(token) { ... }. Return null if there's error or target key cannot be found.
 */
function loadCachedUserOAuthTokenFromStorage(callback) {
  chrome.storage.sync.get(kUserOAuthToken, function(items) {
    callback(chrome.runtime.lastError ? null : items[kUserOAuthToken]);
  });
}

/**
 * Send message to content scripts openning twitter-url tabs.
 * Yeah, we want all twitter tabs to take effective right when one tab 
 * @param {string} key  Message key to send to content scripts
 * @param {string} message Message to send to content scripts
 * @param {function} callback Callback when all things are done. It's in function() { ... }. Default is null.
 */
function sendMessageToAllContentScripts(key, message, callback=null) {
  // we will send message to all twitter tab
  // so each one can update their filtering behavior accordingly
  chrome.tabs.query({url: 'https://twitter.com/*'}, function(tabs) {
    for (var i=0; i<tabs.length; i++) {
      var msg = {};
      msg[key] = message;
      chrome.tabs.sendMessage(tabs[i].id, msg, function(response) {
        if (response != null) {
          console.log(response.ack);
        }
      });
    }

    if (callback) {
      callback();
    }
  });
}

// save exception list of twitter handles as entered in textarea
function saveExceptions() {
  saveValueToStorage(kExceptionTwitterHandlesKey, stripCommentLines(textArea.value), function() {
    console.log('failed to save exceptions to storage');
  }, function() {
    console.log('successfully saved exceptions to storage');
    // now send message to notify all twitter tabs
    sendMessageToAllContentScripts(kExceptionTwitterHandlesKey, textArea.value, function() {
      window.close();
    });
  })
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

function stripCommentLines(message) {
  // only // and \r\n at the back
  var regex = /^\/\/[\s\S\w\W\d\D]*[\r\n]+/g;
  var strip =  message.replace(regex, '');
  console.log('strip:' + strip);
  return strip;
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
            completeCallback();
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

function enableFunctioningUI() {
  document.getElementById('sub1').style.display = 'none';
  document.getElementById('sub2').style.display = 'inherit';
  document.getElementById('sub3').style.display = 'inherit';
}

// things starts here
// execute when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  textArea = document.getElementById('textarea-exceptions');

  // check if we have existing exception list
  loadExceptionsFromStorage(function(exsString) {
    if (exsString != null) {
      // set loaded value to text area
      textArea.value = kTextAreaInitialValue + exsString;
    }
  });

  // listen to save-button click to save exception to storage
  document.getElementById('save-button').addEventListener('click', saveExceptions, false);
});

// load from storage for user's token to reduce API call to get token
loadCachedUserOAuthTokenFromStorage(function(token) {
  // if found token saved in storage, then we could skip calling `getAuthToken()` function
  // and directly verfy license (trial period checking)
  if (token) {
    // load exceptions into textarea
    enableFunctioningUI();
  }
  // then ask for permission from user
  else {
    askForUserOAuthTokenButMightTriggerAllowPermPopupIfFailed(function() {
      console.log('failed to get token both silently and explicityly');
    }, function(token) {
      console.log('got token!');

      // save token to storage
      saveValueToStorage(kUserOAuthToken, token,
        function() {
          console.log('failed to save token to storage');
        },
        function() {
          console.log('successfully saved token to storage');
        }
      );

      enableFunctioningUI();
    });
  }
});