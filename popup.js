// dependency: constants.js, storage.js, api.js

var textArea = null;
var isRefreshPageWhenSave = true;
var isUserHasLifetimeIAP = false; // caching

/**
 * Send message to content scripts openning twitter-url tabs.
 * Yeah, we want all twitter tabs to take effective right when one tab 
 * Message will be sent in the form { key: <string>, message: <string> }
 * @param {string} key  Message key to send to content scripts
 * @param {string} message Message string to send.
 * @param {function} callback Callback when all things are done. It's in function() { ... }. Default is null.
 */
function sendMessageToAllContentScripts(key, message, callback=null) {
  // we will send message to all twitter tab
  // so each one can update their filtering behavior accordingly
  chrome.tabs.query({url: 'https://twitter.com/*'}, function(tabs) {
    for (var i=0; i<tabs.length; i++) {
      // form message object
      var msg = {};
      msg['key'] = key;
      msg['message'] = message;

      // send message to all twitter tabs
      chrome.tabs.sendMessage(tabs[i].id, msg);
    }

    if (callback) {
      callback();
    }
  });
}

/**
 * Send message to first found twitter tab.
 * @param {string} key  Message key to send to content scripts
 * @param {string} message Message string to send.
 * @param {function} callback Callback when all things are done. It's in function() { ... }. Default is null.
 */
function sendMessageToFirstFoundContentScripts(key, message, callback=null) {
  // we will send message to all twitter tab
  // so each one can update their filtering behavior accordingly
  chrome.tabs.query({url: 'https://twitter.com/*'}, function(tabs) {
    if (tabs.length > 0) {
      // just get the first tab
      var tab = tabs[0];

      // form message object
      var msg = {};
      msg['key'] = key;
      msg['message'] = message;

      // send message to all twitter tabs
      chrome.tabs.sendMessage(tab.id, msg);
    }
    else {
      log('cannot find any twitter tabs');
    }

    if (callback) {
      callback();
    }
  });
}

// save exception list of twitter handles as entered in textarea
function saveExceptions() {
  var strippedTextAreaValue = stripCommentLines(textArea.value);
  saveValueToStorage(constants.storageKeys.kExceptionTwitterHandlesKey, strippedTextAreaValue, function() {
    log('failed to save exceptions to storage');
  }, function() {
    log('successfully saved exceptions to storage');
    // now send message to notify all twitter tabs
    sendMessageToAllContentScripts(constants.messageKey.kExceptions, strippedTextAreaValue, function() {
      // refresh the page if such option is set
      if (isRefreshPageWhenSave) {
        chrome.tabs.executeScript(null, {code: 'window.location.reload();'});
      }
      window.close();
    });
  })
}

function stripCommentLines(message) {
  // only // and \r\n at the back
  var regex = /^\/\/[\s\S\w\W\d\D]*[\r\n]+/g;
  var strip =  message.replace(regex, '');
  return strip;
}

function showOnlyProcessingLabelUI() {
  document.getElementById('sub1').style.display = 'initial';
  document.getElementById('note-label').style.display = 'none';
  document.getElementById('sub2').style.display = 'none';
  document.getElementById('sub3').style.display = 'none';
  document.getElementById('sub4').style.display = 'none';
}

/**
 * Enable functioning UI (popup script).
 */
function enableFunctioningUI() {
  document.getElementById('sub1').style.display = 'none';
  document.getElementById('note-label').style.display = 'initial';
  document.getElementById('sub2').style.display = 'initial';
  var sub3 = document.getElementById('sub3');
  sub3.style.display = 'initial';
  //sub3.disabled = false;
  document.getElementById('sub4').style.display = 'none';
  //document.getElementById('textarea-exceptions').readOnly = 'false';
}

/**
 * Disable functioning UI (popup script).
 */
function disableFunctioningUI() {
  document.getElementById('sub1').style.display = 'none';
  document.getElementById('note-label').style.display = 'initial';
  document.getElementById('sub2').style.display = 'initial';
  var sub3 = document.getElementById('sub3');
  sub3.style.display = 'initial';
  //sub3.disabled = true;
  document.getElementById('sub4').style.display = 'initial';
  //document.getElementById('textarea-exceptions').readOnly = 'true';
}

/**
 * Verify that license object is not expired for trial period just yet.
 * @param {object} licenseObject License object
 * @returns Return true if license is valid and not expired yet, otherwise return false if it's expired.
 */
function verifyLicense(licenseObject) {
  if (licenseObject.result && licenseObject.accessLevel == "FULL") {
    log("Fully paid && properly licensed");

    saveValueToStorage(constants.storageKeys.kUserVerifiedLicense, true, null, function() {
      sendMessageToAllContentScripts(constants.messageKey.kNotifyUpdatedGetRidLimit, null);
    });

    return true;
  }
  else if(licenseObject.result && licenseObject.accessLevel == "FREE_TRIAL") {
    var daysAgoLicenseIssued = Date.now() - parseInt(licenseObject.createdTime, 10);
    daysAgoLicenseIssued = daysAgoLicenseIssued / 1000 / 60 / 60 / 24;
    var daysLeft = constants.trialSettings.kTrialPeriodDays - Math.floor(daysAgoLicenseIssued);
    if (daysLeft > 0) {
      // still within free trial period
      // now update UI for days-left
      var label = document.querySelector('#note-label > label');
      label.innerHTML = label.innerHTML + " [<a href='#' id='days-left-anchor'>" + daysLeft + " days left</a>]";
      // after we add make sure textarea still the one being focused
      // note: need to wait very short time
      setTimeout(function() {
        document.getElementById('days-left-anchor').blur();
        document.getElementById('textarea-exceptions').focus();
      }, 120);
      // add listener to it for user to be able to go to trial page for more information
      document.getElementById('days-left-anchor').addEventListener('click', function() {
        goToTrialPage();
      });
      log("Free trial, still within trial period: " + daysLeft + " days left");

      saveValueToStorage(constants.storageKeys.kUserVerifiedLicense, true, null, function() {
        sendMessageToAllContentScripts(constants.messageKey.kNotifyUpdatedGetRidLimit, null);
      });

      return true;
    } else {
      // trial period expired
      log("Free trial, trial period expired");
      
      saveValueToStorage(constants.storageKeys.kUserVerifiedLicense, false, null, function() {
        sendMessageToAllContentScripts(constants.messageKey.kNotifyUpdatedGetRidLimit, null);
      });

      return false;
    }
  }
  else {
    // no license issued
    // there might be about user didn't log in account or some sort (guess), but we just treat it as limited functionality here
    log("No license ever issued");
    saveValueToStorage(constants.storageKeys.kUserVerifiedLicense, false, null, function() {
      sendMessageToAllContentScripts(constants.messageKey.kNotifyUpdatedGetRidLimit, null);
    });
    return false;
  }
}

function requestLicenseFlow(token) {
  // check license object from storage first
  loadUserLicenseObject(function(licenseObject) {
    // no license object, then make a request
    if (licenseObject == null) {
      // make a request checking for license
      requestLicense(token,
        function() {
          log('failed to request for license');
        },
        function(licenseObject) {
          log('got license object:', licenseObject);

          // save license to storage
          saveValueToStorage(constants.storageKeys.kUserLicense, licenseObject,
            function() {
              log('failed to save license object to storage.');
            },
            function() {
              log('successfully saved license object to storage.');

              // check whether trial perid is expired
              if (!verifyLicense(licenseObject)) {
                // expired
                disableFunctioningUI();
              }
              else {
                // not expire
                enableFunctioningUI();
              }
            }
          );
        }
      );
    }
    // existing license object
    else {
      // check whether trial perid is expired
      if (!verifyLicense(licenseObject)) {
        // expired
        disableFunctioningUI();
      }
      else {
        // not expire
        enableFunctioningUI();
      }
    }
  });
}

/**
 * Get all active IAPs.
 * @param {function} failure (Optional) Callback function when it fails. It's in function() {...}.
 * @param {function} complete (Optional) Callback function when it succeeds. It's in function(responseObject) {...}.
 */
function getAllActiveIAPs(failure=null, complete=null) {
  google.payments.inapp.getSkuDetails({
    'parameters': {'env': 'prod'},
    'success': function(skus) {
      if (complete) complete(skus);
    },
    'failure': function() {
      if (failure) failure();
    }
  });
}

function sendMessageIntendToBuyIAP() {
  // send message to notify content script of the first twitter tab we found to initiaite the buying flow by executing API
  // if initiate here, buying popup will be closed immediately as popup script ends because its popup window automatically closed
  sendMessageToFirstFoundContentScripts(constants.messageKey.kIntendToBuyIAP, null, function() {
    log('sent message successfully');
  });
}

function goBackFromTrialPage() {
  document.getElementById('trial-page').style.display = 'none';
  document.getElementById('container').style.display = 'flex';
}

function goToTrialPage() {
  document.getElementById('container').style.display = 'none';
  document.getElementById('trial-page').style.display = 'flex';
}

function refreshPageWhenSaveToggle() {
  var button = document.getElementById('refresh-when-save-button');
  isRefreshPageWhenSave = button.checked;
  saveValueToStorage(constants.storageKeys.kUserRefreshPageWhenSave, button.checked);
}

/**
 * Begin verifying purhcased lifetime iAP flow.
 * @param {function} ifNotPurchasedCallback (optional) Callback if user didn't purchase lifetime iAP yet, then after finishes verifying iAP it will call this callback.
 */
function verifyPurchasedLifetimeIAPFlow(ifNotPurchasedCallback=null) {
  // try to read purchased iap status from storage to avoid making API call
  loadUserPurchasedLifetimeIAP(function(cached_purchased) {
    if (cached_purchased == null) {
      // (higher priority) check lifetime iap first
      // verify purchasing of lifetime iap
      verifyPurchasedLifetimeIAP(function(purchased) {
        log(purchased ? "user purchased lifetime iap" : "user not yet purchase lifetime iap");
        
        // save to storage
        saveValueToStorage(constants.storageKeys.kUserPurchasedLifetimeIAP, purchased, function() {
          log('failed to save lifetime iap status to storage.');
        }, function() {
          log('successfully saved lifetime iap status to storage');

          // notify to content scripts
          sendMessageToAllContentScripts(constants.messageKey.kNotifyUpdatedGetRidLimit, null, function() {
            log('notified to content scripts for updated purchased iAP flag');
          });
        });

        // if user didn't purchase yet, then follow-through with user's callback
        if (!purchased) {
          if (ifNotPurchasedCallback) ifNotPurchasedCallback();
        }
        else {
          // enable UI
          enableFunctioningUI();
          log('enabled ui');
        }
      });
    }
    // already in storage, then follow through use's callback
    else if (!cached_purchased) {
      if (ifNotPurchasedCallback) ifNotPurchasedCallback();
    }
    else if (cached_purchased) {
      // enable UI
      enableFunctioningUI();
      log('enabled ui');
    }
  });
}

function flow() {
  // load from storage for user's token to reduce API call to get token
  loadCachedUserOAuthTokenFromStorage(function(token) {
    // if found token saved in storage, then we could skip calling `getAuthToken()` function
    // and directly verfy license (trial period checking)
    if (token) {
      // begin verifying lifetime iap flow
      verifyPurchasedLifetimeIAPFlow(function() {
        // begin request license flow
        requestLicenseFlow(token);
      });
    }
    // then ask for permission from user
    else {
      askForUserOAuthTokenButMightTriggerAllowPermPopupIfFailed(function() {
        log('failed to get token both silently and explicityly');
      }, function(token) {
        log('got token!');

        // save token to storage
        saveValueToStorage(constants.storageKeys.kUserOAuthToken, token,
          function() {
            log('failed to save token to storage');
          },
          function() {
            log('successfully saved token to storage');
            // begin verifying lifetime iap flow
            verifyPurchasedLifetimeIAPFlow(function() {
              // begin request license flow
              requestLicenseFlow(token);
            });
          }
        );
      });
    }
  });
}

function preFlow() {
  textArea = document.getElementById('textarea-exceptions');

  // check if we have existing exception list
  loadExceptionsFromStorage(function(exsString) {
    if (exsString != null) {
      // set loaded value to text area
      textArea.value = exsString;
    }
    else {
      // set comment if there's nothing
      textArea.value = ""
    }
  });
  // load refresh-when-save status
  loadUserRefreshPageWhenSave(function(refresh) {
    if (refresh != null) {
      document.getElementById('refresh-when-save-button').checked = refresh;
      isRefreshPageWhenSave = refresh;
    }
    else {
      document.getElementById('refresh-when-save-button').checked = true;
      isRefreshPageWhenSave = true;
    }
  });

  // listen to save-button click to save exception to storage
  document.getElementById('save-button').addEventListener('click', saveExceptions, false);
  // listen to buy-lifetime click to buy iap
  document.getElementById('buy-lifetime').addEventListener('click', sendMessageIntendToBuyIAP, false);
  document.getElementById('buy-lifetime2').addEventListener('click', sendMessageIntendToBuyIAP, false);
  // listen to back button of trial-page
  document.getElementById('back-button').addEventListener('click', goBackFromTrialPage, false);
  // listn to refresh-when-save button
  document.getElementById('refresh-when-save-button').addEventListener('click', refreshPageWhenSaveToggle, false);

  // begin the flow
  flow();

  // fix: window popup resizes
  // see https://bugs.chromium.org/p/chromium/issues/detail?id=428044
  setTimeout(function() {
    document.getElementById('container').style.display = 'flex';
  }, 200);
}

// execute when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
  preFlow();
});